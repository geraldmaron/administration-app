import { apply } from "../../packages/engine/dist/effects.js";
import { buyFederalCleanPower, cleanPowerPurchasePhase } from "../../packages/engine/dist/clean-power-purchasing.js";
import { fiscalPhase } from "../../packages/engine/dist/fiscal.js";
import { signOrder } from "../../packages/engine/dist/orders.js";
import { createRngStreams } from "../../packages/engine/dist/rng.js";
import { rulemakingPhase } from "../../packages/engine/dist/rulemaking.js";
import { advanceTurn, noopPhase } from "../../packages/engine/dist/turn-loop.js";
import { charterOf } from "../../packages/player-core/dist/index.js";
import { foundFixture } from "./_campaign.mjs";

const PHASES = { simulate: [cleanPowerPurchasePhase, fiscalPhase, rulemakingPhase], select: noopPhase };
let cached;

function prepare(seed) {
  const founded = foundFixture({ seedText: seed, leaderName: "Fixture President" });
  // Counterfactual starting authority only; the contract still uses the
  // ordinary appropriation gate and renewable supply actually in the campaign.
  const opening = { ...founded, player: { ...founded.player,
    metrics: { ...founded.player.metrics, treasury: Math.max(200, founded.player.metrics.treasury) } } };
  const signed = signOrder(opening, charterOf(opening), "order-clean-energy",
    createRngStreams(opening.seed));
  if (!signed.ok) throw new Error(`The clean-power order cannot be signed: ${signed.reason}`);
  if (signed.record.review) return undefined;
  let campaign = apply(opening, signed.packet);
  for (let elapsed = 0; elapsed < 20 && campaign.pendingRules.find((rule) => rule.id === signed.record.id)?.status === "pending"; elapsed += 1) {
    campaign = advanceTurn(campaign, PHASES);
  }
  if (campaign.pendingRules.find((rule) => rule.id === signed.record.id)?.status !== "in-effect") return undefined;
  const beforePurchase = campaign;
  const purchase = buyFederalCleanPower(campaign);
  if (!purchase.ok) return undefined;
  campaign = apply(campaign, purchase.packet);
  if (beforePurchase.player.metrics.treasury - campaign.player.metrics.treasury !== 94) {
    throw new Error("The clean-power contract did not obligate exactly $94m");
  }
  for (let elapsed = 0; elapsed < 3 && (campaign.cleanPowerPurchases?.[0]?.deliveredMwh ?? 0) === 0; elapsed += 1) {
    campaign = advanceTurn(campaign, PHASES);
  }
  if (campaign.cleanPowerPurchases?.[0]?.deliveredMwh <= 0) return undefined;
  // Legacy-save setup: remove only payment fields from a genuinely delivered
  // contract, then let the real weekly phase start a new observed cash record.
  const legacyPurchase = { ...campaign.cleanPowerPurchases[0] };
  delete legacyPurchase.paidUsdMillions;
  delete legacyPurchase.paymentTrackingStartMwh;
  const reloaded = { ...campaign, cleanPowerPurchases: [legacyPurchase] };
  const legacyPayment = advanceTurn(reloaded, PHASES);
  if (legacyPayment.cleanPowerPurchases?.[0]?.paymentTrackingStartMwh !== campaign.cleanPowerPurchases[0].deliveredMwh) {
    throw new Error("Legacy payment tracking inferred an earlier payment instead of recording from the load");
  }
  return { beforePurchase, delivering: campaign, legacyPayment };
}

export function executiveCleanPower(stage) {
  if (!cached) {
    for (let attempt = 0; attempt < 48 && !cached; attempt += 1) {
      cached = prepare(`executive-clean-power-${attempt}`);
    }
  }
  if (!cached) throw new Error("No seed reached a final clean-power rule and first actual delivery");
  return cached[stage];
}
