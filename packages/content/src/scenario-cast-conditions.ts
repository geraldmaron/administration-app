import {
  conditionFamily,
  selectActiveConditions,
  selectGovernor,
  selectNation,
  selectPerson,
  type Campaign,
  type NationCondition,
} from "@admin/engine";
import type { NationId, StateId } from "@admin/world";
import { flagSetFlag } from "./scenario-deed-flags.js";
import type { ScenarioCondition } from "./scenario-conditions.js";
import type { ScenarioSelectorLike } from "./scenario-cast.js";

// The three things content could not read until now: what time of year it is,
// what the administration ran on, and which running condition a scenario is
// actually about.
//
// A module of its own rather than three more branches in scenario-cast.ts,
// which sits at the size line: each of these needs its own arithmetic (the
// calendar needs the hemisphere, the ticket needs the founding record, the bind
// needs the whole active-condition list ranked), and the bind is read by the
// locus resolver and the text renderer as well as by liveness, so it could not
// have stayed private to the caster anyway.

// --- The calendar ---

export const SEASONS = ["winter", "spring", "summer", "fall"] as const;
export type Season = (typeof SEASONS)[number];

// One-based calendar months to the northern season. December through February is
// winter, and the year wraps, which is why this is a table rather than a
// division: (month % 12) / 3 would cut December away from January.
const NORTHERN_SEASON: readonly Season[] = [
  "winter", // January
  "winter",
  "spring",
  "spring",
  "spring",
  "summer",
  "summer",
  "summer",
  "fall",
  "fall",
  "fall",
  "winter", // December
];

/**
 * The season a month is, on the ground the scenario is standing on.
 *
 * Flipped below the equator, because a hurricane season and a heating crisis
 * are opposite halves of the same year in Santiago and in Chicago, and a
 * scenario that gated on "winter" without asking whose winter would open a
 * fuel-poverty week in a January heatwave.
 */
export function seasonAt(month: number, lat: number): Season {
  const northern = NORTHERN_SEASON[Math.min(11, Math.max(0, month - 1))]!;
  if (lat >= 0) return northern;
  const index = SEASONS.indexOf(northern);
  return SEASONS[(index + 2) % 4]!;
}

/** The latitude the scenario's own ground sits at, for a season read. */
function groundLatitude(campaign: Campaign, ground: NationId): number {
  return selectNation(campaign, ground)?.base.geo.lat ?? 0;
}

/**
 * Whether the year is where the scenario says it is.
 *
 * A gate that names neither a month nor a season asks nothing, and answering it
 * `true` would open the scenario every week of the campaign — so it is refused
 * here and refused by the audit, which is what makes the dead gate visible to
 * the author rather than only to a player who sees a July blizzard.
 */
export function calendarMet(
  campaign: Campaign,
  condition: Extract<ScenarioCondition, { kind: "calendar" }>,
  ground: NationId,
): boolean {
  if (condition.months === undefined && condition.season === undefined) return false;
  const month = campaign.calendar.month;
  if (condition.months !== undefined && !condition.months.includes(month)) return false;
  if (condition.season !== undefined && seasonAt(month, groundLatitude(campaign, ground)) !== condition.season) {
    return false;
  }
  return true;
}

// --- The ticket ---

/**
 * Whether this is the administration the scenario is written about.
 *
 * Every field is read off the founding record rather than off live alignments,
 * because what a President ran on does not change when they govern differently
 * — that gap is the whole reason a writer wants this gate.
 */
export function ticketMet(
  campaign: Campaign,
  condition: Extract<ScenarioCondition, { kind: "ticket" }>,
): boolean {
  const { founding } = campaign;
  if (condition.party !== undefined && campaign.congress.administrationParty !== condition.party) return false;
  if (condition.background !== undefined && founding.leader.backgroundId !== condition.background) return false;
  if (condition.route !== undefined && founding.leader.routeId !== condition.route) return false;
  if (condition.plank !== undefined && !(founding.platform ?? []).some((plank) => String(plank) === condition.plank)) return false;
  return true;
}

// --- The bind ---

/** The kinds a scenario's own `conditionActive` gates name, or none, meaning any kind. */
function boundKinds(def: ScenarioSelectorLike): ReadonlySet<string> {
  const named = def.conditions.flatMap((condition) =>
    condition.kind === "conditionActive" && condition.condition !== undefined ? [condition.condition] : [],
  );
  return new Set(named);
}

/**
 * The running condition a bound scenario is about.
 *
 * The worst one first, so a week about the wildfires is about the fire that is
 * actually burning worst; ties break on the record's own id, which carries the
 * kind, the nation and the turn it opened, so the pick is the same on every
 * machine and the same on every read of the same board. That determinism is the
 * whole contract — the bind is derived at cast time and pinned onto the case,
 * and a pick that drifted between the raise and the display would show the
 * player a state that is not the one the decision was written against.
 *
 * `undefined` where nothing matches, which leaves the scenario unbound rather
 * than bound to the wrong place.
 */
