import {
  BUDGET_ACCOUNTS,
  BUDGET_ACCOUNT_SPECS,
  accountCap,
  inShutdown,
  projectAppropriation,
  projectBudgetDraft,
  selectBudget,
  selectBudgetOutlook,
  selectBudgetYear,
  type AppropriationProjection,
  type BudgetAccount,
  type BudgetDraftCandidate,
  type BudgetDraftInput,
  type BudgetLine,
  type Campaign,
} from "@admin/engine";
import { authorityFlow, capabilityHorizons, fundedThroughIfCarried, type AuthorityFlow, type CapabilityHorizonRow } from "./draft-consequence";
import { fundedThroughDate } from "./funded-through";

// The budget room's two readings: where the appropriation in force stands,
// and what a drafted book would do. The draft is projected through the
// engine's own draft and floor count on the campaign the screen shows, and the
// candidate it returns is the one the request commits, so the projection the
// President reads is the book Congress is sent.

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
  readonly next: { readonly fiscalYear: number; readonly fundedThrough: string };
};

export function appropriationStatus(campaign: Campaign): AppropriationStatus {
  const appropriation = campaign.congress.appropriation;
  const carried = fundedThroughIfCarried(campaign);
  return {
    fundedThrough: fundedThroughDate(campaign, appropriation.throughTurn),
    weeksLeft: appropriation.throughTurn - campaign.turn,
    onPriorYear: appropriation.onPriorYear,
    struck: appropriation.priorYear.map((account) => BUDGET_ACCOUNT_SPECS[account].name),
    shutdown: inShutdown(campaign),
    next: { fiscalYear: selectBudgetYear(campaign), fundedThrough: carried.date },
  };
}

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

export type BudgetDraftReading =
  | { readonly ok: false; readonly reason: string }
  | {
      readonly ok: true;
      /** The book the request sends: the same object `requestAppropriation` is given. */
      readonly candidate: BudgetDraftCandidate;
      readonly accounts: readonly DraftAccountRow[];
      readonly totals: { readonly inForce: number; readonly draft: number };
      readonly flow: { readonly inForce: AuthorityFlow; readonly draft: AuthorityFlow };
      readonly floor: AppropriationProjection;
      readonly horizons: readonly CapabilityHorizonRow[];
    };

function accountRows(campaign: Campaign, candidate: BudgetDraftCandidate): readonly DraftAccountRow[] {
  const inForce = selectBudget(campaign);
  const lines = new Map(candidate.outlook.lines.map((line) => [line.account, line]));
  return BUDGET_ACCOUNTS.map((account) => {
    const line = lines.get(account);
    return {
      account,
      name: BUDGET_ACCOUNT_SPECS[account].name,
      summary: BUDGET_ACCOUNT_SPECS[account].summary,
      inForce: inForce[account],
      draft: candidate.allocation[account],
      cap: accountCap(campaign, account),
      sustain: line?.sustainShare ?? 0,
      direction: line?.direction ?? "holding",
    };
  });
}

/** What a drafted book would do, or why the engine refuses it, read on the campaign the request will be sent from. */
export function budgetDraftReading(campaign: Campaign, draft: BudgetDraftInput): BudgetDraftReading {
  const result = projectBudgetDraft(campaign, draft);
  if (!result.ok) return result;
  const { candidate } = result;
  return {
    ok: true,
    candidate,
    accounts: accountRows(campaign, candidate),
    totals: { inForce: selectBudgetOutlook(campaign).totalShare, draft: candidate.outlook.totalShare },
    flow: { inForce: authorityFlow(campaign), draft: authorityFlow(campaign, candidate.allocation) },
    floor: projectAppropriation(campaign, candidate),
    horizons: capabilityHorizons(campaign, candidate.allocation),
  };
}
