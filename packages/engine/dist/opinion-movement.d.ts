import { type OpinionDriver } from "./opinion-drivers.js";
import type { ActionRecord } from "./state.js";
/**
 * The roads approval movement arrives by: the public's weekly revision toward
 * what it can see, the President's own decisions, the pledges they are held
 * to, and the world hitting a judgment directly (a disaster's weekly bill, a
 * scandal breaking).
 */
export type ApprovalPath = "drift" | "decisions" | "pledges" | "world";
export type ApprovalMovement = {
    /** Each judgment's share of the weighted movement; all zero when nothing moved. */
    readonly byDriver: Readonly<Record<OpinionDriver, number>>;
    /** The same movement by the road it came in on. */
    readonly byPath: Readonly<Record<ApprovalPath, number>>;
    /** The movement itself, in points of raw approval at resting weights. */
    readonly total: number;
};
/** The road one ledger entry's own mood movement came in on. */
export declare function approvalPathOf(entry: ActionRecord): ApprovalPath;
/**
 * How much of a stretch of the ledger's approval movement each judgment
 * carried, and by which road.
 *
 * Read off the mood diff every packet already leaves on its ledger entry, each
 * driver's move priced at its resting weight and counted whichever way it went,
 * because the question is what moves the number, not where it ended. Resting
 * rather than salient weights so two campaigns can be compared on one scale.
 */
export declare function approvalMovement(ledger: readonly ActionRecord[], fromTurn: number): ApprovalMovement;
