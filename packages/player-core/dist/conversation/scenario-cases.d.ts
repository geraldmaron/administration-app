import { type CastScenario } from "@admin/content";
import { type Campaign, type Effect } from "@admin/engine";
/**
 * Whether an authored decision is still open, put off or not.
 *
 * While one is, it is the desk's decision: a later draw does not stage another
 * beside it, or a decision put off would be replaced by the next one drawn and
 * putting it off would be a way to shop for an easier week.
 */
export declare function hasOpenScenarioCase(campaign: Campaign): boolean;
export declare function openScenarioCasts(campaign: Campaign): readonly CastScenario[];
/**
 * What an authored decision's case accepts. `allow-default` is the decision
 * resolved by inaction: handed off unanswered, left to lapse, or withdrawn
 * because what it was about is over.
 */
export declare const SCENARIO_CASE_DISPOSITIONS: readonly ["act", "decline", "defer", "allow-default"];
/**
 * The case's raise and, for an opener, the thread it starts: its place is
 * pinned the week the decision appears, not the week it is answered.
 */
export declare function scenarioRaiseEffects(campaign: Campaign, cast: CastScenario): readonly Effect[];
/** Raises the director's current picks once. An open case, put off or not, or one settled today, blocks another. */
export declare function withScenarioCases(campaign: Campaign, casts: readonly CastScenario[]): Campaign;
export declare function scenarioSettledToday(campaign: Campaign): boolean;
/**
 * Closes every open decision whose subject is over.
 *
 * A frozen case pins the record it was cast against on purpose, so the fire it
 * was about can go out while it waits. Left open it would be hidden from the
 * desk and still block the next draw, which is a desk that never asks again.
 */
export declare function withWithdrawnScenarioCases(campaign: Campaign): Campaign;
/** Decisions that lapsed or were handed off unanswered, as the casts they froze. The lapse still owes them their price. */
export declare function unansweredScenarioCasts(campaign: Campaign): readonly CastScenario[];
