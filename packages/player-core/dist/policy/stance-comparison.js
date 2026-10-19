import { POLICY_DOMAIN_SPECS, enactPolicy, projectPolicyStance, selectPolicyOutlook, selectPolicyStance, stancesForDomain, } from "@admin/engine";
import { fiscalPreview } from "../economy/fiscal-books";
import { executionWords } from "./execution-words";
import { formatMoney } from "../format/money";
import { alignmentCell, cell, metricCell, ratePoints, weeksWords } from "./choice-table";
import { pledgesOnDomain } from "./portfolio";
/**
 * Why a position cannot be signed today, asked of `enactPolicy` itself: a
 * stance can project cleanly and still be refused at the desk (a revenue
 * program waits on its statute, an enactment the authority cannot cover), and
 * a column that offered the verb only to be refused would be a button that
 * does nothing.
 */
function lockOf(campaign, column) {
    const result = enactPolicy(campaign, column.stance.id);
    return result.ok ? undefined : result.reason;
}
function columnOf(campaign, column) {
    const locked = lockOf(campaign, column);
    return {
        id: column.stance.id,
        label: column.stance.name,
        ...(locked ? { locked } : {}),
    };
}
function restingCell(column) {
    const move = column.projection.restingMove;
    if (!move)
        return cell("No cost shown, because you can't choose it");
    // Growth is better higher; inflation and unemployment are better lower.
    const rates = [
        ["Growth", move.growth, 1],
        ["Inflation", move.inflation, -1],
        ["Unemployment", move.unemployment, -1],
    ];
    const moves = rates
        .filter(([, value]) => value !== 0)
        .map(([label, value, better]) => ({ label, value, text: ratePoints(value), tone: value * better > 0 ? "favorable" : "adverse" }));
    if (moves.length === 0)
        return cell("No change to where the economy settles");
    const better = move.growth - move.inflation - move.unemployment;
    return cell(moves.map((entry) => `${entry.label} ${entry.text}`).join("; "), better > 0 ? "favorable" : better < 0 ? "adverse" : "neutral", moves);
}
function pledgeCell(column, current, pledges) {
    if (pledges.length === 0)
        return cell("No promise is affected");
    const kept = pledges.filter((pledge) => pledge.stance === column.stance.id && (pledge.kind === "adopt" ? column.stance.id !== current : true));
    const broken = pledges.filter((pledge) => pledge.kind === "hold" && pledge.stance === current && column.stance.id !== current);
    const parts = [...kept.map((pledge) => `Keeps “${pledge.title}”`), ...broken.map((pledge) => `Breaks “${pledge.title}”`)];
    if (parts.length === 0)
        return cell(pledges.some((pledge) => pledge.kind === "adopt") ? "A promise stays owed" : "No promise moves");
    return cell(parts.join("; "), broken.length > 0 ? "adverse" : "favorable");
}
function chairCell(column) {
    const { minister, quality } = column.projection;
    if (!minister)
        return cell("No one. The seat is empty", "adverse");
    return cell(`${minister}, who ${executionWords(quality)}`);
}
function debtCell(campaign, column, domain) {
    const debt = fiscalPreview(campaign, { [domain]: column.stance.id }, [])?.cost.debt ?? 0;
    if (debt === 0)
        return cell("None added");
    const text = `${debt > 0 ? "+" : "−"}${formatMoney(Math.abs(debt))}`;
    const tone = debt > 0 ? "adverse" : "favorable";
    return cell(text, tone, [{ value: debt, text, tone }]);
}
/** The weekly charge a stance would bring, said beside the one the standing stance charges today. */
function weeklyCell(column, perTurnNow) {
    const after = metricCell(column.projection.perTurn, "No weekly charge");
    const now = metricCell(perTurnNow, "nothing").text;
    return { ...after, text: `${after.text}. Today: ${now.charAt(0).toLowerCase()}${now.slice(1)}` };
}
function rowsOf(campaign, domain, current, columns, perTurnNow) {
    const pledges = pledgesOnDomain(campaign, domain);
    const row = (id, label, read) => ({ id, label, cells: columns.map(read) });
    const rows = [
        { ...row("summary", "What it is", (column) => cell(column.stance.summary)), kind: "lead" },
        row("enactment", "Paid once, when signed", (column) => metricCell(column.projection.enactment, "Nothing up front")),
        row("per-week", "Every week it's in place", (column) => weeklyCell(column, perTurnNow)),
        row("resting", "Where the economy settles", restingCell),
        row("alignment", "Your politics", (column) => alignmentCell(column.projection.alignment)),
        row("objects", "Who pushes back hardest", (column) => cell(column.projection.opposition?.name ?? "Nobody in particular")),
        row("bites", "Before it takes effect", (column) => cell(column.projection.standUpTurns === 0 ? "Already working" : weeksWords(column.projection.standUpTurns))),
        row("pledges", "Promises at stake", (column) => pledgeCell(column, current, pledges)),
        row("chair", "Responsible department", chairCell),
    ];
    const debts = columns.map((column) => debtCell(campaign, column, domain));
    if (debts.some((entry) => entry.text !== "None added"))
        rows.splice(3, 0, { id: "debt", label: "Added debt, first year", cells: debts });
    return rows;
}
/**
 * Every position in a domain other than the standing one, each what adopting
 * it would charge now and every week after, with the weekly charge of the
 * stance in force said beside it.
 */
export function stanceComparison(campaign, charter, domain) {
    const standing = selectPolicyStance(campaign, domain);
    const columns = stancesForDomain(domain)
        .filter((stance) => stance.id !== standing.id)
        .map((stance) => ({ stance, projection: projectPolicyStance(campaign, charter, domain, stance.id) }));
    const perTurnNow = selectPolicyOutlook(campaign).lines.find((line) => line.domain === domain)?.perTurn ?? {};
    return { domain, current: standing.id, columns: columns.map((column) => columnOf(campaign, column)), rows: rowsOf(campaign, domain, standing.id, columns, perTurnNow) };
}
/** What signing a stance will do, in the one line above the verb. */
export function stanceReview(campaign, charter, domain, stanceId) {
    const projection = projectPolicyStance(campaign, charter, domain, stanceId);
    if (!projection.available)
        return projection.missing ?? projection.reasoning;
    const name = POLICY_DOMAIN_SPECS[domain].name.toLowerCase();
    const bites = projection.standUpTurns === 0 ? "It works from next week." : `It starts to work in ${weeksWords(projection.standUpTurns)}.`;
    return `You will move ${name} policy from ${projection.previous.name.toLowerCase()} to ${projection.stance.name.toLowerCase()}. ${bites} The change goes on the Record.`;
}
