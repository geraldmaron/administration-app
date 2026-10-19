import { type Campaign, type NationCondition } from "@admin/engine";
import type { NationId, StateId } from "@admin/world";
import type { ScenarioCondition } from "./scenario-conditions.js";
import type { ScenarioSelectorLike } from "./scenario-cast.js";
export declare const SEASONS: readonly ["winter", "spring", "summer", "fall"];
export type Season = (typeof SEASONS)[number];
/**
 * The season a month is, on the ground the scenario is standing on.
 *
 * Flipped below the equator, because a hurricane season and a heating crisis
 * are opposite halves of the same year in Santiago and in Chicago, and a
 * scenario that gated on "winter" without asking whose winter would open a
 * fuel-poverty week in a January heatwave.
 */
export declare function seasonAt(month: number, lat: number): Season;
/**
 * Whether the year is where the scenario says it is.
 *
 * A gate that names neither a month nor a season asks nothing, and answering it
 * `true` would open the scenario every week of the campaign — so it is refused
 * here and refused by the audit, which is what makes the dead gate visible to
 * the author rather than only to a player who sees a July blizzard.
 */
export declare function calendarMet(campaign: Campaign, condition: Extract<ScenarioCondition, {
    kind: "calendar";
}>, ground: NationId): boolean;
/**
 * Whether this is the administration the scenario is written about.
 *
 * Every field is read off the founding record rather than off live alignments,
 * because what a President ran on does not change when they govern differently
 * — that gap is the whole reason a writer wants this gate.
 */
export declare function ticketMet(campaign: Campaign, condition: Extract<ScenarioCondition, {
    kind: "ticket";
}>): boolean;
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
export declare function boundCondition(campaign: Campaign, def: ScenarioSelectorLike, ground: NationId): NationCondition | undefined;
/**
 * The state a bound scenario is happening in, where the bound condition names
 * one.
 *
 * A nation-scoped condition names no state — a recession is not in Ohio — so
 * this answers `undefined` and the locus resolver falls back to placing the
 * event the way it always has.
 */
export declare function boundState(campaign: Campaign, def: ScenarioSelectorLike, ground: NationId): StateId | undefined;
/**
 * Whether the condition a bound scenario was cast against is still running.
 *
 * Read again at display and again at commit, because a decision put off for a
 * fortnight can outlive its fire, and a document that asks the President what
 * to do about a fire that is out is worse than no document. The pin is what
 * makes this checkable: the case remembers which record it was raised against,
 * and this asks the board whether that record is still active.
 */
export declare function boundConditionLive(campaign: Campaign, conditionId: string): boolean;
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
export declare function strickenNation(campaign: Campaign): NationId | undefined;
/** The seated governor's name for a state, or undefined for an unseated seat. */
export declare function governorName(campaign: Campaign, state: StateId): string | undefined;
/**
 * How long ago something happened, in the words a person would use.
 *
 * Weeks while the memory is warm, months once nobody would count weeks any
 * more, years past that. Spelled out because this renders into prose, where the
 * project's register puts figures in particulars and words in sentences.
 */
export declare function elapsedPhrase(turns: number): string;
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
export declare function markerTurnOf(campaign: Campaign, flag: string): number | undefined;
/**
 * How long ago the deed this scenario is waiting on was done.
 *
 * The gate is the scenario's first `flag` condition asserting a flag is set,
 * the same one the `flagAge` boost ripens on: a follow-up waiting on two deeds
 * is about the one its author put first. `undefined` when there is no such gate
 * or the flag carries no marker, which is what the audit refuses to publish —
 * a token with nothing to read must not silently render a lie about when.
 */
export declare function sinceDeedPhrase(campaign: Campaign, def: ScenarioSelectorLike): string | undefined;
