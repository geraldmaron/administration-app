import { describe, expect, it } from "vitest";
import { foundedForBalance } from "./balance-harness.js";
import { forceProjectionCost } from "./geography.js";
import { PROJECTION_CAPS, liveNation, projectionAccess } from "./instrument-gates.js";
import { createRngStreams } from "./rng.js";
import { defenseAllies, stagingPoints } from "./staging.js";
const { campaign } = foundedForBalance("staging", "democrat", {}, { carriedWorld: false });
const ctx = (actor, target) => ({ campaign, actor: actor, target: target, streams: createRngStreams(campaign.seed) });
describe("reach follows basing and access", () => {
    it("lets the United States mount an invasion where it has bases or treaty allies near the target, as well as next door", () => {
        for (const target of ["IRQ", "AFG", "KWT", "SAU", "KOR", "JPN", "DEU", "CAN", "VEN"]) {
            expect(projectionAccess(ctx("USA", target), PROJECTION_CAPS[5], "reach").ok, target).toBe(true);
        }
    });
    it("measures a government with no bases abroad and no treaty allies from its own capital, as before", () => {
        expect(defenseAllies(campaign, "VEN")).toEqual([]);
        expect(stagingPoints(campaign, "VEN", "IRQ")).toEqual([]);
        expect(projectionAccess(ctx("VEN", "IRQ"), PROJECTION_CAPS[5], "reach").ok).toBe(false);
    });
    it("never stages against a government from its own soil as an ally, while forces already based there still count", () => {
        const germany = liveNation(campaign, "DEU").geo;
        const points = stagingPoints(campaign, "USA", "DEU");
        expect(points.some((point) => point.leadInKm > 0 && point.lat === germany.lat && point.lon === germany.lon)).toBe(false);
        expect(points.some((point) => point.leadInKm === 0)).toBe(true);
    });
    it("never makes a target dearer to reach than from home", () => {
        const usa = liveNation(campaign, "USA");
        for (const target of ["IRQ", "VEN", "MEX", "CHN"]) {
            const nation = liveNation(campaign, target);
            expect(forceProjectionCost(usa, nation, stagingPoints(campaign, usa.id, nation.id)).multiplier, target).toBeLessThanOrEqual(forceProjectionCost(usa, nation).multiplier);
        }
    });
});
