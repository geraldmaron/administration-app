import { type AppropriationProjection, type BudgetAccount, type BudgetDraftCandidate, type BudgetDraftInput, type BudgetLine, type Campaign } from "@admin/engine";
import { type AuthorityFlow, type CapabilityHorizonRow } from "./draft-consequence";
export type AppropriationStatus = {
    /** The date the government is funded through. */
    readonly fundedThrough: string;
    /** Whole weeks of funding left; zero or less once it has lapsed. */
    readonly weeksLeft: number;
    /** True when the last request failed and the government runs on the prior year's book. */
    readonly onPriorYear: boolean;
    /** Lines the floor struck from the last book, left at last year's rates. */
    readonly struck: readonly string[];
    readonly shutdown: boolean;
    /** The fiscal year a book enacted now pays for, and the date a passed book would fund through. */
    readonly next: {
        readonly fiscalYear: number;
        readonly fundedThrough: string;
    };
};
export declare function appropriationStatus(campaign: Campaign): AppropriationStatus;
/** One account in the editor: what is in force, what is drafted, and the most Congress allows. Shares of national income a year. */
export type DraftAccountRow = {
    readonly account: BudgetAccount;
    readonly name: string;
    readonly summary: string;
    readonly inForce: number;
    readonly draft: number;
    readonly cap: number;
    /** The share that holds the account exactly where it is. */
    readonly sustain: number;
    readonly direction: BudgetLine["direction"];
};
export type BudgetDraftReading = {
    readonly ok: false;
    readonly reason: string;
} | {
    readonly ok: true;
    /** The book the request sends: the same object `requestAppropriation` is given. */
    readonly candidate: BudgetDraftCandidate;
    readonly accounts: readonly DraftAccountRow[];
    readonly totals: {
        readonly inForce: number;
        readonly draft: number;
    };
    readonly flow: {
        readonly inForce: AuthorityFlow;
        readonly draft: AuthorityFlow;
    };
    readonly floor: AppropriationProjection;
    readonly horizons: readonly CapabilityHorizonRow[];
};
/** What a drafted book would do, or why the engine refuses it, read on the campaign the request will be sent from. */
export declare function budgetDraftReading(campaign: Campaign, draft: BudgetDraftInput): BudgetDraftReading;
