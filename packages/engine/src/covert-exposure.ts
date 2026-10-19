import type { NationId } from "@admin/world";
import type { Campaign } from "./state.js";
import type { RungLevel } from "./instrument-ids.js";
import { createRngStreams } from "./rng.js";

/** Operational exposure is a separate seeded outcome from mission success. */
export function covertSuccessExposureChance(campaign: Campaign, target: NationId): number {
  return (campaign.nations[target]?.stats.security.counterIntel ?? 0) * 0.25;
}

export function covertSuccessExposed(campaign: Campaign, actor: NationId, target: NationId, rung: RungLevel): boolean {
  // Preserve the surveillance stream key so an existing save replays the same
  // finding. Higher rungs get their own independent, rung-specific stream.
  const key = rung === 1 ? "foreign-surveillance-exposure" : "foreign-covert-exposure";
  // Higher-rung operations count only earlier matching acts this turn. An
  // unrelated scheduled incident can add ledger rows on different office-day
  // layouts, but it must not change whether this operation is exposed.
  const occurrence = rung === 1 ? campaign.ledger.length : campaign.ledger.filter((entry) =>
    entry.turn === campaign.turn &&
    entry.commitment?.instrument === "covert" &&
    entry.commitment.rung === rung &&
    entry.commitment.target === target &&
    (entry.causal?.entities?.[0] === actor ||
      (entry.causal?.entities?.[0] === undefined && entry.actor === "player" && actor === campaign.founding.nation)),
  ).length;
  const parts = rung === 1 ? [actor, target, campaign.turn, occurrence] : [actor, target, rung, campaign.turn, occurrence];
  return createRngStreams(campaign.seed).stream(key, ...parts).next() < covertSuccessExposureChance(campaign, target);
}
