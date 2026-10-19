import { FOUNDING_DYADS, US_ID, worldNations, type DyadKind, type Nation, type NationId, type Posture, type Relationship } from "@admin/world";
import { usHostIds, withinMissileReach } from "./missile-reach.js";
import type { InstrumentId } from "./instruments.js";
import { holdsTerritorialLine, type RedLineCrossing } from "./red-lines.js";
import { selectConflicts, type Campaign } from "./state.js";
import { grudgeWeight } from "./relationships.js";

// Whether a state reaches for the economy when it wants something, and whether
// it can afford to.
//
// Every nation in the world scored economic coercion the same way: by how
// coercive the instrument reads against how badly it wants the target to move.
// Nothing in that asks the two questions a foreign ministry actually asks first
// — do we have leverage over these people, and can we take the hit if they have
// leverage over us. So a resource-poor importer with a trade deficit reached for
// an embargo exactly as readily as a surplus exporter its neighbors cannot
// replace, and the authored trade and energy figures that would have separated
// them were read by nobody.
//
// The same hole existed on the other two coercive ladders. Force had a penalty
// and no case for it at all — the function returned a negative number for every
// actor against every target on earth — and covert work had nothing either way,
// so an operation against a hollowed-out neighbor and one against a police
// state read identically. Neither is priced in goods, which is what the
// economic half is priced in; both are priced in facts the dataset already
// carries.
//
// The propensities here are derived, not authored: three new trait ranges over
// forty-nine nations would be three numbers a human had to invent per country,
// and the facts that decide this are already on the record.

