import { BUNDLED_SHARDS } from "./bundled-corpus.generated";
import { parseShardBody } from "./shard-parser";
import { reportContentProblems } from "./report";
// The published corpus as the binary carries it.
//
// The generated module beside this one holds every shard byte for byte; this
// is the reading of it. Two things are deliberate here. The shards are parsed
// through the same function a fetched shard goes through, so a scenario is
// held to one standard however it arrived. And the parse is lazy and cached,
// because it costs a few milliseconds nobody should pay during the cold start
// that draws the first screen.
//
// A line in here that does not parse is a worse thing than a bad line over the
// wire: it was published, compiled into the binary, shipped to a store, and
// can never be drawn on any device running this build. `corpus build` refuses
// to write such a bake and a test fails on one, so reaching the report below
// means both were bypassed — which is exactly when somebody needs telling.
let parsed;
/** Every scenario baked into this build. Parsed once, on first draw. */
export function bundledCorpusScenarios() {
    if (!parsed) {
        const scenarios = [];
        const problems = [];
        for (const shard of BUNDLED_SHARDS) {
            const body = parseShardBody(shard.jsonl);
            scenarios.push(...body.scenarios);
            for (const drop of body.drops) {
                problems.push(`baked shard ${shard.shardId} line ${drop.line} (${drop.id}): ${drop.issue}`);
            }
        }
        reportContentProblems("the corpus baked into this build", problems);
        parsed = scenarios;
    }
    return parsed;
}
/** shardId -> digest for every shard baked into the binary. */
export const BUNDLED_SHARD_DIGESTS = new Map(BUNDLED_SHARDS.map((shard) => [shard.shardId, shard.sha256]));
export { BUNDLED_CONTENT_SET_ID, BUNDLED_MANIFEST_REVISION, BUNDLED_SHARDS } from "./bundled-corpus.generated";
