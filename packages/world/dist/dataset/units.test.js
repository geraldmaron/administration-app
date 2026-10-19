import { describe, expect, it } from "vitest";
import { STAT_UNITS, describeFigure, formatFigure, gradeOf, statUnitPaths, unitFor } from "./units.js";
import { worldDataset } from "./index.js";
describe("the unit every authored figure is measured in", () => {
    // The point of the registry. A field added to NationStats without a unit is a
    // field a screen can only print as a bare number, so the walk fails the build
    // rather than waiting for somebody to notice on a dashboard.
    it("declares a unit for every leaf the schema defines", () => {
        const missing = statUnitPaths().filter((path) => !unitFor(path));
        expect(missing).toEqual([]);
    });
    it("declares no unit for a path the schema does not have", () => {
        const known = new Set(statUnitPaths());
        expect(Object.keys(STAT_UNITS).filter((path) => !known.has(path))).toEqual([]);
    });
    // The defect this whole module exists for, stated as a test: the US ships
    // trade.exports as 2_100_000 and that is USD millions, so a player must read
    // $2.1T and never "2,100,000".
    it("reads the US trade figures at the scale they were authored on", () => {
        const us = worldDataset.nations.find((nation) => nation.id === "USA");
        const spec = unitFor("trade.exports");
        expect(formatFigure(us.stats.trade.exports, spec)).toBe("$2.1T");
        expect(formatFigure(us.stats.trade.imports, unitFor("trade.imports"))).toBe("$3.2T");
        expect(formatFigure(us.stats.trade.balance, unitFor("trade.balance"))).toBe("-$1.1T");
    });
    it("keeps a per-capita currency on its own scale rather than the millions one", () => {
        expect(formatFigure(80_600, unitFor("economy.gdpPerCapita"))).toBe("$80.6K");
        expect(formatFigure(468_000, unitFor("economy.gdp"))).toBe("$468.0B");
    });
    // A share has a denominator somebody could count; an index does not. Printing
    // an assessment as a percentage claims a precision nobody measured — and
    // printing it as a decimal hands the player the storage format.
    it("shows a share as a percentage and an index as a graded word", () => {
        expect(formatFigure(0.83, unitFor("demography.urbanization"))).toBe("83.0%");
        expect(formatFigure(0.9, unitFor("military.doctrineQuality"))).toBe("Exceptional");
        expect(formatFigure(0.5, unitFor("security.counterIntel"))).toBe("Moderate");
    });
    it("never prints a bare decimal for an index, at any value in range", () => {
        for (let step = 0; step <= 100; step += 1) {
            const printed = formatFigure(step / 100, unitFor("politics.legitimacy"));
            expect(printed).toMatch(/^[A-Z][a-z]+$/);
        }
    });
    // The ladder is magnitude, not quality: roughly half the indexed fields are
    // ones where a big number is bad news, and a word that judged rather than
    // measured would invert on every one of them.
    it("grades by magnitude so it reads true whichever way the field points", () => {
        expect(gradeOf(0.05)).toBe("Negligible");
        expect(gradeOf(0.3)).toBe("Limited");
        expect(gradeOf(0.55)).toBe("Moderate");
        expect(gradeOf(0.7)).toBe("High");
        expect(gradeOf(0.95)).toBe("Exceptional");
    });
    it("puts every band boundary on the upper grade", () => {
        expect(gradeOf(0.25)).toBe("Limited");
        expect(gradeOf(0.45)).toBe("Moderate");
        expect(gradeOf(0.65)).toBe("High");
        expect(gradeOf(0.85)).toBe("Exceptional");
    });
    it("counts people in readable magnitudes rather than in full", () => {
        expect(formatFigure(334_892_847, unitFor("demography.population"))).toBe("334.9M");
        expect(formatFigure(1_388_484, unitFor("military.activeHeadcount"))).toBe("1.4M");
    });
    it("names what a count is counting, and lets money speak for itself", () => {
        expect(describeFigure(5_500, unitFor("military.arsenal.warheads"))).toBe("5.5K warheads");
        expect(describeFigure(2_100_000, unitFor("trade.exports"))).toBe("$2.1T");
    });
    it("carries the sign on a negative balance rather than dropping it", () => {
        expect(formatFigure(-1_100_000, unitFor("trade.balance")).startsWith("-$")).toBe(true);
    });
    // Every nation, not only the played one: a formatter that throws or returns
    // an empty string on some authored value is a blank figure on a screen.
    it("formats every authored figure in the shipped dataset", () => {
        for (const nation of worldDataset.nations) {
            for (const path of statUnitPaths()) {
                const spec = unitFor(path);
                if (spec.kind === "text")
                    continue;
                const value = path.split(".").reduce((node, key) => node?.[key], nation.stats);
                if (typeof value !== "number")
                    continue;
                expect(formatFigure(value, spec)).not.toBe("");
            }
        }
    });
});
