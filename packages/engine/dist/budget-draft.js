import { ACCOUNT_CAP, BUDGET_ACCOUNTS, BUDGET_ACCOUNT_SPECS, accountCap, selectBudget, selectBudgetOutlook, } from "./budget.js";
const round4 = (value) => Math.round(value * 10_000) / 10_000 + 0;
export function projectBudgetDraft(campaign, draft) {
    const current = selectBudget(campaign);
    const allocation = { ...current };
    for (const [account, share] of Object.entries(draft)) {
        if (!BUDGET_ACCOUNTS.includes(account))
            return { ok: false, reason: `No such budget account exists: ${account}.` };
        if (!Number.isFinite(share) || share < 0)
            return { ok: false, reason: "An appropriation cannot be negative." };
        const cap = accountCap(campaign, account);
        if (share > cap) {
            return {
                ok: false,
                reason: cap > ACCOUNT_CAP
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
            allocation: allocation,
            outlook: selectBudgetOutlook(campaign, allocation),
            changed,
        },
    };
}
/**
 * Put an appropriation in effect. Nothing is paid here — a budget is passed,
 * not spent, and every week of it is then collected by `budgetPhase`.
 */
export function enactBudget(campaign, candidate) {
    if (candidate.changed.length === 0)
        return { ok: false, reason: "That appropriation is already standing." };
    const named = candidate.changed.map((account) => BUDGET_ACCOUNT_SPECS[account].name.toLowerCase());
    const list = named.length === 1 ? named[0] : `${named.slice(0, -1).join(", ")} and ${named.at(-1)}`;
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
                        kind: "press",
                        visibility: "public",
                        headline: budgetHeadline(account, candidate, campaign),
                    })),
                },
            ],
        },
    };
}
function budgetHeadline(account, candidate, campaign) {
    const spec = BUDGET_ACCOUNT_SPECS[account];
    const now = candidate.allocation[account];
    const before = selectBudget(campaign)[account];
    const verb = now > before ? "wins" : "loses";
    return `The ${spec.name.toLowerCase()} ${verb} its budget: ${(now * 100).toFixed(1)}% of national income, from ${(before * 100).toFixed(1)}%.`;
}
