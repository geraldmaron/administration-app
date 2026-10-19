import type { Campaign } from "./state.js";
import type { EffectPacket } from "./effects.js";
import {
  ACCOUNT_CAP,
  BUDGET_ACCOUNTS,
  BUDGET_ACCOUNT_SPECS,
  accountCap,
  selectBudget,
  selectBudgetOutlook,
  type BudgetAccount,
  type BudgetAllocation,
  type BudgetOutlook,
} from "./budget.js";

const round4 = (value: number) => Math.round(value * 10_000) / 10_000 + 0;

// Voting an appropriation, as opposed to living under one.
//
// Split out of budget.ts, which sits at a recorded size ceiling: a week of the
// standing budget and the reading of one are a single subject, and drafting a
// new budget against the ceilings Congress has authorized is another. The
// dependency runs one way — this file reads budget.ts and budget.ts does not
// read it — so `congress.ts` imports `enactBudget` from here, beside the vote
// that precedes it.

export type BudgetDraftInput = Partial<Record<BudgetAccount, number>>;

export type BudgetDraftCandidate = {
  readonly allocation: BudgetAllocation;
  readonly outlook: BudgetOutlook;
  readonly changed: readonly BudgetAccount[];
};

export type BudgetDraftResult =
  | { readonly ok: true; readonly candidate: BudgetDraftCandidate }
  | { readonly ok: false; readonly reason: string };

export function projectBudgetDraft(campaign: Campaign, draft: BudgetDraftInput): BudgetDraftResult {
  const current = selectBudget(campaign);
  const allocation = { ...current } as { -readonly [K in BudgetAccount]: number };
  for (const [account, share] of Object.entries(draft) as [BudgetAccount, number][]) {
    if (!BUDGET_ACCOUNTS.includes(account)) return { ok: false, reason: `No such budget account exists: ${account}.` };
    if (!Number.isFinite(share) || share < 0) return { ok: false, reason: "An appropriation cannot be negative." };
    const cap = accountCap(campaign, account);
    if (share > cap) {
      return {
        ok: false,
        reason:
          cap > ACCOUNT_CAP
            ? `Congress has authorized this account up to ${(cap * 100).toFixed(1)}% of national income, and no further.`
            : `No single account may take more than ${(cap * 100).toFixed(0)}% of national income in a year.`,
      };
    }
    allocation[account] = round4(share);
  }
  const changed = BUDGET_ACCOUNTS.filter((account) => allocation[account] !== current[account]);
  return {
    ok: true,
    candidate: {
      allocation: allocation as BudgetAllocation,
      outlook: selectBudgetOutlook(campaign, allocation as BudgetAllocation),
      changed,
    },
  };
}

export type BudgetResult =
  | { readonly ok: true; readonly packet: EffectPacket }
  | { readonly ok: false; readonly reason: string };

/**
 * Put an appropriation in effect. Nothing is paid here — a budget is passed,
 * not spent, and every week of it is then collected by `budgetPhase`.
 */
export function enactBudget(campaign: Campaign, candidate: BudgetDraftCandidate): BudgetResult {
  if (candidate.changed.length === 0) return { ok: false, reason: "That appropriation is already standing." };

  const named = candidate.changed.map((account) => BUDGET_ACCOUNT_SPECS[account].name.toLowerCase());
  const list = named.length === 1 ? named[0]! : `${named.slice(0, -1).join(", ")} and ${named.at(-1)!}`;
  return {
    ok: true,
    packet: {
      source: "action",
      actor: "player",
      turn: campaign.turn,
      narration: {
        summary: `The government reopens the budget for ${list}, at ${(candidate.outlook.totalShare * 100).toFixed(1)}% of national income.`,
      },
      effects: [
        { kind: "budget", allocation: candidate.allocation },
        {
          kind: "feed",
          items: candidate.changed.map((account) => ({
            turn: campaign.turn,
            kind: "press" as const,
            visibility: "public" as const,
            headline: budgetHeadline(account, candidate, campaign),
          })),
        },
      ],
    },
  };
}

function budgetHeadline(
  account: BudgetAccount,
  candidate: BudgetDraftCandidate,
  campaign: Campaign,
): string {
  const spec = BUDGET_ACCOUNT_SPECS[account];
  const now = candidate.allocation[account];
  const before = selectBudget(campaign)[account];
  const verb = now > before ? "wins" : "loses";
  return `The ${spec.name.toLowerCase()} ${verb} its budget: ${(now * 100).toFixed(1)}% of national income, from ${(before * 100).toFixed(1)}%.`;
}
