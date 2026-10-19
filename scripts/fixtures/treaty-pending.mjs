// A trade instrument signed with a close ally, still before the Senate: the
// copy budget's own fixture for /treaty/$id, a room no other fixture reaches
// because nothing in the shipped content yet proposes one (VIS-6, W6/6C).
import { apply } from "../../packages/engine/dist/effects.js";
import { sealFounding } from "../../packages/engine/dist/founding.js";
import { makeCampaignSeed } from "../../packages/engine/dist/rng.js";
import { signTreaty } from "../../packages/engine/dist/treaties.js";
import { worldDataset } from "../../packages/world/dist/index.js";
import { charterOf, foundingOptions, openingChoices } from "../../packages/player-core/dist/index.js";

export const name = "treaty-pending";

const ALLIES = ["GBR", "CAN", "AUS", "JPN", "KOR", "FRA", "DEU", "NLD", "POL", "ISR"];

function oath() {
  const seed = makeCampaignSeed("fixture-treaty-pending");
  const choices = openingChoices(foundingOptions(seed));
  return sealFounding(seed, worldDataset, { ...choices, leader: { ...choices.leader, name: "Fixture President" } });
}

export function build() {
  const sworn = oath();
  const charter = charterOf(sworn);
  for (const ally of ALLIES) {
    const result = signTreaty(sworn, charter, "trade", ally);
    if (result.ok) return apply(sworn, result.packet);
  }
  throw new Error(`no ally in ${ALLIES.join(", ")} trusts the founding government enough for a trade instrument`);
}
