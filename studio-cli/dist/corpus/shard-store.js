import { appendFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { CORE_SCENARIOS, decodeSignature, encodeSignature, NearDuplicateIndex, phraseCarrierIndex, ScenarioDef, ScenarioSelector, scenarioShingles, selectorOf, } from "@admin/content";
// The corpus on disk, in the pieces a five-figure pool needs it split
// into. Bodies live in append-only JSONL shards, because a corpus that is one
// document has to be rewritten in full to add one scenario and read in full to
// serve one. The selector index and the overlap sketches sit beside them, and
// both are small enough to hold entirely in memory at any corpus size this
// game will reach — which is what lets a draw and a duplicate check answer
// without touching a shard at all.
//
// Layout, under <root>:
//   shards/<class>-<nnn>.jsonl   bodies, one ScenarioDef per line
//   index.jsonl                  one ScenarioSelector per line, carrying its shard
//   overlap.jsonl                one MinHash sketch per scenario
//   flags.jsonl                  the flags each document stamps
//
// The flag sidecar exists because the selector deliberately does not carry a
// reply's "sets", and the flag vocabulary is asked for on every run: without it
// the only way to know what a corpus writes is to read every body, which is the
// one thing this layout is built to avoid.
const SHARD_LIMIT = 500;
export const CorpusStats = z.object({ scenarios: z.number(), shards: z.number() });
const OverlapEntry = z.object({
    id: z.string().min(1),
    bucket: z.string().min(1),
    /** Base-36 packed MinHash sketch — see encodeSignature. */
    sig: z.string().min(1),
});
/**
 * The layout under any root. Both corpora — scenarios and consequences — are
 * the same three files beside a shard directory, so the store is parameterized
 * by root rather than forked per content type.
 */
export function corpusPathsFor(root) {
    return {
        root,
        shardsDir: path.join(root, "shards"),
        indexPath: path.join(root, "index.jsonl"),
        overlapPath: path.join(root, "overlap.jsonl"),
        flagsPath: path.join(root, "flags.jsonl"),
        phrasesPath: path.join(root, "phrases.jsonl"),
    };
}
// The phrase index is rewritten whole rather than appended to, unlike its three
// neighbors. A carrier count is a property of the pool, not of the scenario
// that happens to arrive last: publishing one scenario can take a run from one
// carrier to two, which no per-scenario line can express.
const PhraseEntry = z.object({
    run: z.string().min(1),
    carriers: z.number().int().min(2),
});
/**
 * Runs the shipped corpus already carries, for `stock-phrasing`.
 *
 * Built on first use from the bodies when the sidecar is absent, the way
 * `scenarioFlagEntries` backfills the read half of the flag index. A corpus
 * published without the sidecar would otherwise gate as if it carried no
 * phrasing at all — silently permissive, which is the worst way for a gate to
 * fail. The expensive read the sidecar exists to avoid is paid once per
 * corpus, not once per run.
 */
export async function readPhraseCarriers(paths) {
    if (existsSync(paths.phrasesPath)) {
        return (await readJsonl(paths.phrasesPath, PhraseEntry)).map((entry) => [entry.run, entry.carriers]);
    }
    const bodies = await readCorpusBodies(paths);
    if (bodies.length === 0)
        return [];
    await writePhraseCarriers(paths, bodies);
    return [...phraseCarrierIndex(bodies)];
}
/** Rebuild the phrase index from bodies already in hand. */
export async function writePhraseCarriers(paths, bodies) {
    const index = phraseCarrierIndex(bodies);
    const lines = [...index]
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([run, carriers]) => `${JSON.stringify({ run, carriers })}\n`)
        .join("");
    await mkdir(paths.root, { recursive: true });
    await writeFile(paths.phrasesPath, lines, "utf8");
    return index.size;
}
// `reads` is optional because a corpus published before the field existed has
// entries without it; `readFlagEntries` backfills the whole file from the
// bodies the first time it notices, so the optionality is a migration state
// rather than a permanent maybe.
export const FlagEntry = z.object({
    id: z.string().min(1),
    sets: z.array(z.string().min(1)),
    reads: z.array(z.string().min(1)).optional(),
});
export async function readFlagEntries(paths) {
    return readJsonl(paths.flagsPath, FlagEntry);
}
/**
 * The scenario corpus's flag entries, with the read side guaranteed present.
 * An older sidecar knows what each scenario stamps but not what it waits on;
 * this rebuilds the file once from the bodies — the expensive read the sidecar
 * exists to avoid, paid a single time per corpus rather than per run. Scenario
 * corpora only: the consequence store shares `readFlagEntries` (its sidecar
 * has the same shape) but its bodies parse under a different schema.
 */