export type CoercionPropensity = {
  // Leverage of its own: a surplus exporter has something to withhold.
  readonly mercantilist: number;
  // How little it needs anyone else, so how cheaply it can afford a rupture.
  readonly autarkic: number;
  // The composite — how readily this state reaches for the economic ladder at
  // all, before any particular target is considered.
  readonly sanctionProne: number;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/**
 * A trade surplus as a share of what the country sells, which is the honest
 * scale for it: a surplus of ten billion means something different to an
 * economy exporting twelve than to one exporting nine hundred. A deficit reads
 * zero rather than negative — a country that buys more than it sells has no
 * leverage to withhold, it does not have anti-leverage.
 */
function surplusShare(nation: Nation): number {
  const exports = nation.stats.trade.exports;
  if (exports <= 0) return 0;
  return clamp01(nation.stats.trade.balance / exports);
}

/** The average of what this nation owes everyone it trades with. */
function averageTradeDependence(nation: Nation): number {
  const values = Object.values(nation.stats.trade.tradeDependence);
  if (values.length === 0) return 0;
  return clamp01(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function coercionPropensity(nation: Nation): CoercionPropensity {
  const mercantilist = surplusShare(nation);
  const autarkic = clamp01(1 - (nation.stats.energy.importDependence * 0.5 + averageTradeDependence(nation) * 0.5));
  return {
    mercantilist,
    autarkic,
    // Weighted toward what the state can withhold rather than what it can
    // survive: leverage is what makes economic coercion work, self-sufficiency
    // only makes it survivable. Opportunism is the taste for using either.
    sanctionProne: clamp01(mercantilist * 0.45 + autarkic * 0.35 + nation.traits.opportunism * 0.2),
  };
}

/**
 * How much of this target's economy runs through this actor. The other half of
 * the question: a state can be as sanction-prone as it likes and still have
 * nothing the target would miss.
 */
export function leverageOver(actor: Nation, target: Nation): number {
  return clamp01(target.stats.trade.tradeDependence[actor.id] ?? 0);
}

/** What the actor would be cutting off from itself by cutting off the target. */
export function exposureTo(actor: Nation, target: Nation): number {
  return clamp01(actor.stats.trade.tradeDependence[target.id] ?? 0);
}

/**
 * How far outward a doctrine points, from the posture the nation declares.
 *
 * A defensive state does not reach for force because it wants something; an
 * expansionist one is telling you in the dataset that it does.
 */
const POSTURE_REACH: Readonly<Record<Posture, number>> = {
  defensive: 0,
  balanced: 0.15,
  assertive: 0.4,
  expansionist: 0.7,
};

/**
 * What geography and doctrine say about reaching for force against this
 * particular country.
 *
 * Force had only a penalty and no case for it anywhere: `propensityFor` returned
 * a negative number for every actor against every target on earth, so the whole
 * military ladder was something a government could only ever be talked out of.
 * The two facts that put an army in the field are here instead, and both are
 * authored. Proximity is the first — armies reach their neighbors and reach
 * nobody else cheaply — and a border that is *disputed* is the second, read as
 * a neighbor across a border the actor has drawn one of its own red lines
 * around. Posture is the doctrine itself, and it is the only term that applies
 * at a distance.
 */
function forceReach(actor: Nation, target: Nation): number {
  const adjacent = actor.geo.neighbors.some((neighbor) => (neighbor as string) === (target.id as string));
  const disputed = adjacent && holdsTerritorialLine(actor);
  // A missile that reaches the target, or a base the target keeps nearby, is
  // reach that no border and no fleet had to supply.
  const missile = !adjacent && withinMissileReach(actor, target, target.id === US_ID ? usHosts() : []);
  return clamp01((adjacent ? 0.25 : 0) + (disputed ? 0.25 : 0) + (missile ? 0.2 : 0) + POSTURE_REACH[actor.doctrine.posture] * 0.5);
}

/** The countries hosting United States forces, read once: the basing table does not change inside a campaign. */
const US_HOSTS: readonly Pick<Nation, "id" | "geo">[] = ((ids: ReadonlySet<string>) =>
  worldNations.filter((nation) => ids.has(nation.id as string)))(new Set(usHostIds()));
const usHosts = (): readonly Pick<Nation, "id" | "geo">[] => US_HOSTS;

/**
 * What there is to work with inside the target, and whether this actor has a
 * service that could work with it.
 *
 * The covert analogue of leverage, and a different question from the odds: an
 * operation succeeds against a good service and still buys nothing where there
 * is nobody to buy. A bought official, a border that does not hold and a ruling
 * class at each other's throats are what an operation is run through, and all
 * three are authored. Multiplied by the actor's own capability rather than
 * added to it, for the same reason leverage multiplies: an opening nobody can
 * reach is not an opening.
 */
function covertOpening(actor: Nation, target: Nation): number {
  const inside = clamp01(
    target.stats.security.corruptionIndex * 0.4 +
      (1 - target.stats.security.borderControl) * 0.3 +
      target.stats.politics.factionalism * 0.3,
  );
  return inside * clamp01(actor.stats.security.intelCapability);
}

/**
 * What this nation's own position says about reaching for this instrument
 * against this target, on the same scale as the agent's other terms.
 *
 * Economic coercion is the case it speaks to most directly: a surplus exporter
 * with a customer that cannot replace it finds sanctions obvious, and an
 * import-dependent state with nothing the target needs finds them a way to hurt
 * itself. Force is proximity, a disputed border and declared posture, less the
 * trade a state does not lightly shoot its way out of. Covert work is what
 * there is to work with inside the target. Diplomacy gets nothing: a démarche
 * costs a government neither goods nor a service, and there is no position
 * that makes it more or less available.
 */
export function propensityFor(instrument: InstrumentId, actor: Nation, target: Nation): number {
  const exposure = exposureTo(actor, target);
  if (instrument === "economic") {
    const propensity = coercionPropensity(actor);
    const leverage = leverageOver(actor, target);
    // Leverage is the multiplier, not an addend: an inclination to sanction a
    // country that would not notice is not an inclination worth acting on.
    return propensity.sanctionProne * leverage - exposure * (1 - propensity.autarkic);
  }
  if (instrument === "military") return forceReach(actor, target) - exposure * 0.5;
  if (instrument === "covert") return covertOpening(actor, target);
  return 0;
}

// --- Whether there is anything to coerce over at all ---

/** The sourced kinds that say a pair has a quarrel; a close or dependent pair names none. */
const QUARREL_KINDS: ReadonlySet<DyadKind> = new Set<DyadKind>(["hostile", "rivalrous", "cool"]);

const pairKey = (a: string, b: string) => (a < b ? `${a}-${b}` : `${b}-${a}`);

const QUARRELS: ReadonlySet<string> = new Set(
  FOUNDING_DYADS.filter((row) => QUARREL_KINDS.has(row.kind)).map((row) => pairKey(row.pair[0], row.pair[1])),
);

/** Why a government would coerce this one, as the record names it. Undefined when the record names nothing. */
export type CoercionCause = "dyad" | "crossing" | "trade-dispute" | "grievance" | "hostile-standing" | "past-war" | "named-interest";

// A relationship this far gone is a quarrel on the record even with no single
// act to name: the edge itself is the grievance. Planning values, set at the
// country file's own "hostile" trust band and above its "low" tension band.
const HOSTILE_TRUST = -0.3;
const HOSTILE_TENSION = 0.5;

/**
 * The grievance or interest on the target's side that coercion would be about.
 *
 * Without one the agent pressed whoever was softest, and a government with no
 * quarrel on file with a country found itself sanctioning it because the odds
 * were good. A state coerces over something: a sourced rivalry, a line the
 * target crossed, a trade measure standing against it, a grudge the record
 * still carries, a relationship already read as hostile, a war the two have
 * fought, or a country its own doctrine names. Read once per target, not per
 * rung.
 */
export function coercionCause(
  campaign: Campaign,
  actor: Nation,
  target: NationId,
  edge: Relationship,
  crossings: readonly RedLineCrossing[],
): CoercionCause | undefined {
  if (QUARRELS.has(pairKey(actor.id as string, target as string))) return "dyad";
  if (crossings.some((crossing) => crossing.by === target)) return "crossing";
  if (grudgeWeight(edge) > 0) return "grievance";
  if (edge.trust <= HOSTILE_TRUST && edge.tension >= HOSTILE_TENSION) return "hostile-standing";
  if (tradeDispute(campaign, actor.id, target)) return "trade-dispute";
  if (foughtBefore(campaign, actor.id, target)) return "past-war";
  if (actor.doctrine.alignmentPull.some((id) => (id as string) === (target as string))) return "named-interest";
  return undefined;
}

/** A trade measure one of the two stands under from the other; only the United States keeps a register of them. */
function tradeDispute(campaign: Campaign, actor: NationId, target: NationId): boolean {
  const home = campaign.founding.nation;
  if (actor !== home && target !== home) return false;
  const other = actor === home ? target : actor;
  return Object.values(campaign.trade.measures).some((measure) => measure.target === other && measure.liftedTurn === undefined);
}

/** A war between the two, whether it is still being fought or has been settled. */
function foughtBefore(campaign: Campaign, a: NationId, b: NationId): boolean {
  const on = (list: readonly NationId[], id: NationId) => list.includes(id);
  return selectConflicts(campaign).some((conflict) => {
    const aggressors = [conflict.aggressor, ...conflict.joined.aggressor];
    const defenders = [conflict.defender, ...conflict.joined.defender];
    return (on(aggressors, a) && on(defenders, b)) || (on(aggressors, b) && on(defenders, a));
  });
}
