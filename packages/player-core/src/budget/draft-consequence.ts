import { fundedThroughDate } from "./funded-through";
import {
  ARREARS_STABILITY_COST,
  BUDGET_ACCOUNT_SPECS,
  CAPABILITY_LABELS,
  CAPABILITY_MILESTONES,
  POLICY_TURN_SHARE,
  authorityCeiling,
  inShutdown,
  nextMilestone,
  selectBudget,
  selectBudgetOutlook,
  selectBudgetYear,
  selectFiscalOutlook,
  selectFiscalYearEndTurn,
  selectSolvency,
  weeklyApportionment,
  type BudgetAccount,
  type BudgetAllocation,
  type Campaign,
  type StatecraftAccount,
} from "@admin/engine";

// What a drafted appropriation does before it is sent, read through the same
// functions the week then runs, so the Budget can draw "in force" and "your
// draft" side by side without a second calculation that could disagree.
//
// The draft moves the administration's own book, the budget authority, and
// the capability the accounts buy. It does not move the federal deficit: the
// national statement (`selectFiscalStatement`) reads the fiscal program, the
// laws and the economy, never `player.budget`, which is why nothing here
// claims a deficit change.

/** The administration's book for one allocation, a week at a time. USD millions. */
export type AuthorityFlow = {
  /** Authority held now. */
  readonly held: number;
  /** The most authority an administration may hold at once (`authorityCeiling`). */
  readonly ceiling: number;
  /**
   * The most the week's apportionment releases; nothing while the government
   * is closed. It only tops the stock up to `ceiling`, so a President already
   * holding the ceiling gets back what was spent and no more.
   */
  readonly release: number;
  /** True when the stock is already at the ceiling: a week's surplus is not banked. */
  readonly atCeiling: boolean;
  /** What the five accounts draw above their sustainment line this week; negative is money no longer spent. */
  readonly accountsDraw: number;
  /** What the standing commitments draw this week; the draft does not change it. */
  readonly commitmentsDraw: number;
  /** Release less both draws: positive is room the week does not use, negative is how far the stock falls. */
  readonly net: number;
  /** Weeks the stock carries the draw (`selectSolvency`); Infinity when the release covers it. */
  readonly turnsFunded: number;
  /** True when the authority runs out before the year the appropriation is written for. */
  readonly underfunded: boolean;
  /** A year of the draw, the term the national accounts are in. */
  readonly annualClaim: number;
  /** That year as a share of the federal discretionary outlay line. */
  readonly shareOfDiscretionary: number;
  /**
   * About what one unpaid week costs in stability once the stock is spent,
   * priced the way `budgetPhase` prices arrears. Once the stock is gone a week
   * has only its own release to pay with, so the unpaid part is the weekly
   * shortfall (`-net`), never more than the accounts draw itself. Zero when the
   * release covers the week. Other acts that week would add to it.
   */
  readonly arrearsPerWeek: number;
  /** True while appropriations have lapsed: nothing is released, built or owed. */
  readonly lapsed: boolean;
};

export function authorityFlow(campaign: Campaign, allocation: BudgetAllocation = selectBudget(campaign)): AuthorityFlow {
  const solvency = selectSolvency(campaign, allocation);
  const outlook = selectFiscalOutlook(campaign, allocation);
  const lapsed = inShutdown(campaign);
  const release = lapsed ? 0 : weeklyApportionment(campaign);
  const gdp = selectBudgetOutlook(campaign, allocation).gdp;
  const net = release - solvency.weeklyDraw;
  const annualShortfall = Math.min(Math.max(0, solvency.appropriationCost), Math.max(0, -net)) / POLICY_TURN_SHARE;
  return {
    held: campaign.player.metrics.treasury,
    ceiling: authorityCeiling(campaign),
    release,
    atCeiling: campaign.player.metrics.treasury >= authorityCeiling(campaign),
    accountsDraw: solvency.appropriationCost,
    commitmentsDraw: solvency.commitmentCost,
    net,
    turnsFunded: solvency.turnsFunded,
    underfunded: solvency.underfunded,
    annualClaim: outlook.annualDraw,
    shareOfDiscretionary: outlook.shareOfDiscretionary,
    arrearsPerWeek: gdp > 0 ? Math.round((annualShortfall / gdp) * ARREARS_STABILITY_COST * 1000) / 1000 : 0,
    lapsed,
  };
}

/** The next rung one statecraft account is climbing toward, at the budget in force and at the draft. */
export type CapabilityHorizonRow = {
  readonly account: StatecraftAccount;
  readonly accountName: string;
  /** The rung's own name, e.g. "Recall Ambassador". */
  readonly milestone: string;
  readonly rung: number;
  /** The figure the rung is gated on, in words ("naval strength"). */
  readonly capability: string;
  readonly current: number;
  readonly required: number;
  /** Weeks to open it at the budget in force; undefined when the account is not climbing. */
  readonly nowTurns?: number;
  /** The same at the draft. */
  readonly draftTurns?: number;
};

const LADDER_ACCOUNTS: readonly StatecraftAccount[] = [...new Set(CAPABILITY_MILESTONES.map((milestone) => milestone.account))];

/**
 * One row per account with a ladder. An account whose every rung is already
 * open has no row; the caller says so from `laddersOpen`.
 */
export function capabilityHorizons(campaign: Campaign, draft: BudgetAllocation): readonly CapabilityHorizonRow[] {
  const standing = selectBudget(campaign);
  return LADDER_ACCOUNTS.flatMap((account): CapabilityHorizonRow[] => {
    const now = nextMilestone(campaign, account, standing);
    const drafted = nextMilestone(campaign, account, draft);
    if (!now) return [];
    return [
      {
        account,
        accountName: BUDGET_ACCOUNT_SPECS[account].name,
        milestone: now.name,
        rung: now.rung,
        capability: CAPABILITY_LABELS[now.path],
        current: now.current,
        required: now.required,
        ...(now.turns !== undefined ? { nowTurns: now.turns } : {}),
        ...(drafted?.turns !== undefined ? { draftTurns: drafted.turns } : {}),
      },
    ];
  });
}

/** The accounts whose ladders have no rung left to buy. */
export function laddersOpen(campaign: Campaign): readonly BudgetAccount[] {
  return LADDER_ACCOUNTS.filter((account) => !nextMilestone(campaign, account));
}

/**
 * Where the money would run to if the draft carried: a book that passes pays
 * for the budget year (`requestAppropriation` moves `throughTurn` to that
 * year's end, never back).
 */
export function fundedThroughIfCarried(campaign: Campaign): { readonly turn: number; readonly date: string; readonly fiscalYear: number } {
  const fiscalYear = selectBudgetYear(campaign);
  const turn = Math.max(campaign.congress.appropriation.throughTurn, selectFiscalYearEndTurn(campaign, fiscalYear));
  return { turn, date: fundedThroughDate(campaign, turn), fiscalYear };
}