async function scenarioFlagEntries(paths) {
    const entries = await readFlagEntries(paths);
    if (entries.length === 0 || entries.every((entry) => entry.reads !== undefined))
        return entries;
    const bodies = await readCorpusBodies(paths);
    const rebuilt = bodies.map((def) => ({ id: def.id, sets: scenarioSets(def), reads: scenarioReads(def) }));
    await writeFile(paths.flagsPath, rebuilt.map((entry) => `${JSON.stringify(entry)}\n`).join(""), "utf8");
    return rebuilt;
}
async function readJsonl(filePath, schema) {
    if (!existsSync(filePath))
        return [];
    const raw = await readFile(filePath, "utf8");
    const out = [];
    for (const line of raw.split("\n")) {
        if (!line.trim())
            continue;
        out.push(schema.parse(JSON.parse(line)));
    }
    return out;
}
export async function readCorpusIndex(paths) {
    return readJsonl(paths.indexPath, ScenarioSelector);
}
/** The overlap index for the whole corpus, rebuilt from sketches — no body is read. */
export async function readOverlapIndex(paths) {
    const index = new NearDuplicateIndex();
    for (const entry of await readJsonl(paths.overlapPath, OverlapEntry)) {
        index.addSignature(entry.id, entry.bucket, decodeSignature(entry.sig));
    }
    return index;
}
/** Everything the audit needs to judge a batch against the corpus it is landing in. */
export async function corpusContext(paths) {
    const [selectors, overlapIndex, flagEntries, phraseCarriers, families] = await Promise.all([
        readCorpusIndex(paths),
        readOverlapIndex(paths),
        existsSync(paths.flagsPath) ? scenarioFlagEntries(paths) : Promise.resolve([]),
        readPhraseCarriers(paths),
        shardFamilies(paths),
    ]);
    return {
        installedIds: selectors.map((selector) => selector.id),
        overlapIndex,
        readFlags: flagEntries.flatMap((entry) => entry.reads ?? []),
        phraseCarriers,
        familyOpeners: familiesWith(families, "opener"),
        familyCloses: familiesWith(families, "close"),
    };
}
function familiesWith(marks, role) {
    return marks.flatMap((mark) => (mark.family?.role === role ? [mark.family.id] : []));
}
/**
 * Which families the shards open and close, read off the bodies rather than
 * the index. The index is written at publish and an arc declared since is not
 * in it; and the membership is read without the full schema, because a body
 * that fails a newer rule elsewhere is still the close of its family.
 */
async function shardFamilies(paths) {
    // The bundled core pack ships beside every shard and opens arcs whose later
    // members live in the shards, so its families are part of the index too.
    const pack = CORE_SCENARIOS;
    if (!existsSync(paths.shardsDir))
        return pack;
    const files = (await readdir(paths.shardsDir)).filter((name) => name.endsWith(".jsonl"));
    const bodies = await Promise.all(files.map((file) => readFile(path.join(paths.shardsDir, file), "utf8")));
    return [
        ...pack,
        ...bodies.flatMap((body) => body
            .split("\n")
            .filter((line) => line.includes('"family"'))
            .map((line) => JSON.parse(line))),
    ];
}
/** Which shard a new scenario of this class belongs in: the newest one with room. */
async function shardFor(paths, scenarioClass) {
    await mkdir(paths.shardsDir, { recursive: true });
    const existing = (await readdir(paths.shardsDir))
        .filter((name) => name.startsWith(`${scenarioClass}-`) && name.endsWith(".jsonl"))
        .sort();
    const newest = existing[existing.length - 1];
    if (newest) {
        const lines = (await readFile(path.join(paths.shardsDir, newest), "utf8")).split("\n").filter((l) => l.trim()).length;
        if (lines < SHARD_LIMIT)
            return newest;
        const nextIndex = Number(newest.slice(scenarioClass.length + 1, -".jsonl".length)) + 1;
        return `${scenarioClass}-${String(nextIndex).padStart(3, "0")}.jsonl`;
    }
    return `${scenarioClass}-000.jsonl`;
}
/**
 * Append scenarios to the corpus, updating the index and the overlap sketches
 * in the same pass. Ids already present are skipped rather than duplicated, so
 * re-publishing a batch is safe.
 */
