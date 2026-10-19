// A Republican administration that ran on securing the border and balancing
// the budget, signed the border order in its first week, and had that pledge
// settled kept before the week was out. The budget pledge is still open, so the
// Record shows a kept promise beside one that is not yet due.
import { apply } from "../../packages/engine/dist/effects.js";
import { compareDates } from "../../packages/engine/dist/clock.js";
import { sealFounding } from "../../packages/engine/dist/founding.js";
import { signOrder } from "../../packages/engine/dist/orders.js";
import { createRngStreams, makeCampaignSeed } from "../../packages/engine/dist/rng.js";
import { worldDataset } from "../../packages/world/dist/index.js";
import { charterOf, foundingOptions, openingChoices } from "../../packages/player-core/dist/index.js";
import { advanceWeeks } from "./_campaign.mjs";

export const name = "pledge-kept";

const KEPT = "plank-secure-border";
const OPEN = "plank-balanced-budget";

function oath() {
  const seed = makeCampaignSeed("fixture-pledge-kept");
  const choices = openingChoices(foundingOptions(seed));
  return sealFounding(seed, worldDataset, {
    ...choices,
    leader: {
      ...choices.leader,
      name: "Fixture President",
      party: "republican",
      ideology: { economicLeftRight: 0.35, authLibertarian: 0.2, nationalistGlobalist: 0.3 },
    },
    platform: [KEPT, OPEN],
    // The border pledge is the first-hundred-days priority. The seal reads this
    // once founding passes priorities through; until then it is a term pledge,
    // and it is kept in the first week either way.
    firstHundredDays: [KEPT],
  });
}

function pledgeOn(campaign, plank) {
  const pledge = campaign.pledges?.find((entry) => entry.plank === plank);
  if (!pledge) throw new Error(`the seal made no pledge on ${plank}`);
  return pledge;
}

export function build() {
  const sworn = oath();
  const signed = signOrder(sworn, charterOf(sworn), "order-border-controls", createRngStreams(sworn.seed));
  if (!signed.ok) throw new Error(`the border order could not be signed: ${signed.reason}`);
  const campaign = advanceWeeks(apply(sworn, signed.packet), 2);

  const kept = pledgeOn(campaign, KEPT);
  if (kept.status !== "kept") throw new Error(`the ${KEPT} pledge is ${kept.status}, not kept`);
  if (compareDates(kept.settledDate, kept.dueDate) > 0) throw new Error(`the ${KEPT} pledge was kept after it fell due`);
  const open = pledgeOn(campaign, OPEN);
  if (open.status !== "open") throw new Error(`the ${OPEN} pledge is ${open.status}; the fixture needs it still open`);
  return campaign;
}
