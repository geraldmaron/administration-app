import { coalitionFor, type Backer, type Campaign } from "@admin/engine";
import type { NationId } from "@admin/world";

// Who would stand with the President on a move against a country. The engine
// owns the reading (coalition.ts) because the same backers move the odds and
// the standing cost of military and economic acts; this is the act screen's
// shortlist of it.

export type CoalitionReading = {
  readonly backers: readonly Backer[];
  /** Partners who share a compact with you but are aligned with the target or share its bloc, so the engine counts them as reacting against. */
  readonly torn: number;
};

export function coalitionReading(campaign: Campaign, target: NationId, limit = 8): CoalitionReading {
  const { backers, torn } = coalitionFor(campaign, campaign.founding.nation, target);
  return { backers: backers.slice(0, limit), torn };
}