export async function publishToCorpus(paths, defs) {
    await mkdir(paths.root, { recursive: true });
    const existing = new Set((await readCorpusIndex(paths)).map((selector) => selector.id));
    const index = new NearDuplicateIndex();
    const added = [];
    const skipped = [];
    for (const def of defs) {
        if (existing.has(def.id)) {
            skipped.push(def.id);
            continue;
        }
        const shard = await shardFor(paths, def.class);
        await appendFile(path.join(paths.shardsDir, shard), `${JSON.stringify(def)}\n`, "utf8");
        await appendFile(paths.indexPath, `${JSON.stringify(selectorOf(def, shard))}\n`, "utf8");
        await appendFile(paths.overlapPath, `${JSON.stringify({ id: def.id, bucket: def.class, sig: encodeSignature(index.signature(scenarioShingles(def))) })}\n`, "utf8");
        await appendFile(paths.flagsPath, `${JSON.stringify({ id: def.id, sets: scenarioSets(def), reads: scenarioReads(def) })}\n`, "utf8");
        existing.add(def.id);
        added.push(def.id);
    }
    // Rebuilt from the whole pool rather than extended, for the reason given at
    // PhraseEntry, and only when something was actually added.
    if (added.length > 0)
        await writePhraseCarriers(paths, await readCorpusBodies(paths));
    return { added, skipped, stats: await corpusStats(paths) };
}
/**
 * The same read as `readCorpusBodies`, except that a body which no longer
 * parses is reported rather than thrown on.
 *
 * A shipped corpus can stop parsing without anybody touching it: a ceiling
 * tightened after the fact makes bodies that were valid when they were written
 * invalid now. The strict read is right for the audit, which must not reason
 * about a pool it cannot fully see. It is wrong for a maintenance pass, where
 * throwing means nine stale labels block work on the other 294 — and where the
 * only silent fix available is to rewrite shipped prose, which is exactly what
 * an in-place upgrade exists to forbid. So they are named and skipped.
 */
export async function readCorpusBodiesReporting(paths) {
    if (!existsSync(paths.shardsDir))
        return { bodies: [], unparseable: [] };
    const bodies = [];
    const unparseable = [];
    for (const name of (await readdir(paths.shardsDir)).filter((file) => file.endsWith(".jsonl")).sort()) {
        for (const line of (await readFile(path.join(paths.shardsDir, name), "utf8")).split("\n")) {
            if (!line.trim())
                continue;
            const raw = JSON.parse(line);
            const parsed = ScenarioDef.safeParse(raw);
            if (parsed.success)
                bodies.push(parsed.data);
            else {
                const issue = parsed.error.issues[0];
                unparseable.push({ id: raw.id ?? "(no id)", reason: issue ? `${issue.path.join(".")}: ${issue.message}` : "unknown" });
            }
        }
    }
    return { bodies, unparseable };
}
/**
 * Replace scenarios already in the corpus with revised bodies, in place.
 *
 * The shards are append-only for everything else, and deliberately so — a
 * corpus that is rewritten to add one scenario is a corpus that cannot be
 * appended to concurrently. This is the one operation that has to rewrite,
 * because an upgrade pass produces a better version of a scenario that is
 * already there, and appending it would leave the corpus holding both.
 *
 * A revision keeps its id and its class (the upgrade gate refuses one that
 * does not), so the selector index and the shard assignment are unchanged and
 * the flag sidecar is rewritten rather than recomputed for placement. The
 * overlap sketches and phrase carriers *are* recomputed, because they are
 * derived from prose and the whole point of the pass is that there is new
 * prose. An id the corpus does not hold is reported rather than appended: this
 * function revises, and a caller that meant to add should have published.
 */
