import { describe, expect, it } from "vitest";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { BLOCS, BLOC_FLATTENING, FOUNDING_MARGIN_HALF_RANGE, HEADLINE_ISSUE_CAP, HONEYMOON_VALENCE, HONEYMOON_WEEKS, IDENTIFIER_SLOPE_FLOOR, ZERO_ISSUE, blocApprovals, blocPartisanship, cappedIssue, displayRollup, erosionPassThrough, headlineOf, honeymoonValence, openingPartyShares, orientedShares, sharesAtMargin, valenceSlope, } from "./electorate.js";
import { approvalFor, selectElectorate } from "./opinion.js";
import { ERA_POLARIZATION, POLARIZATION_DRIFT_MAX, stepPolarization, weeklyReversion } from "./polarization.js";
import { createRngStreams, makeCampaignSeed } from "./rng.js";
import { flagMarker } from "./marked-flags.js";
function withMood(mood, turn = 1) {
    const base = buildCampaign();
    return { ...base, turn, player: { ...base.player, opinion: { ...base.player.opinion, ...mood } } };
}
function withScandal(campaign, flag) {
    return { ...campaign, player: { ...campaign.player, flags: { ...campaign.player.flags, [flag]: true, [flagMarker(flag, campaign.turn)]: true } } };
}
const inputs = (valence, polarization = ERA_POLARIZATION) => ({
    valence,
    polarization,
    erosion: 0,
    partisanship: blocPartisanship(false),
    issue: ZERO_ISSUE,
});
describe("the founding's party shares", () => {
    it("are symmetric around an even country, with the swing in the leaners", () => {
        const left = sharesAtMargin(FOUNDING_MARGIN_HALF_RANGE);
        const right = sharesAtMargin(-FOUNDING_MARGIN_HALF_RANGE);
        expect(left.democraticLean).toBeCloseTo(right.republicanLean, 9);
        expect(left.republicanId).toBe(right.democraticId);
        expect(sharesAtMargin(0).republicanLean).toBe(sharesAtMargin(0).democraticLean);
    });
    it("are drawn once per seed inside the range", () => {
        const first = openingPartyShares(createRngStreams(makeCampaignSeed("shares-a")));
        expect(openingPartyShares(createRngStreams(makeCampaignSeed("shares-a")))).toEqual(first);
        const margin = first.democraticLean - first.republicanLean;
        expect(Math.abs(margin)).toBeLessThanOrEqual(FOUNDING_MARGIN_HALF_RANGE / 0.99 + 1e-9);
    });
});
describe("mirror symmetry", () => {
    it("reads side, never party: mirrored shares give a Republican exactly what a Democrat gets", () => {
        const shares = sharesAtMargin(0.04);
        const mirrored = sharesAtMargin(-0.04);
        const approvals = blocApprovals(inputs(-0.7));
        const democrat = headlineOf(orientedShares(shares, "democrat"), approvals);
        const republican = headlineOf(orientedShares(mirrored, "republican"), approvals);
        expect(republican).toBeCloseTo(democrat, 12);
    });
});
describe("the bloc formula against Gallup's party readings, from the headline alone", () => {
    // Solve the record from the overall reading, then predict the party groups.
    // Gallup's independents include leaners. 2020s era, 2025 shares (D+5).
    const READINGS = [
        { what: "Trump, January 2020", overall: 0.49, own: 0.94, independent: 0.42, opposition: 0.07, anchor: "republican" },
        { what: "Trump, January 2021", overall: 0.34, own: 0.82, independent: 0.3, opposition: 0.04, anchor: "republican" },
        { what: "Biden, September 2021", overall: 0.43, own: 0.9, independent: 0.37, opposition: 0.06, anchor: "democrat" },
        { what: "Biden, term average", overall: 0.422, own: 0.85, independent: 0.39, opposition: 0.06, anchor: "democrat" },
    ];
    const shares2025 = sharesAtMargin(0.05);
    function predict(reading) {
        const shares = orientedShares(shares2025, reading.anchor);
        let low = -8;
        let high = 8;
        for (let step = 0; step < 80; step += 1) {
            const middle = (low + high) / 2;
            if (headlineOf(shares, blocApprovals(inputs(middle))) < reading.overall)
                low = middle;
            else
                high = middle;
        }
        const approvals = blocApprovals(inputs((low + high) / 2));
        const independents = ["ownLean", "pure", "oppLean"];
        const mass = independents.reduce((sum, bloc) => sum + shares[bloc], 0);
        return {
            own: approvals.ownId,
            opposition: approvals.oppId,
            independent: independents.reduce((sum, bloc) => sum + shares[bloc] * approvals[bloc], 0) / mass,
        };
    }
    const rmse = (errors) => Math.sqrt(errors.reduce((sum, e) => sum + e * e, 0) / errors.length);
    it("predicts own identifiers within 3 points, the opposition's within 2 and independents within 5 (RMSE)", () => {
        const predictions = READINGS.map((reading) => ({ reading, predicted: predict(reading) }));
        expect(rmse(predictions.map(({ reading, predicted }) => predicted.own - reading.own))).toBeLessThan(0.03 + 0.015);
        expect(rmse(predictions.map(({ reading, predicted }) => predicted.opposition - reading.opposition))).toBeLessThan(0.02 + 0.01);
        expect(rmse(predictions.map(({ reading, predicted }) => predicted.independent - reading.independent))).toBeLessThan(0.05);
    });
});
describe("polarization's reach over the blocs", () => {
    it("keeps every partisan moving with the record at every reachable stock", () => {
        for (const p of [0.85, 1, 1.25]) {
            expect(valenceSlope(1, p)).toBeGreaterThanOrEqual(IDENTIFIER_SLOPE_FLOOR);
            expect(1 - BLOC_FLATTENING * p).toBeGreaterThan(0);
        }
    });
    it("sets the identifier gap at a neutral record between 74 and 88 points across the reachable range", () => {
        for (const p of [0.85, 1, 1.19]) {
            const approvals = blocApprovals(inputs(0, p));
            const gap = approvals.ownId - approvals.oppId;
            expect(gap, `P ${p}`).toBeGreaterThan(0.74);
            expect(gap, `P ${p}`).toBeLessThan(0.88);
        }
    });
    it("holds at the anchor over eight quiet years and saturates a weekly wedge short of its ceiling", () => {
        let quiet = ERA_POLARIZATION;
        let wedge = ERA_POLARIZATION;
        for (let week = 0; week < 416; week += 1) {
            quiet -= Math.sign(quiet - ERA_POLARIZATION) * weeklyReversion(quiet);
            wedge = stepPolarization(wedge, 1);
            wedge -= Math.sign(wedge - ERA_POLARIZATION) * weeklyReversion(wedge);
        }
        expect(quiet).toBe(ERA_POLARIZATION);
        expect(wedge - ERA_POLARIZATION).toBeGreaterThan(0.15);
        expect(wedge - ERA_POLARIZATION).toBeLessThan(POLARIZATION_DRIFT_MAX);
    });
});
describe("the honeymoon", () => {
    it("opens at its full size, decays on a straight line and is gone by week 26", () => {
        expect(honeymoonValence(1)).toBe(HONEYMOON_VALENCE);
        expect(honeymoonValence(1 + HONEYMOON_WEEKS / 2)).toBeCloseTo(HONEYMOON_VALENCE / 2, 9);
        expect(honeymoonValence(1 + HONEYMOON_WEEKS)).toBe(0);
        expect(approvalFor(withMood({}, 1))).toBeGreaterThan(approvalFor(withMood({}, 40)));
    });
});
describe("the President's own side", () => {
    const poorly = (level) => ({ security: level, prosperity: level, services: level, competence: level, unity: level, integrity: 0 });
    it("does not leave over a story about a government it still believes honest, nor over doubt nobody is asking about", () => {
        expect(selectElectorate(withScandal(withMood({ integrity: 0.7 }), "scandal:bribery")).erosion).toBe(0);
        expect(selectElectorate(withMood({ integrity: 0 })).erosion).toBe(0);
        expect(selectElectorate(withScandal(withMood(poorly(0.3)), "scandal:bribery")).erosion).toBeGreaterThan(0);
    });
    it("passes a scandal through half as far in the 2020s as in a depolarized country", () => {
        expect(erosionPassThrough(0.5)).toBe(1);
        expect(erosionPassThrough(1)).toBeCloseTo(0.5, 12);
        expect(erosionPassThrough(1.25)).toBe(0.25);
    });
    it("falls with plain failure, so a failing President's own identifiers are no longer pinned", () => {
        const good = selectElectorate(withMood({ security: 0.7, prosperity: 0.7, services: 0.7, competence: 0.7, unity: 0.6, integrity: 0.7 }, 40));
        const bad = selectElectorate(withMood({ security: 0.25, prosperity: 0.25, services: 0.25, competence: 0.25, unity: 0.3, integrity: 0.6 }, 40));
        expect(bad.approvals.ownId).toBeLessThan(good.approvals.ownId);
        expect(bad.approvals.ownId).toBeGreaterThan(bad.headline);
    });
});
describe("issue terms", () => {
    it("cap the headline effect of an act every bloc agrees with", () => {
        const shares = orientedShares(sharesAtMargin(0), "democrat");
        const consensus = Object.fromEntries(BLOCS.map((bloc) => [bloc, 0.3]));
        const base = inputs(-0.3);
        const capped = cappedIssue(shares, { ...base, issue: consensus });
        const effect = headlineOf(shares, blocApprovals({ ...base, issue: capped })) - headlineOf(shares, blocApprovals(base));
        expect(Math.abs(effect)).toBeLessThanOrEqual(HEADLINE_ISSUE_CAP + 1e-9);
    });
});
describe("the three blocs a player is shown", () => {
    it("add back up to the headline", () => {
        const reading = selectElectorate(buildCampaign());
        const rollup = displayRollup(reading.shares, reading.approvals);
        const total = Object.values(rollup).reduce((sum, entry) => sum + entry.share * entry.value, 0);
        expect(total).toBeCloseTo(reading.headline, 9);
        expect(rollup.own.value).toBeGreaterThan(rollup.independent.value);
        expect(rollup.independent.value).toBeGreaterThan(rollup.opposition.value);
    });
});
