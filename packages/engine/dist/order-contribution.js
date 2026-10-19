import { orderStatEffects } from "./policy.js";
import { statAt } from "./policy-stats.js";
import { selectNation } from "./state.js";
/** What absolute stat effects actually deliver, including clipping at the signing or rulemaking boundary. */
export function realizedOrderContribution(campaign, movements) {
    const runtime = selectNation(campaign, campaign.founding.nation);
    if (!runtime)
        return {};
    return Object.fromEntries(Object.entries(movements)
        .filter(([path]) => path !== "economy.debt")
        .map(([path, delta]) => {
        const effect = orderStatEffects(campaign, { [path]: delta })[0];
        if (effect?.kind !== "nationStat")
            throw new Error(`No stat effect for ${path}`);
        const [group, field] = path.split(".");
        const after = effect.setStats[group]?.[field];
        if (after === undefined)
            throw new Error(`No applied value for ${path}`);
        return [path, after - statAt(runtime.stats, path)];
    }));
}
/**
 * An order's movements as they land on the country, with its share of the debt
 * booked as the President's own borrowing rather than written as a level: the
 * money an order borrows is borrowed by the President's choice, so its interest
 * is charged to the President's authority like a program's is. The share is of
 * output at today's prices, because the stock it lands on is kept in them.
 */
export function orderLandingEffects(campaign, movements, ownerId) {
    const { "economy.debt": share, ...rest } = movements;
    const economy = selectNation(campaign, campaign.founding.nation)?.stats.economy;
    const amount = share !== undefined && economy ? share * economy.gdp * economy.costOfLiving : 0;
    return [...orderStatEffects(campaign, rest, ownerId), ...(amount !== 0 ? [{ kind: "choiceBorrowing", amount }] : [])];
}
/** Legacy delta adapter, excluding borrowed debt; live court remedies use recorded contribution lineage. */
export function negatedStatEffects(campaign, effects) {
    return orderStatEffects(campaign, Object.fromEntries(Object.entries(effects)
        .filter(([path]) => path !== "economy.debt")
        .map(([path, delta]) => [path, -delta])));
}
