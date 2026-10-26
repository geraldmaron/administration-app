import { addDays, apply, campaignPhaseSequence, DAYS_PER_TURN, marketQuote, nextFomcDecision, selectPumpPrice } from "@admin/engine";
import { charterOf } from "../campaign/founding-options";
import { formatDate, formatSignedPoints, METRIC_LABELS } from "../format/figures";
import { formatMoney } from "../format/money";
import { marketLeverAct, marketLevers } from "./market-levers";
import { commodityPriceFigure } from "./markets";
/** Weeks the outlook runs: the pump follows crude two to five weeks behind, so six reaches the gallon. */
export const LEVER_HORIZON_WEEKS = 6;
const SHORT = {
    "fed-ease": { label: "Press the Fed to cut", verb: "Press the Fed" },
    "fed-tighten": { label: "Press the Fed to hold", verb: "Press the Fed" },
    reserve: { label: "Release the reserve", verb: "Order the drawdown" },
    "reserve-limited": { label: "Limited drawdown", verb: "Order the limited drawdown" },
    "fuel-waiver": { label: "Fuel waiver", verb: "Issue the waiver" },
};
/** The market phase the shipped week runs, taken from the week's own sequence. */
function marketPhase(campaign) {
    const phase = campaignPhaseSequence(charterOf(campaign)).find((entry) => entry.id === "commodityPhase");
    if (!phase)
        throw new Error("The week runs no market phase, so there is no outlook to draw.");
    return phase.run;
}
/** The world's markets stepped forward alone, week by week, other things held where they are. */
function marketsAhead(campaign, weeks) {
    const step = marketPhase(campaign);
    let working = campaign;
    for (let week = 0; week < weeks; week += 1) {
        working = step(working).reduce(apply, working);
        working = { ...working, turn: working.turn + 1, calendar: addDays(working.calendar, DAYS_PER_TURN) };
    }
    return working;
}
function outlookOf(campaign) {
    const ahead = marketsAhead(campaign, LEVER_HORIZON_WEEKS);
    const crude = marketQuote(ahead, "crude").index;
    const pump = selectPumpPrice(ahead);
    return { crude, crudeFigure: commodityPriceFigure("crude", crude), pump, pumpFigure: `$${pump.toFixed(2)} a gallon` };
}
/** A metric cost, one line per reading it moves. */
export function costLines(cost) {
    return Object.entries(cost)
        .filter(([, delta]) => delta !== 0)
        .map(([key, delta]) => (key === "treasury" ? `${METRIC_LABELS[key]} ${formatMoney(delta)}` : `${METRIC_LABELS[key]} ${formatSignedPoints(delta)} pts`));
}
function leverColumn(campaign, lever) {
    const head = { id: lever.key, label: SHORT[lever.key].label, verb: SHORT[lever.key].verb };
    if (lever.kind === "refused")
        return { ...head, refusal: lever.refusal, effect: lever.refusal, cost: [], risks: [] };
    const act = marketLeverAct(campaign, lever.key);
    if (!act.ok)
        return { ...head, refusal: act.reason, effect: act.reason, cost: [], risks: [] };
    return {
        ...head,
        effect: lever.effect,
        cost: costLines(lever.cost),
        risks: lever.risks.map((risk) => risk.description),
        outlook: outlookOf(apply(campaign, act.packet)),
    };
}
/** Every market lever, each column priced and projected off the packet its commit applies, read against the markets left alone. */
export function leverComparison(campaign) {
    return {
        horizonWeeks: LEVER_HORIZON_WEEKS,
        columns: marketLevers(campaign).map((lever) => leverColumn(campaign, lever)),
        untouched: outlookOf(campaign),
        waiting: `With no lever pulled, the Fed decides on its own on ${formatDate(nextFomcDecision(campaign.calendar))}, and the world market sets the price of oil.`,
    };
}
