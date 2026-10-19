import { EXECUTIVE_ORDERS, executiveOrder, firstOrderSubject, orderAvailability, selectDateOfTurn, } from "@admin/engine";
import { formatDate } from "../format/figures";
import { place } from "../navigation/places";
import { weeksWords } from "./choice-table";
export const ORDER_STAGE_LABELS = {
    desk: "Ready to sign",
    shut: "Shut",
    rulemaking: "Rule being written",
    court: "Before the courts",
    standing: "In force",
    undone: "Ended or overturned",
};
const STAGE_ORDER = ["rulemaking", "court", "desk", "standing", "undone", "shut"];
function catalogueRow(campaign, orderId) {
    const order = executiveOrder(orderId);
    const availability = orderAvailability(campaign, order, firstOrderSubject(campaign, order.id));
    return {
        id: order.id,
        order: order.id,
        name: order.name,
        domain: order.domain,
        stage: availability.ok ? "desk" : "shut",
        line: availability.ok ? order.summary : `Needs ${availability.missing}.`,
        href: place.order(order.id),
    };
}
function undoneLine(record, rule) {
    if (record.review?.status === "struck-down")
        return "Struck down by the courts.";
    if (rule?.status === "disapproved")
        return "Congress voted it down, and what it did was undone.";
    if (rule?.status === "canceled")
        return "Canceled before the rule took effect.";
    return undefined;
}
function signedStage(campaign, record, rule) {
    if (record.rescindedTurn !== undefined)
        return { stage: "undone", line: `${record.endReason === "sunset" ? "Expired" : "Rescinded"} ${formatDate(selectDateOfTurn(campaign, record.rescindedTurn))}. Earlier spending and court records remain.` };
    const undone = undoneLine(record, rule);
    if (undone)
        return { stage: "undone", line: undone };
    if (record.review?.status === "pending") {
        const weeks = Math.max(0, record.review.dueTurn - campaign.turn);
        return { stage: "court", line: `Challenged. The ruling is due in ${weeksWords(weeks)}.`, weeks };
    }
    if (rule?.status === "pending") {
        const weeks = Math.max(0, rule.effectiveTurn - campaign.turn);
        return { stage: "rulemaking", line: `The rule takes effect in ${weeksWords(weeks)}.`, weeks };
    }
    const since = formatDate(selectDateOfTurn(campaign, rule?.resolvedTurn ?? record.turn));
    return { stage: "standing", line: record.review?.status === "upheld" ? `Upheld by the courts. In force since ${since}.` : `In force since ${since}.` };
}
function signedRow(campaign, record, rules) {
    const def = executiveOrder(record.order);
    const name = def?.name ?? record.order;
    const signed = selectDateOfTurn(campaign, record.turn);
    return {
        id: record.id,
        order: record.order,
        name,
        ...(def ? { domain: def.domain } : {}),
        signed,
        href: `${place.order(record.order)}?record=${encodeURIComponent(record.id)}`,
        ...signedStage(campaign, record, rules.get(record.id)),
    };
}
/**
 * The order pipeline: every signature newest first by stage, and the catalogue
 * as it stands this week. An empty stage is left out, so the pipeline never
 * draws a heading over nothing.
 */
export function orderPipeline(campaign) {
    const rules = new Map(campaign.pendingRules.map((rule) => [rule.id, rule]));
    const signed = [...campaign.orders].sort((a, b) => b.turn - a.turn).map((record) => signedRow(campaign, record, rules));
    const catalogue = EXECUTIVE_ORDERS.map((order) => catalogueRow(campaign, order.id));
    const rows = [...signed, ...catalogue];
    return STAGE_ORDER.flatMap((stage) => {
        const inStage = rows.filter((row) => row.stage === stage);
        return inStage.length > 0 ? [{ stage, label: ORDER_STAGE_LABELS[stage], rows: inStage }] : [];
    });
}
/** Every signature of one order, newest first, as the pipeline reads it. */
export function orderSignatures(campaign, orderId) {
    const rules = new Map(campaign.pendingRules.map((rule) => [rule.id, rule]));
    return campaign.orders
        .filter((record) => record.order === orderId)
        .sort((a, b) => b.turn - a.turn)
        .map((record) => signedRow(campaign, record, rules));
}
const ORDER_DOMAINS = ["security", "economy", "civil", "emergency"];
/** How many orders sit at each stage in each of the orders' own domains, counted from the pipeline rows. */
export function orderCountsByDomain(campaign) {
    const rows = orderPipeline(campaign).flatMap((stage) => stage.rows);
    return ORDER_DOMAINS.map((domain) => {
        const byStage = { desk: 0, shut: 0, rulemaking: 0, court: 0, standing: 0, undone: 0 };
        for (const row of rows)
            if (row.domain === domain)
                byStage[row.stage] += 1;
        return { domain, byStage };
    });
}
