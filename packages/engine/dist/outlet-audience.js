import { COHORT_IDS, IDEOLOGY_AXES } from "@admin/world";
import { COHORT_MOTIVATION, nationalCohortShares } from "./demos.js";
import { FORMAT_PARTISANSHIP } from "./press-outlets.js";
/** How many over-represented cohorts a profile names. */
const NAMED = 3;
// The widest two belief vectors can sit apart on three axes of −1..1.
const WIDEST = 2 * Math.sqrt(IDEOLOGY_AXES.length);
/**
 * How strongly a cohort is drawn to a desk, 0..1: the closer their beliefs, the
 * stronger, sharpened by the format's partisanship, since the audience of a
 * partisan channel sorts by politics far harder than a newspaper's does.
 */
function affinity(cohort, outlet) {
    const beliefs = COHORT_MOTIVATION[cohort].beliefs;
    const distance = Math.sqrt(IDEOLOGY_AXES.reduce((sum, axis) => sum + (beliefs[axis] - outlet.beliefs[axis]) ** 2, 0));
    return Math.max(0, 1 - distance / WIDEST) ** FORMAT_PARTISANSHIP[outlet.format];
}
/**
 * The desk's audience, read off the country's cohort shares. The index is how
 * strongly a cohort is drawn to the desk over how strongly the country as a
 * whole is, weighting every cohort by its share of the country, so a large
 * cohort and a small one compare on one scale.
 */
export function outletAudience(campaign, outlet) {
    const shares = nationalCohortShares(campaign);
    const draw = Object.fromEntries(COHORT_IDS.map((cohort) => [cohort, affinity(cohort, outlet)]));
    const mean = COHORT_IDS.reduce((sum, cohort) => sum + draw[cohort] * shares[cohort], 0) / Math.max(1e-9, COHORT_IDS.reduce((sum, cohort) => sum + shares[cohort], 0));
    const leans = COHORT_IDS.filter((cohort) => shares[cohort] > 0)
        .map((cohort) => ({
        cohort,
        name: COHORT_MOTIVATION[cohort].name,
        index: Math.round((mean > 0 ? draw[cohort] / mean : 1) * 100) / 100,
    }))
        .sort((a, b) => b.index - a.index || a.cohort.localeCompare(b.cohort))
        .slice(0, NAMED);
    return { reach: outlet.reach, leans };
}
