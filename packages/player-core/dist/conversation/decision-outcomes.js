import { COST_FREE, METRIC_SHORT, bandEffect, moneyCost } from "../choice/choice-outcome";
// Each answer to a decision as one row of the results list, read off the same
// comparison the table was drawn from, so the list cannot say anything the
// comparison does not. The moves stay bands: the engine prices a reply's
// effects as magnitudes, and the list does not turn them into figures.
const COUNSEL_WORDS = { for: "backs it", wary: "is wary of it", against: "is against it" };
/** Lines run together as one: a line that ends its own sentence needs no semicolon after it. */
const joined = (lines) => lines.map((line, index) => (index === lines.length - 1 || /[.!?]$/.test(line) ? line : `${line};`)).join(" ");
/** A row's cell said as a line of text, or undefined where it says nothing. */
function words(cell) {
    switch (cell.kind) {
        case "money":
        case "chance":
        case "text":
        case "none":
            return cell.text;
        case "lines":
            return joined(cell.lines);
        case "counsel":
            return `${cell.name} ${COUNSEL_WORDS[cell.stance]}`;
        case "impact":
            return undefined;
    }
}
function costOf(cell) {
    if (!cell)
        return COST_FREE;
    if (cell.kind === "money")
        return moneyCost(cell.amount);
    return cell.kind === "none" && cell.text === "Nothing up front" ? COST_FREE : { text: words(cell) ?? COST_FREE.text };
}
function oddsOf(cell) {
    return cell?.kind === "chance" ? { share: cell.chance, word: cell.text } : undefined;
}
function labelOf(row) {
    const domain = row.id.slice("effect:".length);
    return row.topic === "effect" && domain in METRIC_SHORT ? METRIC_SHORT[domain] : row.label;
}
function effectsOf(rows, index) {
    return rows.flatMap((row) => {
        const cell = row.cells[index];
        return (row.topic === "effect" || row.topic === "relationship") && cell.kind === "impact" ? [bandEffect(row.id, labelOf(row), cell.impact, cell.favorable)] : [];
    });
}
const DETAIL_ROWS = new Set(["cost-basis", "debt", "timing", "reaction", "counsel"]);
function outcomeAt(comparison, index) {
    const option = comparison.options[index];
    const cellOf = (id) => comparison.rows.find((row) => row.id === id)?.cells[index];
    const odds = oddsOf(cellOf("odds"));
    const debt = cellOf("debt");
    const downside = cellOf("downside");
    const worst = downside && downside.kind !== "none" ? words(downside) : undefined;
    const details = [
        { label: "What you say", text: option.text },
        ...comparison.rows.flatMap((row) => {
            const text = DETAIL_ROWS.has(row.id) ? words(row.cells[index]) : undefined;
            return text ? [{ label: row.label, text }] : [];
        }),
    ];
    return {
        cost: { ...costOf(cellOf("cost")), ...(debt?.kind === "money" ? { borrowing: { text: debt.text, amount: debt.amount } } : {}) },
        ...(odds ? { odds } : {}),
        effects: effectsOf(comparison.rows, index),
        ...(worst ? { worstCase: worst } : {}),
        details,
    };
}
/** Every option of a decision comparison as a results-list row, in option order. */
export function decisionOutcomes(comparison) {
    return comparison.options.map((_, index) => outcomeAt(comparison, index));
}
