import { BUDGET_ACCOUNTS, BUDGET_ACCOUNT_SPECS, accountCap, inShutdown, projectAppropriation, projectBudgetDraft, selectBudget, selectBudgetOutlook, selectBudgetYear, } from "@admin/engine";
import { authorityFlow, capabilityHorizons, fundedThroughIfCarried } from "./draft-consequence";
import { fundedThroughDate } from "./funded-through";
export function appropriationStatus(campaign) {
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
function accountRows(campaign, candidate) {
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
export function budgetDraftReading(campaign, draft) {
    const result = projectBudgetDraft(campaign, draft);
    if (!result.ok)
        return result;
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
