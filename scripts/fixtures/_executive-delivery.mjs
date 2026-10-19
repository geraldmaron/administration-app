import { apply } from "../../packages/engine/dist/effects.js";
import { fiscalPhase } from "../../packages/engine/dist/fiscal.js";
import { offshoreLeaseSaleAction, offshoreLeaseSalePhase, selectOffshoreLeaseSale } from "../../packages/engine/dist/offshore-leasing.js";
import { energyLeasingOrderSubjects } from "../../packages/engine/dist/order-authority-subjects.js";
import { executiveOrder, orderMinister, signOrder } from "../../packages/engine/dist/orders.js";
import { createRngStreams } from "../../packages/engine/dist/rng.js";
import { rulemakingPhase } from "../../packages/engine/dist/rulemaking.js";
import { advanceTurn, noopPhase } from "../../packages/engine/dist/turn-loop.js";
import { charterOf } from "../../packages/player-core/dist/index.js";
import { foundFixture } from "./_campaign.mjs";

const AREA = "ocs-gulf-program-2029";
const PHASES = { simulate: [offshoreLeaseSalePhase, fiscalPhase, rulemakingPhase], select: noopPhase };
let cached;

function requireAction(campaign, action) {
  const result = offshoreLeaseSaleAction(campaign, AREA, action);
  if (!result.ok) throw new Error(`${action}: ${result.reason}`);
  return apply(campaign, result.packet);
}

function week(campaign) {
  return advanceTurn(campaign, PHASES);
}

function prepare(seed) {
  const founded = foundFixture({ seedText: seed, leaderName: "Fixture President" });
  const interior = founded.institutions["INST-INTERIOR"];
  if (!interior) throw new Error("Interior is absent from the founded campaign");
  // Counterfactual starting conditions: $200m of apportioned authority and
  // 0.9 Interior delivery make this narrow sale branch reachable. Signing,
  // rulemaking, the $5m obligation, bids, award, receipt and permit are real effects.
  const opening = { ...founded,
    player: { ...founded.player, metrics: { ...founded.player.metrics,
      treasury: Math.max(200, founded.player.metrics.treasury) } },
    institutions: { ...founded.institutions,
      "INST-INTERIOR": { ...interior, implementationQuality: 0.9 } } };
  const subject = energyLeasingOrderSubjects(opening).find((entry) => entry.areaId === AREA);
  if (!subject) throw new Error("The approved offshore program area is unavailable at the opening");
  // Use a founded slate that actually seated a living Secretary of the Interior.
  // This is the normal quick-oath candidate selection, not an invented officeholder.
  if (!orderMinister(opening, executiveOrder("order-energy-leasing"))) return undefined;
  const signed = signOrder(opening, charterOf(opening), "order-energy-leasing",
    createRngStreams(opening.seed), subject);
  if (!signed.ok) throw new Error(`The planning order cannot be signed: ${signed.reason}`);
  // This bounded proof selects an unchallenged signature; it does not waive a court case.
  if (signed.record.review) return undefined;
  let campaign = apply(opening, signed.packet);
  for (let elapsed = 0; elapsed < 20 && campaign.pendingRules.find((rule) => rule.id === signed.record.id)?.status === "pending"; elapsed += 1) {
    campaign = week(campaign);
  }
  if (campaign.pendingRules.find((rule) => rule.id === signed.record.id)?.status !== "in-effect") return undefined;
  const beforeObligation = campaign.player.metrics.treasury;
  campaign = requireAction(campaign, "initiate-sale");
  if (beforeObligation - campaign.player.metrics.treasury !== 5) throw new Error("Sale review did not obligate exactly $5m");
  for (let elapsed = 0; elapsed < 24 && selectOffshoreLeaseSale(campaign, AREA)?.stage !== "decision"; elapsed += 1) {
    campaign = week(campaign);
    const stage = selectOffshoreLeaseSale(campaign, AREA)?.stage;
    if (stage === "no-sale" || stage === "expired") return undefined;
  }
  const review = selectOffshoreLeaseSale(campaign, AREA);
  if (review?.stage !== "decision" || review.bids.every((bid) => !bid.qualified
    || bid.amountUsdMillions < review.modeledFairValueUsdMillions)) return undefined;
  const beforeAward = campaign;
  campaign = requireAction(campaign, "accept-bid");
  for (let elapsed = 0; elapsed < 12; elapsed += 1) {
    const status = selectOffshoreLeaseSale(campaign, AREA)?.exploration?.status;
    if (status !== "awaiting-plan" && status !== "under-review") break;
    campaign = week(campaign);
  }
  const awarded = selectOffshoreLeaseSale(campaign, AREA);
  if (awarded?.exploration?.status !== "permitted" || awarded.bonusReceipt?.receivedTurn === undefined) return undefined;
  if (!campaign.books?.[campaign.founding.nation]?.leaseBonusReceiptIds?.includes(awarded.bonusReceipt.id)) {
    throw new Error("The received lease bonus was not booked");
  }
  return { beforeAward, permitted: campaign };
}

export function executiveDelivery(stage) {
  if (!cached) {
    for (let attempt = 0; attempt < 48 && !cached; attempt += 1) {
      cached = prepare(`executive-delivery-${attempt}`);
    }
  }
  if (!cached) throw new Error("No seed reached reviewed acceptable bids and a separately permitted exploration plan");
  return cached[stage];
}
