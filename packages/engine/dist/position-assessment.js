import { amplifiedCost, explainAmplification, selectFragility } from "./fragility.js";
import { polarizationDrift, POLARIZATION_DRIFT_MAX } from "./polarization.js";
import { confidenceFromEvidence } from "./assessments.js";
import { metricImpact } from "./projection.js";
// A spoken answer's price, split by who decides it.
//
// The treasury and the readiness an answer draws down are the President's to
// spend: the figure is exact and the card says so. What the answer does to the
// country's stability and its standing abroad is not the President's to set.
// It is what a country in this condition makes of the shock — heavier when the
// administration is fragile, softer in credit when the public is divided — so
// the card states it as an assessment in bands, and the Record puts the figure
// the week actually measured beside it. Nothing here rolls: the realized figure
// is deterministic and explainable in the cabinet's own words, which is what
// makes the band an honest assessment rather than a probability in costume.
// Keyed by what a cost can carry, which leaves approval out: the headline is
// settled from the public's judgments, never charged as a price.
/** The metrics the President spends outright; printed as figures. */
export const SPENT_METRICS = ["treasury", "militaryReadiness"];
/** The metrics the country decides; printed as bands and measured on the Record. */
export const ASSESSED_METRICS = ["stability", "standing"];
/** How much evidence a doubted briefing takes off the assessment's confidence. */
export const DOUBTED_BRIEFING_EVIDENCE = 0.25;
/** Past this much added division a credit is said to land softer: two fifths of the way to the stock's ceiling. */
const DIVIDED_PUBLIC = 0.1;
/**
 * How much of a credit lands on a public this administration has divided: all
 * of it at the era's own division, half at the stock's ceiling. Division the
 * era already carries is in the blocs; only what this administration added
 * softens what it is credited with.
 */
function creditDamping(polarization) {
    return 1 - 0.5 * (Math.max(0, polarizationDrift(polarization)) / POLARIZATION_DRIFT_MAX);
}
const round3 = (value) => Math.round(value * 1000) / 1000 + 0;
const clamp01 = (value) => Math.max(0, Math.min(1, value));
function isAssessed(key) {
    return ASSESSED_METRICS.includes(key);
}
/**
 * What an authored cost comes to on this board. A debit to an assessed metric
 * lands as heavily as the administration's fragility makes it; a credit lands
 * as softly as the public's division makes it. Spent metrics pass through
 * untouched, and so does every assessed metric on a healthy, united board —
 * which is why a healthy administration reads its sticker price.
 */
export function realizePositionCost(campaign, cost) {
    const fragility = selectFragility(campaign);
    const damping = creditDamping(campaign.player.opinion.polarization);
    const realized = {};
    for (const [key, delta] of Object.entries(cost)) {
        if (delta === undefined)
            continue;
        if (!isAssessed(key)) {
            realized[key] = delta;
            continue;
        }
        realized[key] = delta < 0 ? amplifiedCost(fragility, delta) : round3(delta * damping);
    }
    return realized;
}
/** The spent half and the assessed half of one price. */
export function splitPrice(cost) {
    const spent = {};
    const assessed = {};
    for (const [key, delta] of Object.entries(cost)) {
        if (delta === undefined || delta === 0)
            continue;
        (isAssessed(key) ? assessed : spent)[key] = delta;
    }
    return { spent: spent, assessed: assessed };
}
/**
 * The assessment a card prints and the Record freezes: the spent figures, the
 * assessed bands, how sure the room is, and why.
 *
 * Confidence is the health of the administration less what a doubted briefing
 * takes off it. On a healthy board the realized figure sits inside the band
 * the sticker price banded to, and the room says so with high confidence; the
 * more fragile the board, the wider the range a shock can land in.
 */
export function assessPosition(campaign, realized, options = {}) {
    const fragility = selectFragility(campaign);
    const { spent, assessed } = splitPrice(realized);
    const treasury = campaign.player.metrics.treasury;
    const impacts = Object.entries(assessed).flatMap(([domain, delta]) => delta === undefined || delta === 0 ? [] : [metricImpact(domain, delta, "next-turn", treasury, "estimated")]);
    const evidence = clamp01(1 - fragility.fragility - (options.briefingDoubted ? DOUBTED_BRIEFING_EVIDENCE : 0));
    const basis = explainAmplification(fragility) ??
        (polarizationDrift(campaign.player.opinion.polarization) > DIVIDED_PUBLIC
            ? "A divided public gives less credit than it charges."
            : "The country is in a condition to take this at its face value.");
    return { spent, assessed: impacts, confidence: confidenceFromEvidence(evidence), basis, asOf: campaign.calendar };
}
