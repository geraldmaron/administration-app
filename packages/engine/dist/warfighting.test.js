import { describe, expect, it } from "vitest";
import { computeMilitaryMetrics } from "@admin/world";
import { nationA } from "./__fixtures__/campaign.js";
import { forceProjectionProfile, liveMilitaryMetrics } from "./warfighting.js";
function withReadiness(stats, readiness) {
    return { ...stats, military: { ...stats.military, readiness } };
}
describe("what a nation can fight with this week", () => {
    it("reads the live stats, not the band the campaign was founded with", () => {
        const bled = withReadiness(nationA.stats, 0.1);
        expect(liveMilitaryMetrics(bled)).toEqual(computeMilitaryMetrics(bled));
        expect(forceProjectionProfile({ ...nationA, stats: bled }).expeditionary).toBeLessThan(forceProjectionProfile(nationA).expeditionary);
    });
    it("computes once for a set of stats and afresh the moment they are replaced", () => {
        const stats = withReadiness(nationA.stats, 0.4);
        const first = liveMilitaryMetrics(stats);
        expect(liveMilitaryMetrics(stats)).toBe(first);
        expect(liveMilitaryMetrics(withReadiness(stats, 0.4))).not.toBe(first);
        expect(liveMilitaryMetrics(withReadiness(stats, 0.2)).forceIndex).toBeLessThan(first.forceIndex);
    });
});
