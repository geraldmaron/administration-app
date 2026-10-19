import { BENEFICIAL_DIRECTION, RULEMAKING_TURNS, executiveOrder, likelihoodFromUnitInterval, orderAvailability, plankDeliverable, projectOrder, routeDomestic, } from "@admin/engine";
import { plankById } from "@admin/world";
import { orderPriceEffects } from "../economy/act-prices";
import { reachByGroup, reachSentence } from "./reach";
import { fiscalPreview } from "../economy/fiscal-books";
import { formatRatio, statPathLabel } from "../format/figures";
import { formatMoney } from "../format/money";
import { alignmentShiftWords, cell, metricCell, ratePoints, weeksWords } from "./choice-table";
// One executive order at the desk: what it would do, what it would cost, how
// likely the courts are to be asked about it, and the law it runs on, each a
// change from today. Every figure is read off `projectOrder`, the
// projection `signOrder` rolls against, so the odds shown are the odds drawn.
export const ORDER_SIGN = "sign";
/** Where on the map an order lands: its states as a set, or the whole country. */
export function orderCamera(desk) {
    if (desk.states.length === 0)
        return "us";
    return `set:${desk.states.map((entry) => `state:${entry.state}`).join("|")}`;
}
function effectLines(order) {
    return Object.entries(order.nationEffects)
        .filter(([path]) => path !== "economy.debt")
        .map(([path, delta]) => {
        const better = BENEFICIAL_DIRECTION[path] * Math.sign(delta) > 0;
        return { label: statPathLabel(path), text: ratePoints(delta), tone: better ? "favorable" : "adverse" };
    });
}
function landedStates(campaign, order, subject) {
    if (!order.domestic)
        return [];
    return routeDomestic(campaign, order.domestic)
        .filter((effect) => order.id !== "order-relief-program" || subject?.kind !== "state" || effect.state === subject.state)
        .map((effect) => ({ state: effect.state, helps: (effect.addMark?.valence ?? 1) > 0 }))
        .sort((a, b) => Number(b.helps) - Number(a.helps) || a.state.localeCompare(b.state));
}
function pledgesFor(campaign, order) {
    return (campaign.pledges ?? []).flatMap((pledge) => {
        const deliverable = plankDeliverable(pledge.plank);
        if (pledge.status !== "open" || deliverable?.kind !== "sign-order" || deliverable.order !== order.id)
            return [];
        return [plankById.get(pledge.plank)?.title ?? pledge.plank];
    });
}
function landsInWeeks(order, projection) {
    return order.viaRulemaking ? RULEMAKING_TURNS + (projection.execution?.addedWeeks ?? 0) : 0;
}
function reviewCell(projection) {
    const review = projection.review;
    if (!review)
        return cell("Not sent for legal review. You already have the power to do this");
    const who = review.reviewer.base.name;
    return review.objects ? cell(`${who} objects in writing`, "adverse") : cell(`${who} clears it`, "favorable");
}
function comparisonRows(parts) {
    const { order, projection } = parts;
    const pair = (id, label, sign) => ({ id, label, cells: [sign] });
    const helps = parts.states.filter((entry) => entry.helps).length;
    const rows = [
        pair("does", "What it does", cell(order.summary)),
        pair("cost", "Cost now", metricCell(projection.cost, "Nothing up front")),
        pair("effects", "What it changes", parts.effects.length === 0 ? cell("No lasting change") : cell(parts.effects.map((line) => `${line.label} ${line.text}`).join("; "))),
        pair("lands", "When it takes effect", cell(parts.landsInWeeks === 0 ? "The day it is signed" : `Through a new rule, in ${weeksWords(parts.landsInWeeks)}`)),
        pair("challenge", "Chance it is challenged", cell(`${formatRatio(projection.challengeChance)}: ${likelihoodFromUnitInterval(projection.challengeChance).toLowerCase()}`, projection.challengeChance >= 0.3 ? "adverse" : "neutral")),
        pair("review", "The Attorney General", reviewCell(projection)),
        pair("politics", "Your politics", cell(alignmentShiftWords(order.alignment))),
    ];
    if (parts.debt !== 0)
        rows.splice(2, 0, pair("debt", "Added debt, first year", cell(`+${formatMoney(parts.debt)}`, "adverse")));
    if (parts.reach)
        rows.push(pair("reach", "Who it reaches", cell(parts.reach)));
    if (parts.states.length > 0)
        rows.push(pair("states", "Where it goes", cell(order.id === "order-relief-program"
            ? `${parts.states.length} ${parts.states.length === 1 ? "state receives" : "states receive"} disaster relief.`
            : `Reaches ${parts.states.length} states. ${helps} of them gain. ${order.domestic?.reason ?? ""}`.trim())));
    if (parts.pledges.length > 0)
        rows.push(pair("pledges", "Promises", cell(parts.pledges.map((title) => `Keeps “${title}”`).join("; "), "favorable")));
    return rows;
}
/** One order at the desk, or undefined for an id the catalogue does not have. */
export function orderDesk(campaign, charter, orderId, subject) {
    const order = executiveOrder(orderId);
    if (!order)
        return undefined;
    const availability = orderAvailability(campaign, order, subject);
    const projection = projectOrder(campaign, charter, order);
    const parts = {
        order,
        available: availability.ok,
        ...(availability.ok ? {} : { missing: availability.missing }),
        ...(order.authority ? { authority: order.authority } : {}),
        projection,
        effects: effectLines(order),
        debt: fiscalPreview(campaign, {}, orderPriceEffects(campaign, order))?.cost.debt ?? 0,
        landsInWeeks: landsInWeeks(order, projection),
        states: landedStates(campaign, order, subject),
        pledges: pledgesFor(campaign, order),
        ...reachOf(campaign, order),
    };
    const columns = [
        { id: ORDER_SIGN, label: "Sign the order", ...(availability.ok ? {} : { locked: `Needs ${availability.missing}` }) },
    ];
    return { ...parts, comparison: { columns, rows: comparisonRows(parts) } };
}
function reachOf(campaign, order) {
    const reachLines = order.domestic ? reachByGroup(campaign, order.domestic) : [];
    const sentence = reachSentence(reachLines);
    return { reachLines, ...(sentence ? { reach: sentence } : {}) };
}
/** What signing will do, in the one line above the verb. */
export function orderReview(desk) {
    const lands = desk.landsInWeeks === 0 ? "It takes effect the day it is signed." : `The departments write the rule, and it takes effect in ${weeksWords(desk.landsInWeeks)}.`;
    const treasury = desk.projection.cost.treasury ?? 0;
    const money = treasury < 0 ? ` It spends ${formatMoney(-treasury)} now.` : treasury > 0 ? ` It raises ${formatMoney(treasury)}.` : "";
    return `You will sign ${desk.order.name.toLowerCase()}. ${lands}${money} The signature goes on the Record.`;
}
