import { passages } from "./scenario-audit-contract.js";
function make(kind, severity, scenario, message) {
    return { kind, severity, scenario, message };
}
// The pool's vocabulary, as opposed to any one scenario's.
//
// `template-overlap` asks whether two scenarios are the same document. This
// asks the quieter question underneath it: whether the whole batch is drawing
// on too small a stock of images and closing beats. A review of one batch found
// "debriefed once" in three scenarios, "the second service won't confirm the
// timing" in three, and a divided-perception beat ("reads as X to half the
// country") in six — every one of them individually well written, and the sum
// of them a pool that sounds like one writer with four sentences.
//
// It matters more as the corpus grows than any per-scenario rule: at two
// thousand scenarios a shared prop vocabulary is what will make the pool feel
// small, long before the premises run out.
//
// Five-word runs, calibrated against real content rather than picked. Measured
// over an 87-scenario batch: three-word runs flagged 139 phrases, nearly all
// function words ("and the government"), and tripped the core pack's own six
// exemplars; four-word runs flagged 16, still mostly connective tissue; six
// found nothing at all. Five found exactly the beats a human reviewer had
// already circled by hand — "and everyone in the room", "the government said in
// public" — and left the exemplars clean.
//
// It catches a phrase repeated verbatim, which is the tractable half. The
// reviewer also found reuse at the level of the image rather than the words —
// a single source "debriefed once", a damaged chain of custody — and no n-gram
// reaches that. That half needs a motif vocabulary on the scenario itself.
const PHRASE_RUN = 5;
const PHRASE_REUSE_CEILING = 2;
const STOCK_PHRASE_BATCH_FLOOR = 8;
/**
 * How many shipped scenarios must already carry a run before it is worth
 * putting in the corpus index.
 *
 * The rule needs corpus carrier counts, not merely presence, because the
 * ceiling is a total: two in the corpus plus one in the batch is three. Indexing
 * every run the corpus carries would make that exact, and would also make the
 * sidecar a second copy of the corpus — measured over 289 scenarios, 90,129
 * distinct runs at 3.12MB, of which 89,699 (99.5%) are carried by exactly one
 * scenario and can never be borrowed from twice. At the 2,000-scenario target
 * that is over 20MB read on every gate run to catch a case the next paragraph
 * shows is the rare one.
 *
 * At two, the same corpus indexes 430 runs in 14KB, and the file grows with how
 * much the pool actually repeats itself rather than with how large it is.
 *
 * What the cut gives up: one corpus carrier plus two batch carriers is also
 * three, and goes unreported. That is a batch repeating a phrase twice *and*
 * borrowing it, where the batch-internal count is already two and a reviewer is
 * looking at the writer's own repetition. The case this catches instead is the
 * one that actually escaped — every one of the three phrases a real batch
 * borrowed unseen (`the government said out loud`, `and one of them is`, `at
 * the crossing where the`) had exactly two carriers in the shipped corpus and
 * one in the batch. Lower this if that ever stops being true; it is a
 * measurement, not a preference.
 */
const PHRASE_INDEX_FLOOR = 2;
/**
 * The corpus half of the phrase index: every run carried by at least
 * `PHRASE_INDEX_FLOOR` of these scenarios, with its carrier count.
 *
 * Exported because the store builds this at publish time, where the whole
 * corpus is already in memory for the union audit, and writes it beside the
 * flag and overlap sidecars.
 */
