import { forceAssetNoun } from "@admin/world";
import { formatMoney } from "../format/money";
// What each rung's price is read off, said once so the preview and the
// decision compare state the same basis. The figures behind each sentence are
// `FORCE_COST_ANCHORS` in the world package, with their sources.
const BASIS = {
    1: "Based on what a major US military exercise has cost.",
    2: "Based on what a carrier strike group costs to run each day. That covers a week to sail there, then each day it stays.",
    3: "Based on what a destroyer costs to run each day. That covers a week to sail there, then each day it stays.",
    4: "Based on what each US strike flight over Libya cost in 2011, including weapons and support, with two flights for each aircraft.",
    5: "Based on what it costs to ship a brigade's equipment overseas, then what each brigade cost a year in Iraq.",
};
/**
 * A figure that can sit under ten million, where the bare money format rounds
 * to whole millions and would print a destroyer's day as nothing.
 */
function unitMoney(usdMillions) {
    if (usdMillions >= 10)
        return formatMoney(usdMillions);
    return usdMillions >= 1 ? `$${usdMillions.toFixed(1)}M` : `$${Math.round(usdMillions * 1000)}K`;
}
function sent(basis) {
    if (!basis.unitType)
        return "One exercise";
    const count = basis.units === 1 ? "One" : basis.units.toLocaleString("en-US");
    return `${count} ${forceAssetNoun(basis.unitType, basis.units)}`;
}
/**
 * The money a force act charges, with what it was priced on: what is sent,
 * the US price of each, any adjustment for the government paying or the
 * distance, the sum charged now, and the bill each week the force stays out.
 * The sum is the projection's own, so it is the figure the commit charges.
 */
export function forceCostBasisWords(basis) {
    const adjustments = [
        ...(basis.costIndex !== 1 ? [`${basis.costIndex.toFixed(2)} times the US price`] : []),
        ...(basis.reach !== 1 ? [`${basis.reach.toFixed(2)} times for distance`] : []),
    ];
    const each = `${sent(basis)} at ${unitMoney(basis.perUnit)} each${adjustments.length ? `, ${adjustments.join(" and ")}` : ""}`;
    const weekly = basis.weekly > 0 ? `, then ${unitMoney(basis.weekly)} a week while ${basis.units === 1 ? "it stays" : "they stay"} out` : "";
    return `${each}: ${unitMoney(basis.upFront)} now${weekly}. ${BASIS[basis.rung]}`;
}
