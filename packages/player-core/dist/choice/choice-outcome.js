import { formatSignedPoints } from "../format/figures.js";
import { formatMoney } from "../format/money.js";
export const COST_FREE = { text: "Free" };
/** The money an act spends now, as the cost column says it. A positive amount is money coming in. */
export function moneyCost(amount) {
    if (amount === 0)
        return COST_FREE;
    const figure = { kind: "amount", value: amount, unit: "USD millions", stance: amount < 0 ? "adverse" : "favorable" };
    return { text: amount < 0 ? formatMoney(-amount) : `${formatMoney(amount)} in`, figure };
}
/** The player metrics by the short names a narrow column fits. */
export const METRIC_SHORT = {
    approval: "Approval",
    treasury: "Treasury",
    stability: "Stability",
    militaryReadiness: "Readiness",
    standing: "Standing",
};
const toneOfSign = (value) => (value > 0 ? "favorable" : value < 0 ? "adverse" : "neutral");
/** Points, rounded the way every reading of a metric is said. */
const points = (fraction) => Math.round(fraction * 1000) / 10;
/**
 * A move on a 0..1 reading, said in points. `well` and `badly` are the
 * fractions it moves by in each case, and `chance` the odds it goes well; the
 * likely move is their chance-weighted mean. Without a chance the move is
 * certain. `betterHigher` false flips the tone for a reading that is worse up.
 */
export function pointsEffect(metric, label, move, betterHigher = true) {
    const ranged = move.badly !== undefined && move.chance !== undefined && move.badly !== move.well;
    const likely = ranged ? move.chance * move.well + (1 - move.chance) * move.badly : move.well;
    const value = points(likely);
    const tone = toneOfSign(betterHigher ? value : -value);
    return {
        metric,
        label,
        unit: "pts",
        value,
        text: `${formatSignedPoints(likely)} pts`,
        tone,
        ...(ranged ? { ifWell: points(move.well), ifBadly: points(move.badly) } : {}),
    };
}
const BAND_STEPS = { slight: 1, moderate: 2, major: 3 };
const BAND_WORDS = { slight: "Slight", moderate: "Moderate", major: "Major" };
/** A move the engine gives only as a band, on the ±3 band scale. `favorable` undefined is a reading with no stance of its own. */
export function bandEffect(metric, label, impact, favorable) {
    const up = impact.direction === "up";
    return {
        metric,
        label,
        unit: "band",
        value: BAND_STEPS[impact.band] * (up ? 1 : -1),
        text: `${BAND_WORDS[impact.band]} ${up ? "rise" : "fall"}`,
        tone: favorable === undefined ? "neutral" : favorable ? "favorable" : "adverse",
    };
}
const signed = (value) => `${value >= 0 ? "+" : "−"}${Math.abs(value)}`;
/** The readings that fall if it goes badly, in one line: "Press corps −10, Standing −2.7". Undefined where nothing falls. */
export function worstCaseOf(effects) {
    const falls = effects.flatMap((effect) => (effect.ifBadly !== undefined && effect.ifBadly < 0 ? [`${effect.label} ${signed(effect.ifBadly)}`] : []));
    return falls.length > 0 ? falls.join(", ") : undefined;
}
