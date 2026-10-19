import { COHORT_IDS } from "@admin/world";
import { cohortBaselineShares } from "./cohort-baseline.js";
import { BLOC_HABIT, BLOC_INTERCEPT, BLOC_TURNOUT_CAP, BLOCS, LEANER_PARTISANSHIP, PARTY_BLOCS, PARTY_LOYALTY, orientedShares, partyShares, } from "./electorate.js";
import { ERA_POLARIZATION } from "./polarization.js";
// Each cohort as a measured mixture of the five blocs.
//
// Cohorts are marginals on overlapping axes and there is no joint table, so a
// cohort's bloc composition is the national composition tilted toward one
// party until the cohort votes, at a neutral record, the way the Cooperative
// Election Study measured it (its partisan baseline, jittered per campaign).
// A cohort's partisan baseline therefore falls out of the blocs rather than
// being added to the cohort's reading, and nothing calibrates a cohort back
// onto the headline: cohort readings are a view of the same five blocs, and
// the headline never reads them.
//
// Re-aggregation is not exact. The tilt is one parameter per cohort, and
// across an axis the tilted compositions sum back to the national shares only
// approximately (within a few points on the place axis; DESIGN-VERIFY measured
// up to 5.5 after raking, which is why no raking step is taken). The baseline
// is matched exactly; the aggregate is a stated tolerance.
// Built on first use rather than at load: this module sits in an import cycle
// with the electorate (opinion reads cohorts, cohorts read the blocs), so a
// table built from its constants at load could read them before they exist.
let tables;
/** Republican-side partisanship of each bloc, +1 Republican identifiers to -1 Democratic, and each bloc's turnout habit. */
function partyTables() {
    tables ??= {
        lean: { republicanId: 1, republicanLean: LEANER_PARTISANSHIP, pure: 0, democraticLean: -LEANER_PARTISANSHIP, democraticId: -1 },
        habit: { republicanId: BLOC_HABIT.ownId, republicanLean: BLOC_HABIT.ownLean, pure: BLOC_HABIT.pure, democraticLean: BLOC_HABIT.oppLean, democraticId: BLOC_HABIT.oppId },
    };
    return tables;
}
const logistic = (value) => 1 / (1 + Math.exp(-value));
function tilted(shares, theta) {
    const { lean } = partyTables();
    const raw = PARTY_BLOCS.map((bloc) => shares[bloc] * Math.exp(theta * lean[bloc]));
    const total = raw.reduce((sum, value) => sum + value, 0);
    return Object.fromEntries(PARTY_BLOCS.map((bloc, index) => [bloc, raw[index] / total]));
}
/** The Republican two-party vote of a composition at a neutral record and the era's division. */
function neutralRepublicanVote(shares) {
    const { lean, habit } = partyTables();
    let cast = 0;
    let republican = 0;
    for (const bloc of PARTY_BLOCS) {
        const voters = shares[bloc] * habit[bloc];
        cast += voters;
        republican += voters * logistic((BLOC_INTERCEPT * ERA_POLARIZATION + PARTY_LOYALTY) * lean[bloc]);
    }
    return cast > 0 ? republican / cast : 0.5;
}
// A tilt of twelve is past any share the baseline floor allows; sixty halvings is below a double's spacing on it.
const TILT_BOUND = 12;
const TILT_STEPS = 60;
/** The composition whose neutral vote is this cohort's measured baseline. */
export function compositionFor(shares, republicanBaseline) {
    let low = -TILT_BOUND;
    let high = TILT_BOUND;
    for (let step = 0; step < TILT_STEPS; step += 1) {
        const middle = (low + high) / 2;
        if (neutralRepublicanVote(tilted(shares, middle)) < republicanBaseline)
            low = middle;
        else
            high = middle;
    }
    return tilted(shares, (low + high) / 2);
}
// Campaigns are immutable values, so a composition keyed on the object cannot go stale.
const byCampaign = new WeakMap();
// The founding draws behind it change only with a new campaign, so a handful of keys covers every reader.
const byDraw = new Map();
const MAX_DRAWS = 16;
/** Every cohort's bloc composition by party, derived from the founding draws and never stored. */
export function cohortCompositions(campaign) {
    const cached = byCampaign.get(campaign);
    if (cached)
        return cached;
    const shares = partyShares(campaign);
    const baseline = cohortBaselineShares(campaign);
    const key = JSON.stringify([shares, baseline]);
    let out = byDraw.get(key);
    if (!out) {
        out = Object.fromEntries(COHORT_IDS.map((cohort) => [cohort, compositionFor(shares, baseline[cohort])]));
        if (byDraw.size >= MAX_DRAWS)
            byDraw.delete(byDraw.keys().next().value);
        byDraw.set(key, out);
    }
    byCampaign.set(campaign, out);
    return out;
}
/** One cohort's composition from the President's side of the aisle. */
export function cohortBlocShares(campaign, cohort) {
    return orientedShares(cohortCompositions(campaign)[cohort], campaign.congress.caucusAnchor);
}
/**
 * How much a hurt cohort's own-side and other-side blocs change their turnout
 * per unit of unforgiven harm. Halved from the cohort turnout layer's 0.2,
 * because cohorts overlap across eleven axes and their displacements sum.
 * Design judgment, labeled.
 */
export const BLOC_DISILLUSION = 0.1;
export const BLOC_MOBILIZATION = 0.1;
/**
 * Each bloc's turnout displacement from what this administration has done to
 * the cohorts its members belong to: the President's own blocs stay home where
 * their people were hurt, the opposition's turn out. Summed as main effects
 * across axes and capped per bloc.
 */
export function blocTurnoutShift(campaign, harm, cohortShare, partisanship) {
    const national = orientedShares(partyShares(campaign), campaign.congress.caucusAnchor);
    const sums = Object.fromEntries(BLOCS.map((bloc) => [bloc, 0]));
    for (const cohort of COHORT_IDS) {
        const hurt = harm[cohort] ?? 0;
        if (hurt <= 0)
            continue;
        const composition = cohortBlocShares(campaign, cohort);
        for (const bloc of BLOCS) {
            const pi = partisanship[bloc];
            const response = pi > 0 ? -BLOC_DISILLUSION * pi : pi < 0 ? BLOC_MOBILIZATION * -pi : 0;
            sums[bloc] += (cohortShare[cohort] * composition[bloc] * hurt * response) / Math.max(national[bloc], 1e-6);
        }
    }
    return Object.fromEntries(BLOCS.map((bloc) => [bloc, Math.max(-BLOC_TURNOUT_CAP, Math.min(BLOC_TURNOUT_CAP, sums[bloc]))]));
}
