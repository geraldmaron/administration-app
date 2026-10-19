import type { NationId } from "@admin/world";
import { type Campaign, type ConditionKind, type NationCondition } from "./state.js";
import { type EffectPacket } from "./effects.js";
import type { TurnPhase } from "./turn-loop.js";
export { claimOnsetSlots, conditionFlag, conditionId, MAX_NEW_CONDITIONS_PER_TURN, MAX_NEW_HOME_CONDITIONS_PER_TURN, STANDING_ONSET_READS, STANDING_PRESSURE, standingHold, standingPressure, } from "./condition-onset.js";
/**
 * How much of the state is on this file, on one scale.
 *
 * The question is only ever asked of the player's own government about its own
 * country. Every other capital is presumed to be working its own emergencies:
 * their programs are chosen once, by a scorer, from what their statistics
 * recommend, so reading one as a measure of whether that cabinet is paying
 * attention this week would be reading a founding artifact as a decision
 * nobody made.
 */
/**
 * What a signed order that was *not* aimed at this condition's state is worth.
 *
 * Below 1 on purpose, and above the program floor on purpose. It used to be 1:
 * any order at all, on any subject, bought every condition in the country the
 * fully-attended recovery rate, so tightening border controls eased a flood in
 * Michigan. That was the stand-in this module's own comment admitted to. But
 * dropping it to nothing would say a government visibly governing is absent
 * from a crisis it is not personally standing in, which is just as untrue.
 *
 * This is the single largest balance lever in the emergency work: every
 * condition in the game recovers more slowly than it used to unless the
 * administration actually answers the state living through it.
 */
export declare const UNTARGETED_ORDER_ATTENTION = 0.5;
export declare function conditionAttention(campaign: Campaign, condition: NationCondition): number;
export declare function conditionRecoveryRate(attention: number): number;
/**
 * The summed macro pressure everything a nation is living through puts on it.
 *
 * Read by `macroDriftPhase`, which is the only writer of the stats this
 * pressure applies to. A condition states what it is doing to an economy here;
 * it does not do it, and that separation is the whole of Law 8 in code.
 */
export declare function conditionMacroPressure(campaign: Campaign, nation: NationId): {
    readonly growth: number;
    readonly inflation: number;
    readonly unemployment: number;
};
/**
 * The stat paths a kind's `IMPACTS` row actually moves.
 *
 * Derived from the row rather than restated beside it, so the Law 8 test is
 * checking the table that ships instead of a second description of it that
 * could agree while the table does not.
 */
export declare function conditionImpactWrites(kind: ConditionKind): readonly string[];
/**
 * How much of a standing condition's severity its own cause holds up.
 *
 * Below 1 on purpose: a government working the file visibly eases a recession
 * even while the economy is still bad, which is the difference between a
 * mechanic that rewards governing and one that only reports the weather. At 1
 * the recovery rate would be decorative until the cause cleared entirely.
 */
export declare const STANDING_FLOOR_SHARE = 0.7;
/**
 * What a standing condition costs on a week it is merely still true, as a share
 * of what it costs on the week it arrives or deepens.
 *
 * A fifth, because a standing condition runs roughly five to ten times as long
 * as the acute ones every rate in `IMPACTS` was calibrated against. It is the
 * one number here chosen to make a total bill land where the per-week numbers
 * always implied, rather than to hit a target.
 */
export declare const STANDING_PERSIST_SCALE = 0.2;
/**
 * The country's order settling back toward where its institutions hold it.
 *
 * Every writer of the President's reading of order pushed it one way or the
 * other and none pulled it back, so a program's weekly cost, a season of
 * continuing resolutions and a cabinet revolt summed without limit. This pulls
 * the reading back by `STABILITY_REVERSION` of the gap a week toward the order
 * the country's institutions hold: its own regime stability as authored, read
 * on the scale the founding opens on, which is the same resting point the
 * regime itself reverts to (`macroDriftPhase`). Not the regime as it stands
 * this week: conditions knock that down faster than it recovers, and over a
 * term a passive country's regime sank from 0.75 to as low as 0.23, so a pull
 * toward it carried that slide into the President's reading as well. A shock
 * still lands where its writer puts it and fades as the country settles.
 * Filed here, and in the background, because it is the country's own weather
 * rather than something the President did.
 */
export declare function orderSettling(state: Campaign): EffectPacket | undefined;
/**
 * The turn phase: every running condition takes its week out of the country,
 * then exposure gets its draw for what opens next — the country the player
 * governs on one queue, the rest of the world on another. Packets are applied
 * as they are built — impacts are written as absolute stats, so two conditions
 * in one country must each read what the one before it left.
 *
 * The two queues are the point. On one shared queue the home nation's draw was
 * the hundred-and-third number in a sequence whose length was set by how many
 * other capitals happened to be eligible that week, and the world's budget was
 * already spent before the queue reached it in a fifth of all weeks. That made
 * unrest at home zero-sum against the health of fifty countries the player does
 * not govern, so the domestic weather moved when the world moved rather than
 * when the country was governed badly.
 */
export declare const conditionPhase: TurnPhase;
