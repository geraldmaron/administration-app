import type { Appropriation, Campaign, ChamberVote, GameDate } from "./state.js";
import { type CongressResult } from "./congress.js";
import { type BudgetAccount } from "./budget.js";
import { sessionDayDate } from "./congressional-session.js";
import { countRescission, type DeferralPurpose } from "./impoundment.js";
import { type BudgetDraftCandidate } from "./budget-draft.js";
/**
 * The appropriation a new administration inherits on the day of the oath:
 * the book its predecessor's Congress passed for the fiscal year already
 * running, which lapses on that year's September 30. An oath in January
 * therefore inherits eight months of money, and the first budget it owes is
 * the next year's, due before October.
 */
export declare function openingAppropriation(foundingDate: GameDate, turn: number): Appropriation;
/** One account's own passage through both chambers. */
export type AccountVote = {
    readonly account: BudgetAccount;
    readonly votes: readonly ChamberVote[];
    readonly carried: boolean;
};
export type AppropriationProjection = {
    /** The count on the book as a whole, at no appeal: how the chambers stand. */
    readonly votes: readonly ChamberVote[];
    /** One count per account the request actually changes. Empty when nothing is drafted. */
    readonly accounts: readonly AccountVote[];
    /** True when nothing the President asked for was refused. */
    readonly wouldPass: boolean;
    /** True when a book passes at all — at least one changed account carried. */
    readonly wouldEnact: boolean;
    /** The accounts the floor would strike out, left at prior-year rates. */
    readonly refused: readonly BudgetAccount[];
    readonly reasoning: string;
};
/**
 * The whip count on a budget, line by line.
 *
 * Appropriations originate in the House and are the one vote where the
 * administration's own program is on the floor rather than a question about the
 * world, so there is no threat to rally anyone — it is disposition and what the
 * Hill makes of each line, which is why a president who has spent their
 * standing governs on last year's numbers.
 *
 * A regular appropriation is ordinary legislation. The House needs a majority.
 * The Senate needs sixty. Revenue, tax and the debt limit stay on reconciliation.
 *
 * Only the accounts a request actually *changes* are voted. An account nobody
 * proposed to move is already law, and putting it back on the floor every year
 * would let the Hill strike out a line the President never touched.
 */
export declare function projectAppropriation(campaign: Campaign, candidate?: BudgetDraftCandidate): AppropriationProjection;
/**
 * Take a drafted appropriation to the Hill.
 *
 * The allocation itself is still written by `enactBudget` in budget.ts, which
 * stays the one place a budget is set; this is the vote in front of it, and it
 * composes that packet rather than building a second one.
 *
 * Three outcomes, and they are genuinely different facts:
 *
 *   - Every line carries. A new book is enacted and the clock resets.
 *   - Some lines carry. A book still passed, so the government is funded and
 *     `throughTurn` still moves — a struck-out line is not a funding lapse. The
 *     accounts the floor refused are simply left at the rate they were already
 *     running at, and named in `appropriation.priorYear` so every surface can
 *     say which ones.
 *   - Nothing carries. There is no new book at all: `onPriorYear` goes true and
 *     `throughTurn` does not move, which is what leaves the shutdown clock
 *     running. A refused president is left governing on the appropriation they
 *     already had — the honest outcome, not a government that stops.
 *
 * The whole-book facts and the per-account ones therefore never contradict:
 * `throughTurn` and `onPriorYear` are about the book, `priorYear` is about the
 * lines inside a book that did pass, and it is empty whenever `onPriorYear` is
 * true because there is no book for a line to be missing from.
 */
export declare function requestAppropriation(campaign: Campaign, candidate: BudgetDraftCandidate): CongressResult;
export type WithholdingRequest = {
    readonly account: BudgetAccount;
    /** The fraction of what the account is appropriated, and not already held, that is asked for: above 0, up to 1. */
    readonly portion: number;
};
export type DeferralRequest = WithholdingRequest & {
    readonly purpose: DeferralPurpose;
    /** How long the money is held from today. It cannot run past the end of the fiscal year. */
    readonly days: number;
};
export type RescissionProjection = {
    readonly share: number;
    /** The date the 45th day of continuous session falls on, when the money must be released absent a bill. */
    readonly windowEnds: ReturnType<typeof sessionDayDate>;
    /** The window ends after the fiscal year does, so the money expires before it could be released. */
    readonly pocket: boolean;
    readonly votes: ReturnType<typeof countRescission>;
};
export declare function projectRescission(campaign: Campaign, request: WithholdingRequest): RescissionProjection;
/**
 * Ask Congress to cancel part of an account's appropriation (2 U.S.C. 683).
 *
 * The money is held while Congress considers the bill, and released if it has
 * not completed action within 45 days of continuous session. A message sent
 * so late that those days end after the fiscal year does is a pocket
 * rescission: allowed to proceed, but contested, and priced.
 */
export declare function proposeRescission(campaign: Campaign, request: WithholdingRequest): CongressResult;
/**
 * Hold part of an account's appropriation for a period inside the fiscal year
 * (2 U.S.C. 684). Only a contingency or savings from efficiency is a lawful
 * purpose; a deferral for policy reasons is sent anyway if the President
 * chooses, and the Comptroller General reports it as unlawful and may sue.
 */
export declare function proposeDeferral(campaign: Campaign, request: DeferralRequest): CongressResult;
