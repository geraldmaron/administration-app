import type { ChamberVote, Campaign } from "./state.js";
import { type CongressResult } from "./congress.js";
import { type BudgetDraftCandidate } from "./budget-draft.js";
export type OmnibusProjection = {
    /** The book as negotiated: every change the President asked for, halved. */
    readonly conceded: BudgetDraftCandidate;
    readonly votes: readonly ChamberVote[];
    readonly carries: boolean;
};
/**
 * The count on the negotiated book, one vote per chamber: the minority votes at
 * the share it gives a measure its own leaders wrote, and the President's side
 * reads the room as it stands, so a President the room has turned on can still
 * lose it.
 */
export declare function projectOmnibus(campaign: Campaign, candidate: BudgetDraftCandidate): OmnibusProjection;
/** Pass the negotiated book, or refuse and leave the government to the stopgap. */
export declare function requestOmnibus(campaign: Campaign, candidate: BudgetDraftCandidate): CongressResult;
