import { type Campaign, type StateCall } from "@admin/engine";
import type { StateId } from "@admin/world";
export type StateApprovalPoint = {
    readonly turn: number;
    readonly approval: number;
};
export type StateApprovalReading = {
    readonly approval: number;
    /** The state as this week's projected vote would call it. */
    readonly call: StateCall;
    /** One plain line where approval and the call point opposite ways; absent where they agree. */
    readonly divergence?: string;
    /** Weekly, oldest first, from the week this administration took office. */
    readonly history: readonly StateApprovalPoint[];
    readonly historyNote: string;
};
export declare const STATE_APPROVAL_HISTORY_NOTE = "Recorded every week since you took office. There's nothing from before that.";
/**
 * Why a state's approval and its call disagree, or nothing where they agree.
 *
 * `shift` is how far the map already puts this state from the country. When it
 * points the way the call went, the state's own lean is what outweighs the
 * figure; when it does not, the state is following the national vote, which
 * runs on more than approval.
 */
export declare function stateApprovalDivergence(approval: number, call: StateCall, shift: number): string | undefined;
/** A state's approval, its projected call, the line between them, and its weekly record. Undefined for a state the campaign does not carry. */
export declare function stateApprovalReading(campaign: Campaign, id: StateId): StateApprovalReading | undefined;
