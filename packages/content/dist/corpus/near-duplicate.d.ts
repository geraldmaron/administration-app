export type NearDuplicateOptions = {
    /** Signature width. More rows is a tighter estimate for more memory. */
    readonly hashes?: number;
    /** LSH bands. Fewer, wider bands find only very similar pairs; more, narrower bands widen the net. */
    readonly bands?: number;
    /** Jaccard similarity at or above which a pair is reported. */
    readonly threshold?: number;
};
/** Sketches persist as compact base-36 rather than a JSON array of decimal integers, which is most of their size on disk. */
export declare function encodeSignature(signature: readonly number[]): string;
export declare function decodeSignature(encoded: string): readonly number[];
export declare function minhashSignature(shingles: ReadonlySet<string>, hashes?: number): readonly number[];
/** Exact Jaccard, used only on the candidate pairs banding has already narrowed to. */
export declare function jaccard(left: ReadonlySet<string>, right: ReadonlySet<string>): number;
export type NearDuplicateEntry = {
    readonly id: string;
    /** Only scenarios in the same bucket are ever compared — scenario class, here. */
    readonly bucket: string;
    readonly signature: readonly number[];
};
export type NearDuplicateMatch = {
    readonly id: string;
    readonly otherId: string;
    readonly similarity: number;
    /**
     * True when similarity came from comparing sketches rather than the shingle
     * sets themselves — the case for a corpus reloaded from disk, where keeping
     * every scenario's full fingerprint resident is exactly the cost this index
     * exists to avoid. Signature agreement is an unbiased estimator of Jaccard,
     * so the number is honest; it is just not exact.
     */
    readonly estimated: boolean;
};
/**
 * An additive near-duplicate index. Add the corpus already shipped, then ask a
 * new batch what it collides with — no pass over the corpus is needed to
 * answer, only over the buckets the batch actually lands in.
 */
export declare class NearDuplicateIndex {
    private readonly options;
    private readonly rowsPerBand;
    private readonly buckets;
    private readonly entries;
    private readonly shingles;
    constructor(options?: NearDuplicateOptions);
    get size(): number;
    private bandKeys;
    add(id: string, bucket: string, shingles: ReadonlySet<string>): void;
    /**
     * Index a scenario by a signature computed earlier. This is what makes the
     * index persistable: a corpus of any size is stored as one sketch per
     * scenario, and reloading it costs no access to the bodies at all.
     */
    addSignature(id: string, bucket: string, signature: readonly number[]): void;
    signature(shingles: ReadonlySet<string>): readonly number[];
    entriesForPersist(): readonly NearDuplicateEntry[];
    /**
     * The ids banding says are worth an exact comparison, without performing
     * one. A caller holding the bodies elsewhere (a shard store) uses this to
     * fetch only the handful of candidates and verify those.
     */
    candidates(id: string, bucket: string, shingles: ReadonlySet<string>): readonly string[];
    /**
     * What this scenario is a near-duplicate of, among everything indexed.
     * Banding proposes the candidates; exact Jaccard decides, so a reported
     * match is a real one — only the search was approximate, never the verdict.
     */
    matches(id: string, bucket: string, shingles: ReadonlySet<string>): readonly NearDuplicateMatch[];
}
