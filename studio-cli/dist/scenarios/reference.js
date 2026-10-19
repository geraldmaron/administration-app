import { ScenarioDef } from "@admin/content";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
// The approved reference set, loaded from disk rather than bundled into the
// content package.
//
// These ten are the bar the corpus is being regenerated to, and they live as
// JSONL under `content/reference/` for the same reason the corpus does: they
// are data a validator refuses or accepts, not code. The brief quotes them in
// full, which makes them the highest-leverage text in the repo — a generator
// copies the shape of what it is shown far more reliably than it follows a
// rule it is told.
//
// Read once at module load and cached. A brief is built per batch and there is
// no version of this where the files change underneath a run.
const REFERENCE_DIR = "content/reference";
export function repoRoot() {
    // The CLI runs from the workspace root in CI and from its own package
    // directory when a developer runs it by hand; both have to find the set.
    let dir = process.cwd();
    for (let depth = 0; depth < 4; depth += 1) {
        if (existsSync(path.join(dir, REFERENCE_DIR)))
            return dir;
        dir = path.dirname(dir);
    }
    return process.cwd();
}
function load() {
    const dir = path.join(repoRoot(), REFERENCE_DIR);
    if (!existsSync(dir))
        return [];
    return readdirSync(dir)
        .filter((name) => name.endsWith(".jsonl"))
        .sort()
        .flatMap((name) => readFileSync(path.join(dir, name), "utf8")
        .split("\n")
        .filter((line) => line.trim().length > 0)
        // Parsed, not cast. An exemplar that does not satisfy the schema would
        // teach every batch after it to make the same mistake, so a malformed
        // reference file fails the run rather than quietly lowering the bar.
        .map((line) => ScenarioDef.parse(JSON.parse(line))));
}
let cached;
export function referenceScenarios() {
    cached ??= load();
    return cached;
}
/**
 * The three the brief quotes in full.
 *
 * Three rather than ten, and the limit is still deliberate: a generator shown
 * ten complete scenarios starts producing the average of them rather than the
 * range. Three is what it takes to span the space now that the brief asks for
 * binding as well as texture, and the set is chosen so no axis is taught by
 * silence.
 *
 *   - the strike: a critical week whose cost is human and irreversible. The one
 *     exemplar that prices lives, and the reason it stays quoted.
 *   - the berth: a serious week with a foreign cast, a transmission in the
 *     counterpart's own words, two relationship gates and a trait gate, and
 *     replies that move the relationship they just changed.
 *   - the yards: a routine week where nothing is on fire, bound to the funding
 *     clock and a metric, placed on a named metro, and reaching the gazetteer.
 *
 * The second and third were written for this list. Measured on 2026-09-02 the
 * previous pair carried no `pull`, no `relationship` move and, in one of the
 * two, no conditions at all — so a writer sent to the reference set to learn
 * how to bind a week learned instead that a week need not be bound.
 */
const QUOTED = [
    "the-strike-that-hit-the-second-building",
    "the-berth-they-will-not-open",
    "the-yards-and-the-money-that-runs-out",
];
export function referenceExemplars() {
    const set = referenceScenarios();
    const quoted = set.filter((scenario) => QUOTED.includes(scenario.id));
    // Order as written above rather than as the directory listed them, so the
    // brief opens on the heavy week and closes on the ordinary one.
    return [...quoted].sort((a, b) => QUOTED.indexOf(a.id) - QUOTED.indexOf(b.id));
}
