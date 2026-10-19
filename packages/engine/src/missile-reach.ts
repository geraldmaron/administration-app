import { US_BASING, type Nation, type NationId } from "@admin/world";
import { capitalDistanceKm } from "./relationship-graph.js";

// How far a government can strike without flying an air force over the target.
//
// The strike rung read only air branch strength, which left a government whose
// real answer is a ballistic missile with no answer at all: the capability that
// defines its reach was nowhere in the model. This is that reach, one sourced
// row per government, as the longest range of an operational ballistic or
// land-attack cruise missile the source lists. Only the low end of a stated
// range is used, and only systems the source marks operational; a presumed,
// developmental or unconfirmed system is not reach.
//
// Kilometers because the source states kilometers and capital distance is
// computed in them; nothing here is shown to a player as a figure.

export type MissileReachRow = {
  readonly nation: string;
  /** The longest operational range, low end, in the source's kilometers. */
  readonly rangeKm: number;
  /** The class of the system that sets it, as the source names the class. */
  readonly longestClass: string;
  readonly source: string;
  readonly opened: string;
};

const CSIS = (country: string) => `https://missilethreat.csis.org/country/${country}/`;

export const MISSILE_REACH: readonly MissileReachRow[] = [
  { nation: "CHN", rangeKm: 12_000, longestClass: "ICBM", source: CSIS("china"), opened: "2026-09-28" },
  { nation: "IND", rangeKm: 3_000, longestClass: "IRBM", source: CSIS("india"), opened: "2026-09-28" },
  { nation: "IRN", rangeKm: 2_000, longestClass: "MRBM", source: CSIS("iran"), opened: "2026-09-28" },
  { nation: "ISR", rangeKm: 4_800, longestClass: "IRBM", source: CSIS("israel"), opened: "2026-09-28" },
  { nation: "PAK", rangeKm: 1_500, longestClass: "MRBM", source: CSIS("pakistan"), opened: "2026-09-28" },
  { nation: "PRK", rangeKm: 15_000, longestClass: "ICBM", source: CSIS("dprk"), opened: "2026-09-28" },
  { nation: "RUS", rangeKm: 11_000, longestClass: "ICBM", source: CSIS("russia"), opened: "2026-09-28" },
];

/** All a reach reading needs of a government: who it is and where its capital stands. */
type Placed = Pick<Nation, "id" | "geo">;

const reachById: ReadonlyMap<string, number> = new Map(MISSILE_REACH.map((row) => [row.nation, row.rangeKm]));

/** The longest operational range a government's missiles hold, or zero where the table records none. */
export function missileRangeKm(nation: NationId): number {
  return reachById.get(nation as string) ?? 0;
}

/**
 * Whether the actor's missiles reach the target: its capital, or, for the
 * United States, a country hosting American forces. A government that cannot
 * reach Washington can still reach a base in the region, which is where such
 * a government has actually answered the United States.
 */
export function withinMissileReach(actor: Placed, target: Placed, hosts: readonly Placed[] = []): boolean {
  const range = missileRangeKm(actor.id);
  if (range <= 0) return false;
  if (capitalDistanceKm(actor, target) <= range) return true;
  return hosts.some((host) => capitalDistanceKm(actor, host) <= range);
}

/** The countries hosting United States forces abroad, by the basing table. Empty until the table is filled. */
export function usHostIds(): readonly string[] {
  return [...new Set(US_BASING.map((row) => row.country))];
}
