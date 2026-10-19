// Finding the near-duplicates in a corpus is the check that decides whether a
// pool of tens of thousands is that many decisions or one template wearing
// tens of thousands of hats. Comparing every pair answers it exactly and costs
// O(n²): measured on this repo's own scenarios, 2,000 took nine seconds and
// 10,000 projects past four minutes — per publish, and it still only ever
// compared a batch against itself, so duplicates across batches went unseen.
//
// This is the standard answer: MinHash signatures reduce each scenario's
// shingle set to a fixed-width sketch whose collision rate estimates Jaccard
// similarity, and LSH banding buckets those sketches so only genuinely similar
// pairs are ever compared exactly. Cost becomes linear in the corpus and
// proportional to real candidates. The index is additive, so a new batch is
// checked against everything already shipped without re-reading it.
const MERSENNE_PRIME = 2147483647; // 2^31 - 1, the modulus MinHash is usually taken over.
// 64 rows in 16 bands of 4. Width is a storage decision as much as an accuracy
// one — every scenario's sketch is persisted, so 128 rows cost about eighty
// megabytes at fifty thousand scenarios and 64 rows about half that, for an
// estimator still comfortably tight at a 0.35 threshold.
const DEFAULTS = { hashes: 64, bands: 16, threshold: 0.35 };
/** Sketches persist as compact base-36 rather than a JSON array of decimal integers, which is most of their size on disk. */
export function encodeSignature(signature) {
    return signature.map((value) => value.toString(36)).join(".");
}
export function decodeSignature(encoded) {
    return encoded.split(".").map((part) => Number.parseInt(part, 36));
}
/** Deterministic 32-bit string hash (FNV-1a), so an index built twice is the same index. */
function fnv1a(text) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i += 1) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash >>> 0;
}
/** The seeded (a, b) coefficient pairs of the permutation family MinHash draws from. */
function coefficients(count) {
    const pairs = [];
    for (let i = 0; i < count; i += 1) {
        pairs.push([(fnv1a(`a:${i}`) % (MERSENNE_PRIME - 1)) + 1, fnv1a(`b:${i}`) % MERSENNE_PRIME]);
    }
    return pairs;
}
export function minhashSignature(shingles, hashes = DEFAULTS.hashes) {
    const coeffs = coefficients(hashes);
    const signature = new Array(hashes).fill(MERSENNE_PRIME);
    for (const shingle of shingles) {
        const base = fnv1a(shingle);
        for (let i = 0; i < hashes; i += 1) {
            const [a, b] = coeffs[i];
            const value = (Math.imul(a, base) + b) % MERSENNE_PRIME;
            if (value < signature[i])
                signature[i] = value;
        }
    }
    return signature;
}
/** Exact Jaccard, used only on the candidate pairs banding has already narrowed to. */
export function jaccard(left, right) {
    if (left.size === 0 && right.size === 0)
        return 0;
    let shared = 0;
    const [small, large] = left.size <= right.size ? [left, right] : [right, left];
    for (const item of small)
        if (large.has(item))
            shared += 1;
    return shared / (left.size + right.size - shared);
}
/** Jaccard as estimated by how often two sketches agree. */
function signatureSimilarity(left, right) {
    const width = Math.min(left.length, right.length);
    if (width === 0)
        return 0;
    let agree = 0;
    for (let i = 0; i < width; i += 1)
        if (left[i] === right[i])
            agree += 1;
    return agree / width;
}
/**
 * An additive near-duplicate index. Add the corpus already shipped, then ask a
 * new batch what it collides with — no pass over the corpus is needed to
 * answer, only over the buckets the batch actually lands in.
 */
export class NearDuplicateIndex {
    options;
    rowsPerBand;
    buckets = new Map();
    entries = new Map();
    shingles = new Map();
    constructor(options = {}) {
        this.options = { ...DEFAULTS, ...options };
        if (this.options.hashes % this.options.bands !== 0) {
            throw new Error(`hashes (${this.options.hashes}) must divide evenly into bands (${this.options.bands})`);
        }
        this.rowsPerBand = this.options.hashes / this.options.bands;
    }
    get size() {
        return this.entries.size;
    }
    bandKeys(entry) {
        const keys = [];
        for (let band = 0; band < this.options.bands; band += 1) {
            const start = band * this.rowsPerBand;
            const rows = entry.signature.slice(start, start + this.rowsPerBand).join(",");
            keys.push(`${entry.bucket}|${band}|${rows}`);
        }
        return keys;
    }
    add(id, bucket, shingles) {
        this.addSignature(id, bucket, minhashSignature(shingles, this.options.hashes));
        this.shingles.set(id, shingles);
    }
    /**
     * Index a scenario by a signature computed earlier. This is what makes the
     * index persistable: a corpus of any size is stored as one sketch per
     * scenario, and reloading it costs no access to the bodies at all.
     */
    addSignature(id, bucket, signature) {
        const entry = { id, bucket, signature };
        this.entries.set(id, entry);
        for (const key of this.bandKeys(entry)) {
            const bucketed = this.buckets.get(key);
            if (bucketed)
                bucketed.push(id);
            else
                this.buckets.set(key, [id]);
        }
    }
    signature(shingles) {
        return minhashSignature(shingles, this.options.hashes);
    }
    entriesForPersist() {
        return [...this.entries.values()];
    }
    /**
     * The ids banding says are worth an exact comparison, without performing
     * one. A caller holding the bodies elsewhere (a shard store) uses this to
     * fetch only the handful of candidates and verify those.
     */
    candidates(id, bucket, shingles) {
        const probe = { id, bucket, signature: minhashSignature(shingles, this.options.hashes) };
        const found = new Set();
        for (const key of this.bandKeys(probe)) {
            for (const candidate of this.buckets.get(key) ?? [])
                if (candidate !== id)
                    found.add(candidate);
        }
        return [...found].sort();
    }
    /**
     * What this scenario is a near-duplicate of, among everything indexed.
     * Banding proposes the candidates; exact Jaccard decides, so a reported
     * match is a real one — only the search was approximate, never the verdict.
     */
    matches(id, bucket, shingles) {
        const probe = { id, bucket, signature: minhashSignature(shingles, this.options.hashes) };
        const candidates = new Set();
        for (const key of this.bandKeys(probe)) {
            for (const candidate of this.buckets.get(key) ?? [])
                if (candidate !== id)
                    candidates.add(candidate);
        }
        const found = [];
        for (const candidate of candidates) {
            const other = this.shingles.get(candidate);
            const entry = this.entries.get(candidate);
            // Exact when the other side's fingerprint is resident, estimated from
            // sketches when it is not. Skipping the candidate in the second case is
            // what a persisted index would silently do instead, which would make a
            // reloaded corpus find nothing at all.
            const similarity = other
                ? jaccard(shingles, other)
                : entry
                    ? signatureSimilarity(probe.signature, entry.signature)
                    : undefined;
            if (similarity !== undefined && similarity >= this.options.threshold) {
                found.push({ id, otherId: candidate, similarity, estimated: other === undefined });
            }
        }
        return found.sort((a, b) => b.similarity - a.similarity || a.otherId.localeCompare(b.otherId));
    }
}
