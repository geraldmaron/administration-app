import { describe, expect, it } from "vitest";
import { COHORT_AXES, COHORT_IDS, cohortsOfAxis } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { BASELINE_JITTER_SHARE, cohortBaselineShares } from "./cohort-baseline.js";
import { cohortStartingPoints, cohortSupport, nationalCohortShares } from "./demos.js";
import { approvalFor, recomputeApproval } from "./opinion.js";
import { cohortBlocShares } from "./cohort-blocs.js";
import { stateApprovals } from "./regional-opinion.js";
import { routeCohorts } from "./route-cohorts.js";
import { createSave, loadSave } from "./save.js";
import { COHORT_PARTISAN_BASELINE } from "./state-cohort-sensitivity.js";
const logit = (p) => Math.log(p / (1 - p));
const founded = (seed, party = "democrat") => foundedForBalance(seed, party).campaign;
/** Every cohort at the same share: no group starts apart from any other, the reading before the baseline existed. */
const flat = (campaign) => ({ ...campaign, cohortBaseline: Object.fromEntries(COHORT_IDS.map((cohort) => [cohort, 0.5])) });
function axisMean(campaign, axis) {
    const shares = nationalCohortShares(campaign);
    const cells = cohortsOfAxis(axis);
    const mass = cells.reduce((sum, cohort) => sum + shares[cohort], 0);
    return cells.reduce((sum, cohort) => sum + shares[cohort] * cohortStartingPoints(campaign)[cohort], 0) / mass;
}
describe("the partisan baseline", () => {
    it.each(["democrat", "republican"])("leaves the headline and every state's approval exactly where they were (%s)", (party) => {
        const campaign = founded(`baseline-headline-${party}`, party);
        const before = flat(campaign);
        expect(approvalFor(campaign)).toBe(approvalFor(before));
        expect(recomputeApproval(campaign).player.metrics.approval).toBe(recomputeApproval(before).player.metrics.approval);
        expect(stateApprovals(campaign)).toEqual(stateApprovals(before));
    });
    it("keeps every axis's share-weighted average near where an even country puts it", () => {
        // One tilt per group matches its measured baseline exactly; across an axis the
        // tilted mixtures re-aggregate to the national blocs only approximately, and
        // nothing calibrates them back. The tolerance is the stated one.
        const campaign = founded("baseline-axis");
        for (const axis of COHORT_AXES)
            expect(Math.abs(axisMean(campaign, axis) - axisMean(flat(campaign), axis)), axis).toBeLessThan(0.06);
    });
    it("makes every group the national mix of blocs when no group starts apart", () => {
        const campaign = flat(founded("baseline-flat"));
        const first = cohortBlocShares(campaign, COHORT_IDS[0]);
        for (const cohort of COHORT_IDS) {
            const mix = cohortBlocShares(campaign, cohort);
            for (const bloc of Object.keys(first))
                expect(mix[bloc], `${cohort} ${bloc}`).toBeCloseTo(first[bloc], 9);
        }
    });
    it("orders the groups as the data does, mirrored between a Republican and a Democratic President on the same seed", () => {
        const rep = founded("baseline-mirror", "republican");
        const dem = founded("baseline-mirror", "democrat");
        const pairs = [
            ["rural", "urban"],
            ["race-white", "race-black"],
            ["veteran", "non-veteran"],
            ["age-65-plus", "age-under-35"],
            ["no-degree", "degree"],
            ["goods-producing", "professional-technical"],
            ["sex-male", "sex-female"],
        ];
        for (const [right, left] of pairs) {
            expect(cohortSupport(rep, right), `${right} over ${left} for a Republican`).toBeGreaterThan(cohortSupport(rep, left));
            expect(cohortSupport(dem, right), `${right} under ${left} for a Democrat`).toBeLessThan(cohortSupport(dem, left));
        }
        // The baseline's own part of each reading mirrors exactly; the rest is each group's lens on the week, which no party flips.
        const lift = (campaign, cohort) => logit(cohortStartingPoints(campaign)[cohort]) - logit(cohortStartingPoints(flat(campaign))[cohort]);
        for (const axis of COHORT_AXES) {
            const order = (campaign) => [...cohortsOfAxis(axis)].sort((a, b) => lift(campaign, a) - lift(campaign, b));
            expect(order(rep), axis).toEqual([...order(dem)].reverse());
        }
    });
    it("puts groups realistically far apart: Black voters well below white voters for a Republican", () => {
        const rep = founded("baseline-gap", "republican");
        expect(cohortSupport(rep, "race-white") - cohortSupport(rep, "race-black")).toBeGreaterThan(0.3);
    });
    it("is the same draw for the same seed, a different one for another, each inside the estimate's error", () => {
        const first = founded("baseline-seed");
        expect(founded("baseline-seed").cohortBaseline).toEqual(first.cohortBaseline);
        expect(founded("baseline-other").cohortBaseline).not.toEqual(first.cohortBaseline);
        for (const cohort of COHORT_IDS) {
            const { republican, se } = COHORT_PARTISAN_BASELINE[cohort];
            expect(Math.abs(first.cohortBaseline[cohort] - republican), cohort).toBeLessThan(5 * se * BASELINE_JITTER_SHARE + 0.001);
        }
    });
    it("reads an older save, which has no draw, on the sourced shares, and keeps a draw across a save and a load", () => {
        const { cohortBaseline: _drop, ...older } = founded("baseline-older");
        const shares = cohortBaselineShares(older);
        for (const cohort of COHORT_IDS)
            expect(shares[cohort]).toBe(COHORT_PARTISAN_BASELINE[cohort].republican);
        const campaign = founded("baseline-save");
        expect(loadSave(JSON.parse(JSON.stringify(createSave(campaign)))).cohortBaseline).toEqual(campaign.cohortBaseline);
    });
    it("never changes how an act reaches a cohort", () => {
        const campaign = founded("baseline-reach");
        const signature = { signature: "plant-closed", reason: "A plant closed.", magnitude: "heavy", axes: { industrial: -1 }, channels: { veterans: 1 } };
        const routed = ["MI", "OH"].map((state) => ({ kind: "state", state, deltas: { lean: 0.01 }, reason: "test" }));
        expect(routeCohorts(campaign, signature, routed)).toEqual(routeCohorts(flat(campaign), signature, routed));
    });
});