export function phraseCarrierIndex(defs) {
    const counts = new Map();
    for (const def of defs) {
        for (const run of phraseRuns(def))
            counts.set(run, (counts.get(run) ?? 0) + 1);
    }
    for (const [run, count] of counts) {
        if (count < PHRASE_INDEX_FLOOR)
            counts.delete(run);
    }
    return counts;
}
function phraseRuns(def) {
    const words = passages(def)
        .map((passage) => passage.text)
        .join(" ")
        .toLowerCase()
        .replace(/\{\{[^}]*\}\}/g, " ")
        .split(/[^a-z']+/)
        .filter(Boolean);
    const runs = new Set();
    for (let index = 0; index + PHRASE_RUN <= words.length; index += 1) {
        runs.add(words.slice(index, index + PHRASE_RUN).join(" "));
    }
    return runs;
}
export function auditStockPhrasing(defs, corpusCarriers, findings) {
    if (defs.length < STOCK_PHRASE_BATCH_FLOOR)
        return;
    const carriers = new Map();
    for (const def of defs) {
        for (const run of phraseRuns(def)) {
            carriers.set(run, [...(carriers.get(run) ?? []), def.id]);
        }
    }
    // Grouped by carrier set, then merged within it. Overlapping runs of one
    // borrowed sentence must report once — but two unrelated borrowings that
    // happen to share a carrier set are two findings, and collapsing them on the
    // set alone loses the second silently. That distinction barely mattered while
    // every carrier set had three or more scenarios in it; with corpus carriers
    // counted, a run carried by a single batch scenario can now reach the ceiling,
    // so one scenario's every borrowing shares one key and all but one vanish.
    const bySet = new Map();
    for (const [run, ids] of carriers) {
        const shipped = corpusCarriers.get(run) ?? 0;
        // The ceiling is a total across the pool the batch is joining, not a count
        // within the batch: a phrase two shipped scenarios already carry is spent
        // by the third, whichever side of the publish it is written on.
        if (ids.length + shipped <= PHRASE_REUSE_CEILING)
            continue;
        // Escaped rather than written as a literal NUL: a raw one in the source
        // makes this whole file binary to grep and ripgrep, so every search for a
        // rule name silently misses the module that defines them all.
        const key = ids.join("\u0000");
        bySet.set(key, [...(bySet.get(key) ?? []), run]);
    }
    for (const [key, runs] of bySet) {
        const ids = key.split("\u0000");
        for (const phrase of mergeOverlappingRuns(runs)) {
            // Every run in a merged chain has the same carriers by construction, so
            // the count can be read off any of them.
            const shipped = corpusCarriers.get(phrase.split(" ").slice(0, PHRASE_RUN).join(" ")) ?? 0;
            findings.push(make("stock-phrasing", "warning", ids[0], `${ids.length + shipped} scenarios share the phrase "${phrase}"` +
                (shipped > 0
                    ? ` (${shipped} of them already in the shipped corpus, so this batch is borrowing rather than repeating itself)`
                    : "") +
                ": a pool reads small when its writers reach for the same image twice, however well each one is written on its own"));
        }
    }
}
/**
 * Collapse runs that are windows onto one borrowed sentence, and keep runs that
 * are not.
 *
 * Two runs belong to the same sentence when one's last `PHRASE_RUN - 1` words
 * are the other's first — the definition of adjacent windows. Chaining those
 * yields the whole borrowed phrase rather than an arbitrary five-word slice of
 * it, which is also the more useful thing to hand a writer: "and the government
 * spent the rest of the year" names the tic, where "and the government spent
 * the" only points at it.
 */
function mergeOverlappingRuns(runs) {
    const words = new Map(runs.map((run) => [run, run.split(" ")]));
    const sorted = [...runs].sort();
    const tail = (run) => words.get(run).slice(1).join(" ");
    const head = (run) => words.get(run).slice(0, PHRASE_RUN - 1).join(" ");
    const successor = new Map();
    const hasPredecessor = new Set();
    for (const run of sorted) {
        const next = sorted.find((other) => other !== run && head(other) === tail(run));
        if (next === undefined || hasPredecessor.has(next))
            continue;
        successor.set(run, next);
        hasPredecessor.add(next);
    }
    const merged = [];
    for (const run of sorted) {
        if (hasPredecessor.has(run))
            continue;
        let phrase = run;
        let cursor = run;
        const walked = new Set([run]);
        // Bounded by the chain itself: a cycle would otherwise spin here, and a
        // repeated five-word run inside one sentence can produce one.
        while ((cursor = successor.get(cursor)) !== undefined && !walked.has(cursor)) {
            walked.add(cursor);
            phrase += ` ${words.get(cursor)[PHRASE_RUN - 1]}`;
        }
        merged.push(phrase);
    }
    return merged;
}
