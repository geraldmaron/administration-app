import { forceAssetPersonnel, type NationId } from "@admin/world";
import { selectNation, type Campaign, type Conflict, type ConflictSide } from "./state.js";
import { committedPersonnelToward } from "./capacity.js";
import { specForRung } from "./force-packages.js";
import { combatQuality } from "./warfighting.js";

// Who is actually in a war: for each government on a side, the people it has
// in the theater and how well they fight. The week's strength and the week's
// losses both read this, so the force that carries a front is the force that
// bleeds for it, and a government is charged for the people it sent rather
// than for its whole establishment.

/**
 * The share of its active force a government fights with on its own ground or
 * across a border it shares. Planning value carried over from the earlier loss
 * rule; no source gives a deployed share per war.
 */
const HOME_ENGAGED_SHARE = 0.5;

/** The share of its active force a joiner with no named formations sends (planning value, carried over). */
const JOINER_ENGAGED_SHARE = 0.1;

export type Combatant = {
  readonly nation: NationId;
  /** People in the theater. */
  readonly personnel: number;
  /** How well each of them fights, 0..1 (`combatQuality`). */
  readonly quality: number;
};

/**
 * A corps at the invasion package's preferred size, in people: the least the
 * President's government fights any war with, because a country at war brings
 * its standoff weapons and air power whether or not a formation is on the
 * order of battle's books for the theater. Read when asked rather than at load,
 * so this module never evaluates an import while the war modules' cycle is
 * still loading.
 */
export function fullFrontPersonnel(): number {
  const spec = specForRung(5);
  return spec ? forceAssetPersonnel(spec.unitType, spec.preferred) : 32_000;
}

function opponentOf(conflict: Conflict, side: ConflictSide): NationId {
  return side === "aggressor" ? conflict.defender : conflict.aggressor;
}

function activeForce(campaign: Campaign, nation: NationId): number {
  return selectNation(campaign, nation)?.stats.military.activeHeadcount ?? 0;
}

/**
 * The President's government fights with what it committed to this war and
 * this enemy, and never with less than a corps. Defending its own soil it
 * fights with the home share, or more where more was sent.
 */
function presidentsPersonnel(campaign: Campaign, conflict: Conflict, side: ConflictSide, nation: NationId): number {
  const committed = committedPersonnelToward(campaign, nation, opponentOf(conflict, side) as string) + committedPersonnelToward(campaign, nation, conflict.id);
  const atHome = side === "defender" && conflict.defender === nation;
  return Math.max(committed, atHome ? activeForce(campaign, nation) * HOME_ENGAGED_SHARE : fullFrontPersonnel());
}

/**
 * Another government's principal: the home share at home or across a shared
 * border, and only what its lift can carry and keep supplied when it attacks
 * across water or a third country.
 */
function principalPersonnel(campaign: Campaign, conflict: Conflict, side: ConflictSide, nation: NationId): number {
  const runtime = selectNation(campaign, nation);
  if (!runtime) return 0;
  const home = runtime.stats.military.activeHeadcount * HOME_ENGAGED_SHARE;
  if (side === "defender") return home;
  const adjacent = runtime.base.geo.neighbors.some((id) => (id as string) === (conflict.defender as string));
  const lift = (runtime.stats.military.airliftCapacity + runtime.stats.military.sealiftCapacity) / 2;
  return adjacent ? home : home * lift;
}

/** A joiner other than the President's government: the formations it committed to the war, or its sending share where it named none. */
function joinerPersonnel(campaign: Campaign, conflict: Conflict, nation: NationId): number {
  const committed = committedPersonnelToward(campaign, nation, conflict.id);
  return committed > 0 ? committed : activeForce(campaign, nation) * JOINER_ENGAGED_SHARE;
}

/** Everyone fighting on one side this week, principal first. */
export function sideCombatants(campaign: Campaign, conflict: Conflict, side: ConflictSide): readonly Combatant[] {
  const principal = side === "aggressor" ? conflict.aggressor : conflict.defender;
  return [principal, ...conflict.joined[side]].flatMap((nation): Combatant[] => {
    const runtime = selectNation(campaign, nation);
    if (!runtime) return [];
    const personnel =
      nation === campaign.founding.nation
        ? presidentsPersonnel(campaign, conflict, side, nation)
        : nation === principal
          ? principalPersonnel(campaign, conflict, side, nation)
          : joinerPersonnel(campaign, conflict, nation);
    return [{ nation, personnel, quality: combatQuality(runtime.stats) }];
  });
}

/** People a side has in the theater. */
export function sidePersonnel(combatants: readonly Combatant[]): number {
  return combatants.reduce((sum, combatant) => sum + combatant.personnel, 0);
}

/** A side's quality, weighted by who has the most people there. */
export function sideQuality(combatants: readonly Combatant[]): number {
  const people = sidePersonnel(combatants);
  return people > 0 ? combatants.reduce((sum, combatant) => sum + combatant.quality * combatant.personnel, 0) / people : 0;
}
