import { COST_JITTER, costMultiplier } from "@admin/engine";
export { COST_JITTER, costMultiplier } from "@admin/engine";
import { SCENARIO_COST_ANCHORS, US_ID, worldDataset } from "@admin/world";
/** The year the world is set in, whose dollars every price is stated in. */
const WORLD_YEAR = 2026;
function row(anchor) {
    const found = SCENARIO_COST_ANCHORS.find((entry) => entry.anchor === anchor);
    if (!found)
        throw new Error(`scenario-cost: no anchor "${anchor}" in SCENARIO_COST_ANCHORS`);
    return found;
}
/** An anchor's money in the world's dollars, carried forward by the consumer price index. */
export function anchorInWorldDollars(anchor) {
    const entry = row(anchor);
    if (entry.dollarYear === undefined)
        throw new Error(`scenario-cost: anchor "${anchor}" carries no dollar year`);
    return entry.value * (row(`cpi-${WORLD_YEAR}`).value / row(`cpi-${entry.dollarYear}`).value);
}
/**
 * Which real appropriation stands for each band at each severity, USD millions
 * in the world's dollars. A routine supplemental is a city's water system; a
 * serious one an outbreak response; a critical one a hurricane. A structural
 * claim is one year of the program, which the horizon then extends.
 */
const BAND_CENTERS = {
    discretionary: {
        routine: () => anchorInWorldDollars("discretionary-routine"),
        serious: () => anchorInWorldDollars("discretionary-serious"),
        critical: () => anchorInWorldDollars("discretionary-critical"),
    },
    supplemental: {
        routine: () => anchorInWorldDollars("flint-wiin-2016"),
        serious: () => anchorInWorldDollars("zika-supplemental-2016"),
        critical: () => anchorInWorldDollars("harvey-first-supplemental"),
    },
    emergency: {
        routine: () => anchorInWorldDollars("zika-supplemental-2016"),
        serious: () => anchorInWorldDollars("ebola-emergency-2015"),
        critical: () => anchorInWorldDollars("sandy-supplemental"),
    },
    structural: {
        routine: () => anchorInWorldDollars("structural-routine"),
        serious: () => anchorInWorldDollars("chips-manufacturing-incentives") / row("chips-incentive-years").value,
        critical: () => anchorInWorldDollars("structural-critical"),
    },
};
/** A multi-year commitment costs more than its first year, and a permanent one more again. Planning values. */
const HORIZON_MULTIPLIER = { "one-off": 1, "multi-year": 1.8, permanent: 3 };
/** A week confined to one city is priced one severity down: the anchors are national events. */
const CITY_STEP_DOWN = { critical: "serious", serious: "routine", routine: "routine" };
/** And a routine week in one city at a share of the routine anchor, since it has nowhere further down to step. Planning value. */
const CITY_ROUTINE_SHARE = 0.5;
/** What the United States' output is at founding, the scale every anchor was spent against. */
function usOutput() {
    const us = worldDataset.nations.find((nation) => nation.id === US_ID);
    if (!us)
        throw new Error("scenario-cost: the United States is missing from the dataset");
    return us.stats.economy.gdp;
}
/**
 * The money a reply's declared impact borrows, USD millions at today's prices,
 * or nothing when it declares no money.
 *
 * Another government pays the American anchor scaled by its output against the
 * United States', since a hurricane supplemental is a different sum in a smaller
 * economy. `costOfLiving` carries the founding's dollars to today's, so a
 * program answered in year four is priced at year four's prices.
 */
export function financialCost(impact, nation, pricing = {}) {
    const financial = impact.financial;
    const scale = financial?.scale;
    if (!financial || !scale || scale === "none")
        return undefined;
    const prices = nation.stats.economy.costOfLiving;
    if (financial.basis) {
        const center = basisCenter(financial.basis);
        return center * prices * costMultiplier(pricing.key, COST_JITTER.basisSpread);
    }
    const severity = pricing.severity ?? "serious";
    const city = financial.scope === "city";
    const band = city ? CITY_STEP_DOWN[severity] : severity;
    const cityShare = city && severity === "routine" ? CITY_ROUTINE_SHARE : 1;
    const scaleToNation = nation.id === US_ID ? 1 : nation.stats.economy.gdp / usOutput();
    const horizon = HORIZON_MULTIPLIER[financial.horizon ?? "one-off"];
    const center = BAND_CENTERS[scale][band]() * cityShare * scaleToNation * horizon;
    return center * prices * costMultiplier(pricing.key, COST_JITTER.bandSpread);
}
/**
 * A reply's own authored obligation, drawn around what the writer typed.
 *
 * The figure in a reply's `cost` is a writer's round number. The obligation it
 * stands for is not round: it lands near that figure, a little over more often
 * than under, at cents of a million. Absent a key, the figure is returned as
 * written.
 */
export function jitterTreasury(amount, key) {
    if (key === undefined || amount === 0)
        return amount;
    const drawn = amount * costMultiplier(`${key}|treasury`, COST_JITTER.treasurySpread, COST_JITTER.treasuryBias);
    return Math.round(drawn * 100) / 100;
}
/** The center a basis or band prices at for the United States, unjittered. Exported for the audit. */
export function financialCenterForUs(impact, severity) {
    const financial = impact.financial;
    if (!financial?.scale || financial.scale === "none")
        return undefined;
    if (!financial.basis) {
        const band = financial.scope === "city" ? CITY_STEP_DOWN[severity] : severity;
        return BAND_CENTERS[financial.scale][band]() * HORIZON_MULTIPLIER[financial.horizon ?? "one-off"];
    }
    return basisCenter(financial.basis);
}
function basisCenter(basis) {
    const primary = basis.quantity * basis.unitCostUSD * (basis.weeks ?? 1);
    const additional = (basis.components ?? []).reduce((sum, item) => sum + item.quantity * item.unitCostUSD * (item.weeks ?? 1), 0);
    return (primary + additional) / 1_000_000;
}
/** The band's own center at a severity, for the audit's comparison against a stated basis. */
export function bandCenterForUs(scale, severity) {
    return BAND_CENTERS[scale][severity]();
}
/** The estimate carries its accounting boundary into the frozen option and eventual receipt. */
export function financialEstimate(impact, key) {
    const basis = impact.financial?.basis;
    const extra = (basis?.components ?? []).map((component) => `${component.label}: ${component.quantity} ${component.unit} at $${component.unitCostUSD}${component.weeks ? ` for ${component.weeks} weeks` : ""}; ${component.source}`);
    return { key, method: basis ? "arithmetic" : "band", spread: basis ? COST_JITTER.basisSpread : COST_JITTER.bandSpread,
        source: basis ? [basis.source, basis.coverage ?? "Coverage not documented", ...extra].join(". ") :
            `Comparable federal ${impact.financial?.scale} appropriation; case-specific cost breakdown unavailable` };
}
