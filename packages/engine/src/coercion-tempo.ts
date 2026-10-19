import { chokepointById, type NationId } from "@admin/world";
import { COMMODITY_DEFS } from "./commodity-registry.js";
import { COMMODITY_IDS } from "./commodities.js";
import { selectConflictBetween, sideOf } from "./conflicts.js";
import { pairKey, type TempoClaim, type TempoFamily } from "./npc-tempo.js";
import { selectActiveConflicts, selectNation, type Campaign, type Conflict } from "./state.js";

// The two rationed families of other governments' coercion: acts of force
// (blockade, strike, invasion) and the strait closures a new war with a
// government on a priced strait's shores makes. The President is never
// rationed; these read only what the world's own agent may choose.

/**
 * Planning value, for the owner to set: the most acts of force (military rungs
 * 3 to 5) the world's governments make in any term, and how long a pair of
 * governments rests after one before either may use force on the other again.
 * No opened source gives a rate of interstate uses of force at this grain; the
 * cooldown is half a year, long enough for a war an act opened to cool on its
 * own rather than be fed every week by the same pair.
 */
export const NPC_ACTS_OF_FORCE: TempoFamily = { id: "npc-force", perTerm: 8, cooldownWeeks: 26, noun: "acts of force" };

/**
 * The owner's rate: at most two strait closures by other governments in a
 * term, with each strait resting half a term after one. A closure is a war
 * newly opened with a government on a priced strait's shores, where no war
 * already contests that strait.
 */
export const NPC_STRAIT_CLOSURES: TempoFamily = { id: "strait-closure", perTerm: 2, cooldownWeeks: 104, noun: "strait closures" };

/**
 * Operations against another government's hold on power: the owner's band is
 * one to six a term worldwide, US treaty partners included, and one sponsor
 * works against one government at most once in two years.
 */
export const NPC_REGIME_OPERATIONS: TempoFamily = { id: "regime-operation", perTerm: 6, cooldownWeeks: 104, noun: "operations against a government" };

/** Every strait that reaches a price, with the governments on its shores, from the commodity routes. */
function pricedStraits(): ReadonlyMap<string, readonly NationId[]> {
  const straits = new Map<string, NationId[]>();
  for (const id of COMMODITY_IDS) {
    for (const route of COMMODITY_DEFS[id].routes) {
      straits.set(route.chokepoint, [...new Set([...(straits.get(route.chokepoint) ?? []), ...route.littoral])]);
    }
  }
  return straits;
}

// Built on first use rather than at load: the commodity registry and this
// module meet in an import cycle through the regime starter, and a table built
// at load could read the commodity list before it exists.
let straits: ReadonlyMap<string, readonly NationId[]> | undefined;
const STRAITS_OF = (): ReadonlyMap<string, readonly NationId[]> => (straits ??= pricedStraits());

function contests(conflict: Conflict, littoral: readonly NationId[]): boolean {
  return littoral.some((shore) => sideOf(conflict, shore) !== undefined);
}

/**
 * The priced straits a new war between these two governments would close: one
 * of them is on its shores, they are not already at war, and no war on the
 * board already contests it.
 */
export function straitsANewWarWouldClose(campaign: Campaign, a: NationId, b: NationId): readonly string[] {
  if (selectConflictBetween(campaign, a, b)) return [];
  const active = selectActiveConflicts(campaign);
  return [...STRAITS_OF().entries()]
    .filter(([, littoral]) => littoral.includes(a) || littoral.includes(b))
    .filter(([, littoral]) => !active.some((conflict) => contests(conflict, littoral)))
    .map(([chokepoint]) => chokepoint)
    .sort();
}

const nameOf = (campaign: Campaign, id: NationId) => selectNation(campaign, id)?.base.identity.name ?? (id as string);

type ForceRequest = { readonly actor: NationId; readonly target: NationId; readonly instrument: string; readonly rung: number };

/** Whether the request is an act of force: a blockade, a strike or an invasion. */
export function isActOfForce(request: ForceRequest): boolean {
  return request.instrument === "military" && request.rung >= 3;
}

/** The act of force a request would make, on the pair it rests. */
export function forceClaim(campaign: Campaign, request: ForceRequest): TempoClaim {
  return {
    family: NPC_ACTS_OF_FORCE,
    key: pairKey(request.actor, request.target),
    label: `${nameOf(campaign, request.actor)} and ${nameOf(campaign, request.target)}`,
  };
}

/** The strait closures a war opened between the request's two governments would make. */
export function straitClaims(campaign: Campaign, request: ForceRequest): readonly TempoClaim[] {
  return straitsANewWarWouldClose(campaign, request.actor, request.target).map((chokepoint) => ({
    family: NPC_STRAIT_CLOSURES,
    key: chokepoint,
    label: `the ${chokepointById.get(chokepoint)?.name ?? chokepoint}`,
  }));
}

/** Everything an act would claim before it is made, for the agent to check against the ledger. */
export function isRegimeOperation(request: ForceRequest): boolean {
  return request.instrument === "covert" && request.rung === 5;
}

/** One sponsor against one government: the key runs one way, because who works against whom is the fact. */
export function regimeClaim(campaign: Campaign, request: ForceRequest): TempoClaim {
  return {
    family: NPC_REGIME_OPERATIONS,
    key: `${request.actor}>${request.target}`,
    label: `${nameOf(campaign, request.actor)} against ${nameOf(campaign, request.target)}`,
  };
}

export function coercionClaims(campaign: Campaign, request: ForceRequest): readonly TempoClaim[] {
  if (isRegimeOperation(request)) return [regimeClaim(campaign, request)];
  return isActOfForce(request) ? [forceClaim(campaign, request), ...straitClaims(campaign, request)] : [];
}
