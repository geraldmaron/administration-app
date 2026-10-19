import { metricImpact } from "@admin/engine";
import { METRIC_LABELS } from "../format/figures.js";
import { formatMoney } from "../format/money.js";
const BETTER_HIGHER = new Set(["approval", "stability", "standing", "militaryReadiness"]);
const LOCKED = { kind: "none", text: "Not available" };
function costCell(campaign, domain, delta) {
    if (delta === undefined || delta === 0)
        return { kind: "none", text: "No change" };
    if (domain === "treasury")
        return { kind: "money", amount: delta, text: delta < 0 ? `${formatMoney(-delta)} spent` : `${formatMoney(delta)} coming in` };
    const impact = metricImpact(domain, delta, "next-turn", campaign.player.metrics.treasury, "modeled");
    return { kind: "impact", impact, favorable: BETTER_HIGHER.has(domain) ? delta > 0 : undefined };
}
function label(domain) {
    return domain in METRIC_LABELS ? METRIC_LABELS[domain] : domain;
}
/** One row per reading any option moves, in the order the metrics are listed. */
function costRows(campaign, options) {
    const order = Object.keys(METRIC_LABELS);
    const moved = new Set(options.flatMap((option) => Object.entries(option.price?.cost ?? {}).flatMap(([key, delta]) => (delta ? [key] : []))));
    const domains = [...moved].sort((a, b) => order.indexOf(a) - order.indexOf(b));
    return domains.map((domain) => ({
        id: `effect:${domain}`,
        topic: domain === "treasury" ? "money" : "effect",
        label: label(domain),
        cells: options.map((option) => (option.unavailable ? LOCKED : costCell(campaign, domain, option.price?.cost[domain]))),
    }));
}
function followsCell(option) {
    if (option.unavailable)
        return { kind: "none", text: option.unavailable };
    const lines = [...(option.price?.risks.map((risk) => risk.description) ?? []), ...(option.follows ?? [])];
    return lines.length > 0 ? { kind: "lines", lines } : { kind: "none", text: "Nothing else" };
}
/**
 * The rows a priced comparison is read on: every reading any option moves,
 * then what follows. A row an option has nothing to say on reads "No change",
 * never a blank.
 */
export function pricedRows(campaign, options) {
    return [
        ...costRows(campaign, options),
        { id: "follows", topic: "downside", label: "What happens next", cells: options.map(followsCell) },
    ];
}
