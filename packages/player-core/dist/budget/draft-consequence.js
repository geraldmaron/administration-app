import { fundedThroughDate } from "./funded-through";
import { ARREARS_STABILITY_COST, BUDGET_ACCOUNT_SPECS, CAPABILITY_LABELS, CAPABILITY_MILESTONES, POLICY_TURN_SHARE, authorityCeiling, inShutdown, nextMilestone, selectBudget, selectBudgetOutlook, selectBudgetYear, selectFiscalOutlook, selectFiscalYearEndTurn, selectSolvency, weeklyApportionment, } from "@admin/engine";
export function authorityFlow(campaign, allocation = selectBudget(campaign)) {
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
const LADDER_ACCOUNTS = [...new Set(CAPABILITY_MILESTONES.map((milestone) => milestone.account))];
/**
 * One row per account with a ladder. An account whose every rung is already
 * open has no row; the caller says so from `laddersOpen`.
 */
export function capabilityHorizons(campaign, draft) {
    const standing = selectBudget(campaign);
    return LADDER_ACCOUNTS.flatMap((account) => {
        const now = nextMilestone(campaign, account, standing);
        const drafted = nextMilestone(campaign, account, draft);
        if (!now)
            return [];
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
export function laddersOpen(campaign) {
    return LADDER_ACCOUNTS.filter((account) => !nextMilestone(campaign, account));
}
/**
 * Where the money would run to if the draft carried: a book that passes pays
 * for the budget year (`requestAppropriation` moves `throughTurn` to that
 * year's end, never back).
 */
export function fundedThroughIfCarried(campaign) {
    const fiscalYear = selectBudgetYear(campaign);
    const turn = Math.max(campaign.congress.appropriation.throughTurn, selectFiscalYearEndTurn(campaign, fiscalYear));
    return { turn, date: fundedThroughDate(campaign, turn), fiscalYear };
}