/** The two fields a revision needs off a shard line: which scenario it is, and which shard it belongs in. */
const ShardLine = z.object({ id: z.string(), class: z.string() });
export async function reviseInCorpus(paths, defs) {
    const byId = new Map(defs.map((def) => [def.id, def]));
    const revised = [];
    const missing = new Set(byId.keys());
    for (const name of (await readdir(paths.shardsDir)).filter((file) => file.endsWith(".jsonl")).sort()) {
        const shardPath = path.join(paths.shardsDir, name);
        const lines = (await readFile(shardPath, "utf8")).split("\n").filter((line) => line.trim());
        let touched = false;
        const next = lines.map((line) => {
            // Only what decides placement is read off the existing line, and it is
            // read without the full schema on purpose: a body shipped under an older
            // schema may not satisfy the current one, and requiring every neighbor in
            // a shard to satisfy it would let an unrelated scenario's stale field
            // block the revision of a scenario beside it. A line that is not being
            // replaced is passed through byte for byte.
            const def = ShardLine.parse(JSON.parse(line));
            const replacement = byId.get(def.id);
            if (!replacement)
                return line;
            // A revision that changed class would belong in another shard, and
            // rewriting it here would leave the index pointing at the old one.
            if (replacement.class !== def.class)
                throw new Error(`${def.id}: a revision may not change class (${def.class} → ${replacement.class})`);
            touched = true;
            missing.delete(def.id);
            revised.push(def.id);
            return JSON.stringify(replacement);
        });
        if (touched)
            await writeFile(shardPath, `${next.join("\n")}\n`, "utf8");
    }
    if (revised.length > 0) {
        // The derived indexes are rebuilt over the bodies that parse, the same set
        // every other corpus reader works from. A body the current schema rejects
        // is left out of the sketches rather than taking the rebuild down with it.
        const { bodies } = await readCorpusBodiesReporting(paths);
        await writePhraseCarriers(paths, bodies);
        await writeFile(paths.flagsPath, bodies.map((def) => `${JSON.stringify({ id: def.id, sets: scenarioSets(def), reads: scenarioReads(def) })}\n`).join(""), "utf8");
        const index = new NearDuplicateIndex();
        await writeFile(paths.overlapPath, bodies
            .map((def) => `${JSON.stringify({ id: def.id, bucket: def.class, sig: encodeSignature(index.signature(scenarioShingles(def))) })}\n`)
            .join(""), "utf8");
    }
    return { revised, missing: [...missing] };
}
const scenarioSets = (def) => def.replies.flatMap((reply) => reply.sets ?? []);
// Only positive waits: `is: false` reads the flag's absence, which keeps no
// promise — a review's reader is a scenario that fires because the review
// happened, not one that fires while it never did.
const scenarioReads = (def) => def.conditions.flatMap((condition) => (condition.kind === "flag" && condition.is ? [condition.flag] : []));
/**
 * Every scenario body the corpus holds, read from the shards — the expensive
 * read. Exported for the corpus-wide audit pass: a cross-batch rule like
 * flag-condition-never-set can only see what the whole pool actually writes,
 * which means reading every body rather than the selector index.
 */
export async function readCorpusBodies(paths) {
    if (!existsSync(paths.shardsDir))
        return [];
    const defs = [];
    for (const name of (await readdir(paths.shardsDir)).filter((file) => file.endsWith(".jsonl")).sort()) {
        for (const line of (await readFile(path.join(paths.shardsDir, name), "utf8")).split("\n")) {
            if (line.trim())
                defs.push(ScenarioDef.parse(JSON.parse(line)));
        }
    }
    return defs;
}
/**
 * Every flag this corpus's replies stamp — the half of the flag vocabulary the
 * consequence gate has to be told about, or a card gating on something a
 * shipped scenario writes is refused for a chain that closes perfectly well.
 *
 * A corpus published before the sidecar existed has none, so it is rebuilt from
 * the bodies once and written back. That read is the thing this file exists to
 * avoid, which is exactly why it happens at most once per corpus.
 */
