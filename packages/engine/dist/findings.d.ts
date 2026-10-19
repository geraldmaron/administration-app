import type { NationId } from "@admin/world";
import type { Campaign, GameDate } from "./state.js";
import type { Effect, EffectPacket } from "./effects.js";
export type FindingId = string;
export type FindingState = "written" | "contemporaneous" | "unwritten";
/** Who was told, which is a separate decision from what was authorized. */
export type NotificationTier = "full-committees" | "gang-of-eight" | "withheld";
export type CovertFinding = {
    readonly id: FindingId;
    readonly objective: string;
    readonly target: NationId;
    readonly signedDay: number;
    readonly signedDate: GameDate;
    readonly state: FindingState;
    readonly notification: NotificationTier;
    /** Required when prior notice was withheld: the statement of reasons the President owes. */
    readonly reasonsWithheld?: string;
    readonly notifiedDay?: number;
    /** Acts taken under this finding. A finding nothing was done under is still a decision. */
    readonly activities: number;
    readonly closedDay?: number;
};
export type UnfoundedAction = {
    readonly id: string;
    readonly target: NationId;
    readonly rung: number;
    readonly turn: number;
    readonly description: string;
};
export type FindingsState = {
    readonly findings: readonly CovertFinding[];
    /** Covert acts taken with no finding standing over them. Kept forever. */
    readonly unfounded: readonly UnfoundedAction[];
};
export declare function foundingFindings(): FindingsState;
export declare function selectFindings(campaign: Campaign): readonly CovertFinding[];
/** The finding, if any, that would cover a covert act against this country today. */
export declare function standingFinding(campaign: Campaign, target: NationId): CovertFinding | undefined;
export declare function selectUnfoundedActions(campaign: Campaign): readonly UnfoundedAction[];
/**
 * Why this cannot be signed, or nothing.
 *
 * Deliberately a text check on the objective the player wrote rather than a
 * hidden flag on a scenario: the objective is the thing the President is
 * signing, and if it says the operation is aimed at an American audience then
 * that is what the finding would say, whatever else was meant by it.
 */
export declare function findingRefusal(campaign: Campaign, objective: string, target: NationId): string | undefined;
export type FindingResult = {
    readonly ok: true;
    readonly packet: EffectPacket;
} | {
    readonly ok: false;
    readonly reason: string;
};
/**
 * Sign a finding.
 *
 * An objective that cannot lawfully be authorized is not refused silently: the
 * packet records the attempt, because a president asking counsel to paper an
 * unlawful operation is an event even when — especially when — the answer was
 * no.
 */
export declare function signFinding(campaign: Campaign, objective: string, target: NationId, state: FindingState, notification: NotificationTier, reasonsWithheld?: string): FindingResult;
/** Tell the committees about a finding whose notice was withheld. */
export declare function notifyCommittees(campaign: Campaign, id: FindingId, statement: string): FindingResult;
/** Close a finding out. An operation nobody has ended is an operation still running. */
export declare function closeFinding(campaign: Campaign, id: FindingId): FindingResult;
/**
 * What a covert rung leaves on the paper trail.
 *
 * Written the way the war powers record is: the act is permitted, the record is
 * permanent, and the compounding happens because the record is read later
 * rather than because a counter was invented for it. An act covered by a
 * standing finding counts against that finding; an act with nothing standing
 * over it is an operation the President ordered without authorizing, which is
 * the fact the committees eventually ask about.
 *
 * Applied to the player's own government and nobody else's, for the reason the
 * war powers record is: the campaign carries one presidency.
 */
export declare function recordCovertAction(campaign: Campaign, actor: NationId, target: NationId, rung: number, description: string): readonly Effect[];
