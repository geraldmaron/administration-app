import { describe, expect, it } from "vitest";
import { METRICS, METRIC_SURFACES, metricFor, metricRejection, metricsOf, needsScale } from "./metrics.js";
import { METRIC_COPY } from "./metric-copy.js";
import { STAT_UNITS } from "./units.js";
import { statLeafPaths } from "./stat-consumers.js";
describe("the metric registry covers the schema", () => {
    it("describes every metric, and describes nothing the schema does not have", () => {
        const undescribed = METRICS.filter((metric) => metric.description.trim().length === 0).map((metric) => metric.recordPath);
        expect(undescribed).toEqual([]);
        const known = new Set(METRICS.map((metric) => metric.recordPath));
        expect(Object.keys(METRIC_COPY).filter((path) => !known.has(path))).toEqual([]);
    });
    it("carries every stat leaf the unit registry carries, with its unit attached", () => {
        const statPaths = metricsOf("stats").map((metric) => metric.path);
        expect(statPaths).toEqual(statLeafPaths());
        for (const metric of metricsOf("stats"))
            expect(metric.unit).toBe(STAT_UNITS[metric.path]);
    });
    it("says what both ends mean on every reading that has no natural unit", () => {
        const silent = METRICS.filter((metric) => needsScale(metric) && !metric.scale).map((metric) => metric.recordPath);
        expect(silent).toEqual([]);
    });
    it("reads bounds and options off the schema rather than restating them", () => {
        expect(metricFor("stats.economy.inflation")).toMatchObject({ valueType: "number", min: -0.1, max: 2 });
        expect(metricFor("stats.military.arsenal.warheads")).toMatchObject({ valueType: "integer", min: 0 });
        expect(metricFor("bands.powerTier")).toMatchObject({ valueType: "integer", min: 1, max: 5, provenance: "derived" });
        expect(metricFor("stats.economy.sovereignRating")?.options).toEqual(["AAA", "AA", "A", "BBB", "BB", "B", "CCC", "D"]);
        expect(metricFor("doctrine.posture")?.options).toEqual(["defensive", "balanced", "assertive", "expansionist"]);
        expect(metricFor("geo.disasterExposure.flood")).toMatchObject({ optional: true, min: 0, max: 1 });
    });
    it("names the assembly step behind every derived value, and no authored one", () => {
        for (const metric of METRICS) {
            if (metric.provenance === "authored")
                expect(metric.derivedBy).toBeUndefined();
            else
                expect(metric.derivedBy).toBeTruthy();
        }
        expect(metricFor("stats.demography.growthRate")?.provenance).toBe("derived");
        expect(metricFor("stats.trade.topPartners")?.provenance).toBe("derived");
        expect(metricFor("geo.neighbors")?.provenance).toBe("derived");
        expect(metricFor("person.competence")?.provenance).toBe("runtime");
        expect(metricFor("relationship.trust")?.provenance).toBe("runtime");
    });
    it("carries the consumer the registry records, so a page cannot claim a reader the code lacks", () => {
        expect(metricFor("stats.economy.reserves")?.readBy).toEqual(["packages/world/src/dataset/bands.ts#wealthTier"]);
        expect(metricFor("stats.economy.reserves")?.purpose).toBe("bands.wealthTier");
        expect(metricFor("stats.economy.reserves")).toMatchObject({ kind: "stock", writePolicy: "effect-written" });
        expect(metricFor("bands.militaryMetrics.sustainability.industrialMobilization")?.owedBy).toMatch(/^a wartime production model/);
    });
    it("offers for editing exactly the authored scalars, never a derived field, a list or the id", () => {
        expect(metricFor("stats.economy.gdp")?.editable).toBe(true);
        expect(metricFor("doctrine.posture")?.editable).toBe(true);
        expect(metricFor("traits.aggression")?.editable).toBe(true);
        expect(metricFor("id")?.editable).toBe(false);
        expect(metricFor("bands.powerTier")?.editable).toBe(false);
        expect(metricFor("stats.trade.topExports")?.editable).toBe(false);
        expect(metricFor("stats.demography.growthRate")?.editable).toBe(false);
        expect(metricFor("person.age")?.editable).toBe(false);
    });
    it("covers every surface", () => {
        for (const surface of METRIC_SURFACES)
            expect(metricsOf(surface).length).toBeGreaterThan(0);
    });
});
describe("what a proposed value is refused for", () => {
    it("refuses a number outside the schema's bounds, in the schema's own terms", () => {
        expect(metricRejection(metricFor("stats.economy.inflation"), 3)).toMatch(/at most 2/);
        expect(metricRejection(metricFor("stats.economy.inflation"), 0.04)).toBeUndefined();
        expect(metricRejection(metricFor("stats.military.arsenal.warheads"), 2.5)).toMatch(/whole number/);
        expect(metricRejection(metricFor("stats.military.arsenal.warheads"), -1)).toMatch(/at least 0/);
    });
    it("refuses an option an enum does not admit, and a derived field outright", () => {
        expect(metricRejection(metricFor("doctrine.posture"), "hostile")).toMatch(/one of defensive/);
        expect(metricRejection(metricFor("doctrine.posture"), "assertive")).toBeUndefined();
        expect(metricRejection(metricFor("bands.powerTier"), 5)).toMatch(/derived/);
    });
});