export async function corpusFlags(paths) {
    if (existsSync(paths.flagsPath))
        return (await readFlagEntries(paths)).flatMap((entry) => entry.sets);
    const bodies = await readCorpusBodies(paths);
    if (bodies.length === 0)
        return [];
    await mkdir(paths.root, { recursive: true });
    await writeFile(paths.flagsPath, bodies.map((def) => `${JSON.stringify({ id: def.id, sets: scenarioSets(def) })}\n`).join(""), "utf8");
    return bodies.flatMap(scenarioSets);
}
/**
 * The same flags `corpusFlags` returns, carrying where each one came from.
 *
 * The gate has always accepted these — the whole corpus vocabulary is folded
 * into `scenarioFlags` — and the brief has always named the file they live in.
 * Neither was the problem. A batch put 25 of its 31 callbacks on the 12 deeds
 * quoted in the brief and 2 on the several hundred sitting in the corpus,
 * because a writer under pressure reaches for what is in front of them and a
 * flag id alone is not something you can write a scenario about. So the deed
 * travels with its scenario: "the-pardon-nobody-is-watching stamped
 * granted-the-quiet-clemency" is a callback someone can actually answer.
 *
 * Joined against the selector index for the class, which is what lets the brief
 * offer a writer the deeds their own kind of week plausibly follows from.
 */
export async function corpusDeeds(paths) {
    if (!existsSync(paths.flagsPath) || !existsSync(paths.indexPath))
        return [];
    const [entries, selectors, bodies] = await Promise.all([
        readFlagEntries(paths),
        readCorpusIndex(paths),
        // The expensive read, and the only place it is not worth avoiding: this
        // runs once when a job file is written, by hand, and what it buys is the
        // setter's own words in front of the writer answering them. A body a
        // newer rule refuses is reported and left out rather than refusing the
        // whole job: the list is a courtesy to the writer, not a gate.
        readCorpusBodiesReporting(paths).then((read) => {
            for (const stale of read.unparseable)
                console.error(`deeds list skips ${stale.id}: ${stale.reason}`);
            return read.bodies;
        }),
    ]);
    const classById = new Map(selectors.map((selector) => [selector.id, selector.class]));
    return deedsOf(entries, (id) => classById.get(id) ?? "unknown", bodies);
}
/**
 * The same deeds read straight off the bodies, for a reader that has the
 * scenarios but not the sidecars — the authoring kit, which is built from the
 * corpus baked into the app. The entries are the ones the flag sidecar holds.
 */
export function bodyDeeds(bodies) {
    const classById = new Map(bodies.map((def) => [def.id, def.class]));
    const entries = bodies.map((def) => ({ id: def.id, sets: scenarioSets(def) }));
    return deedsOf(entries, (id) => classById.get(id) ?? "unknown", bodies);
}
function deedsOf(entries, classOf, bodies) {
    const aftermath = new Map();
    for (const def of bodies) {
        for (const reply of def.replies) {
            if (reply.commitment.kind !== "position")
                continue;
            for (const flag of reply.sets ?? []) {
                // Keyed by scenario and flag together: two scenarios may stamp the same
                // flag, and the aftermath a reader has to honor is its own setter's.
                aftermath.set(`${def.id}\u0000${flag}`, {
                    remembered: reply.commitment.remembered,
                    rejoinder: reply.commitment.rejoinder?.text,
                });
            }
        }
    }
    return entries.flatMap((entry) => entry.sets.map((flag) => ({
        flag,
        scenario: entry.id,
        class: classOf(entry.id),
        ...(aftermath.get(`${entry.id}\u0000${flag}`) ?? {}),
    })));
}
export async function corpusStats(paths) {
    const selectors = await readCorpusIndex(paths);
    const shards = existsSync(paths.shardsDir)
        ? (await readdir(paths.shardsDir)).filter((name) => name.endsWith(".jsonl")).length
        : 0;
    return { scenarios: selectors.length, shards };
}
/** One scenario's body, read from the shard its selector names. */
export async function readBody(paths, selector) {
    if (!selector.shard)
        return undefined;
    const shardPath = path.join(paths.shardsDir, selector.shard);
    if (!existsSync(shardPath))
        return undefined;
    for (const line of (await readFile(shardPath, "utf8")).split("\n")) {
        if (!line.trim())
            continue;
        const def = ScenarioDef.parse(JSON.parse(line));
        if (def.id === selector.id)
            return def;
    }
    return undefined;
}
export async function writeCorpusManifest(paths) {
    const stats = await corpusStats(paths);
    await writeFile(path.join(paths.root, "manifest.json"), `${JSON.stringify(stats, null, 2)}\n`, "utf8");
}
