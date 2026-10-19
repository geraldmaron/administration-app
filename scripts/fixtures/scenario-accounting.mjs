import { BUNDLED_SHARDS } from "../../packages/player-core/dist/content/bundled-corpus.generated.js";
import { withScenarioCases } from "../../packages/player-core/dist/conversation/scenario-cases.js";
import { ScenarioDef, castBound } from "../../packages/content/dist/index.js";
import { foundFixture } from "./_campaign.mjs";

export const name = "scenario-accounting";

export function build() {
  const campaign = foundFixture({ seedText: "fixture-story-accounting", leaderName: "Morgan Avery" });
  const definitions = BUNDLED_SHARDS.flatMap((shard) => shard.jsonl.split("\n").filter(Boolean).map((line) => JSON.parse(line)));
  const shipped = definitions.find((candidate) => candidate.id === "the-yard-that-builds-the-boats");
  const def = ScenarioDef.parse({ ...shipped, subjects: [{ key: "municipalOfficial", source: "mayor" }] });
  // Pin the shipped decision and add a typed mayor slot to exercise the new binding contract.
  // Its prose and program remain unchanged; this is a test fixture, not a corpus publication.
  const cast = castBound(campaign, def, campaign.founding.nation);
  if (!cast.script.subjects?.some((subject) => subject.id === "entity:voss-shipyard")) throw new Error("The registry's shipyard introduction did not bind");
  return withScenarioCases(campaign, [cast]);
}
