import { describe, expect, it } from "vitest";
import { selectFiscalStatement, selectMacroDrivers } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { formatMoney } from "../format/money";
import { deficitDriverReading, rateDriverReadings } from "./fiscal-drivers";
const base = openingCampaign();
const RAW_SOURCES = ["rest", "cycle", "program", "impulse", "conditions", "world", "gap", "inherited", "laws", "orders", "interest", "limit"];
describe("what moved each figure, as the room prints it", () => {
    it("names every part of a rate in words, to a tenth of a point", () => {
        const readings = rateDriverReadings(base);
        expect(readings.map((reading) => reading.rate)).toEqual(["growth", "inflation", "unemployment"]);
        for (const reading of readings) {
            for (const row of reading.rows) {
                expect(RAW_SOURCES).not.toContain(row.label.toLowerCase());
                expect(row.figure).toMatch(/^([+−]\d+\.\d|0\.0) pts$/);
            }
        }
    });
    it("says where a rate's parts add up to, which is where it is heading", () => {
        const growth = rateDriverReadings(base).find((reading) => reading.rate === "growth");
        const sum = selectMacroDrivers(base, base.founding.nation).growth.reduce((total, driver) => total + driver.amount, 0);
        expect(growth.heading).toBe(`${sum < 0 ? "−" : ""}${(Math.round(Math.abs(sum) * 1000) / 10).toFixed(1)}%`);
        expect(growth.now).toMatch(/%$/);
    });
    it("prices each part of the deficit in dollars a year, and adds them to the year's balance", () => {
        const reading = deficitDriverReading(base);
        for (const row of reading.rows) {
            expect(RAW_SOURCES).not.toContain(row.label.toLowerCase());
            expect(row.figure).toMatch(/^-?\$\d.* a year$/);
        }
        expect(reading.balance).toBe(`${formatMoney(selectFiscalStatement(base).balance)} a year`);
    });
    it("carries each part's signed amount, so a screen can draw the parts against each other", () => {
        const growth = rateDriverReadings(base).find((reading) => reading.rate === "growth");
        const drivers = selectMacroDrivers(base, base.founding.nation).growth;
        expect(growth.rows.map((row) => row.amount)).toEqual(drivers.map((driver) => driver.amount));
        const deficit = deficitDriverReading(base);
        expect(deficit.rows.every((row) => Number.isFinite(row.amount))).toBe(true);
    });
});
