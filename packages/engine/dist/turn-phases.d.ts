import type { Charter } from "@admin/world";
import { type TurnPhase, type TurnPhases } from "./turn-loop.js";
export type NamedTurnPhase = {
    /** The phase's own export name, so a reader of the sequence can say which slot moved. */
    readonly id: string;
    readonly run: TurnPhase;
};
/**
 * Order is the rule, not the ingredients. The world moves first — nations act,
 * then operators outside any government's writ, then the wars and the
 * conditions the country is already living through take their week, then the
 * player's own cabinet answers for it, then the standing program does
 * another week's work — the player's, then every other government's — then old
 * grievances fade by a tick. Removal reads last,
 * so the pressure it computes is pressure after everything that happened this
 * week rather than before it.
 *
 * Wars and conditions run before the cabinet rather than after because they
 * are the week the cabinet is answering for: a defense minister's week is set
 * by the front, not the other way round.
 *
 * A named list rather than a concatenation, so the sequence is a value the
 * runner walks one step at a time and a reader can name the slot it is looking
 * at. The runner applies each step's packets before planning the next, which
 * is what makes every "after X" below a real read of X's week rather than a
 * statement of intent.
 */
export declare function campaignPhaseSequence(charter: Charter): readonly NamedTurnPhase[];
export declare function campaignTurnPhases(charter: Charter, layout?: boolean): TurnPhases;
/** The flat week, or the same runs cut into office days when `layout` is set. */
export declare function turnPhasesFrom(sequence: readonly NamedTurnPhase[], layout: boolean): TurnPhases;
/**
 * The week's phases cut into the seven office days, in the sequence's own
 * order. Day 2 is empty because the second actor still runs inside
 * `npcActionPhase`, which sits on day 1 until that phase is split.
 * The flat list is what a week runs today. The days are what the clock will
 * run, and they are not switched on here.
 */
export declare function weekGroups(sequence: readonly NamedTurnPhase[]): readonly (readonly NamedTurnPhase[])[];
/** Today's flat week. Throws if the office-day cut dropped or reordered a phase. */
export declare function simulateRuns(sequence: readonly NamedTurnPhase[]): readonly TurnPhase[];
