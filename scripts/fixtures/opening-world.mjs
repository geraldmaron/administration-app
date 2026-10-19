// The oath on the 2026 preset board: the wars under way abroad marked as
// inherited, the insurgencies in their hosts, US forces at their
// installations with the Gulf posture beside the Iran front, and the
// sanctions programs in force. Founded the way the founding screen seals, with
// the one choice the screen does not offer yet: the named preset.
import { sealFounding } from "../../packages/engine/dist/founding.js";
import { makeCampaignSeed } from "../../packages/engine/dist/rng.js";
import { selectBases } from "../../packages/engine/dist/basing.js";
import { selectInheritedWorld } from "../../packages/engine/dist/opening-world.js";
import { worldDataset } from "../../packages/world/dist/index.js";
import { foundingOptions, openingChoices } from "../../packages/player-core/dist/index.js";

export const name = "opening-world";

function assertBoard(campaign) {
  const reading = selectInheritedWorld(campaign);
  if (!reading || reading.wars.length !== 2) throw new Error(`the preset should carry two inherited wars: ${JSON.stringify(reading)}`);
  const us = campaign.founding.nation;
  for (const war of Object.values(campaign.conflicts)) {
    if ([war.aggressor, war.defender, ...war.joined.aggressor, ...war.joined.defender].includes(us)) throw new Error("the United States is a belligerent at the oath");
  }
  if (campaign.operators.length === 0) throw new Error("no insurgency was carried into its host");
  const bases = selectBases(campaign);
  if (bases.length === 0) throw new Error("no US installation is on the board");
  if (!bases.some((base) => base.kind === "deployment" && base.provenance === "planning value")) throw new Error("the Gulf posture is missing or not labeled a planning value");
  if (!Object.values(campaign.trade.measures).some((measure) => measure.id.endsWith(":inherited"))) throw new Error("no sanctions program was carried");
}

export function build() {
  const seed = makeCampaignSeed("fixture-opening-world");
  const choices = openingChoices(foundingOptions(seed));
  const campaign = sealFounding(seed, worldDataset, {
    ...choices,
    leader: { ...choices.leader, name: "Fixture President" },
    openingPreset: "world-2026",
  });
  assertBoard(campaign);
  return campaign;
}