export function boundCondition(
  campaign: Campaign,
  def: ScenarioSelectorLike,
  ground: NationId,
): NationCondition | undefined {
  const kinds = boundKinds(def);
  const matching = selectActiveConditions(campaign).filter(
    (condition) => condition.nation === ground && (kinds.size === 0 || kinds.has(condition.kind)),
  );
  // A record that names a state first: a bound week is about a place, and a
  // nation-wide record of the same kind can only lend it stand-in words.
  const placed = (condition: NationCondition) => (condition.state === undefined ? 1 : 0);
  return [...matching].sort((a, b) => placed(a) - placed(b) || b.severity - a.severity || a.id.localeCompare(b.id))[0];
}

/**
 * The state a bound scenario is happening in, where the bound condition names
 * one.
 *
 * A nation-scoped condition names no state — a recession is not in Ohio — so
 * this answers `undefined` and the locus resolver falls back to placing the
 * event the way it always has.
 */
export function boundState(
  campaign: Campaign,
  def: ScenarioSelectorLike,
  ground: NationId,
): StateId | undefined {
  return boundCondition(campaign, def, ground)?.state;
}

/**
 * Whether the condition a bound scenario was cast against is still running.
 *
 * Read again at display and again at commit, because a decision put off for a
 * fortnight can outlive its fire, and a document that asks the President what
 * to do about a fire that is out is worse than no document. The pin is what
 * makes this checkable: the case remembers which record it was raised against,
 * and this asks the board whether that record is still active.
 */
export function boundConditionLive(campaign: Campaign, conditionId: string): boolean {
  return selectActiveConditions(campaign).some((condition) => condition.id === conditionId);
}

/**
 * The government bearing an acute condition, for the `stricken` cast.
 *
 * Trouble at home had exactly one cast — no counterpart at all — so a week
 * about a disaster could name nobody on the other side of it. This binds the
 * player's own government when its own country is under an acute condition, and
 * nothing when it is not, which leaves a disaster scenario unreachable on a
 * quiet board rather than cast onto a country with no disaster in it.
 *
 * Acute rather than any kind: a recession is a condition the government is
 * managing, not a place that has been struck, and `stricken` is the cast that
 * exists so the prose can name a governor and a state.
 */
export function strickenNation(campaign: Campaign): NationId | undefined {
  const home = campaign.founding.nation;
  const struck = selectActiveConditions(campaign).some(
    (condition) => condition.nation === home && conditionFamily(condition.kind) === "acute",
  );
  return struck ? home : undefined;
}

// --- The governor of a bound state ---

/** The seated governor's name for a state, or undefined for an unseated seat. */
export function governorName(campaign: Campaign, state: StateId): string | undefined {
  const standing = selectGovernor(campaign, state);
  if (!standing) return undefined;
  return selectPerson(campaign, standing.person)?.base.name;
}

// --- How long ago the deed was ---

const NUMBER_WORDS: readonly string[] = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
];

function spelled(count: number): string {
  return NUMBER_WORDS[count] ?? String(count);
}

/** Weeks in a month, for prose. 52/12, so the months read out to a year rather than to 48 weeks. */
const WEEKS_PER_MONTH = 52 / 12;

/**
 * How long ago something happened, in the words a person would use.
 *
 * Weeks while the memory is warm, months once nobody would count weeks any
 * more, years past that. Spelled out because this renders into prose, where the
 * project's register puts figures in particulars and words in sentences.
 */
export function elapsedPhrase(turns: number): string {
  if (turns <= 0) return "this week";
  if (turns === 1) return "last week";
  if (turns < 8) return `${spelled(turns)} weeks ago`;
  if (turns < 52) return `${spelled(Math.max(2, Math.round(turns / WEEKS_PER_MONTH)))} months ago`;
  const years = Math.round(turns / 52);
  return years <= 1 ? "a year ago" : `${spelled(years)} years ago`;
}

/**
 * The turn a flag was stamped, off the marker every authored `sets` leaves
 * beside itself.
 *
 * Walks back from today rather than forward from the oath so a recent deed is
 * found in a handful of reads, and the walk is bounded by the campaign's own
 * length, which the term limit bounds. A flag with no marker — one set before
 * markers existed, or by something that does not stamp one — has no date, and
 * the caller says so rather than inventing one.
 */
export function markerTurnOf(campaign: Campaign, flag: string): number | undefined {
  for (let turn = campaign.turn; turn >= 0; turn -= 1) {
    if (campaign.player.flags[flagSetFlag(flag, turn)] === true) return turn;
  }
  return undefined;
}

/**
 * How long ago the deed this scenario is waiting on was done.
 *
 * The gate is the scenario's first `flag` condition asserting a flag is set,
 * the same one the `flagAge` boost ripens on: a follow-up waiting on two deeds
 * is about the one its author put first. `undefined` when there is no such gate
 * or the flag carries no marker, which is what the audit refuses to publish —
 * a token with nothing to read must not silently render a lie about when.
 */
export function sinceDeedPhrase(campaign: Campaign, def: ScenarioSelectorLike): string | undefined {
  const gate = def.conditions.find((condition) => condition.kind === "flag" && condition.is);
  if (gate === undefined || gate.kind !== "flag") return undefined;
  if ((campaign.player.flags[gate.flag] ?? false) !== true) return undefined;
  const stamped = markerTurnOf(campaign, gate.flag);
  return stamped === undefined ? undefined : elapsedPhrase(campaign.turn - stamped);
}
