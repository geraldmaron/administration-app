// The calendar's dated selections: the day rule, the pre-oath set, the first
// selection on or after the oath, and the roster the calendar covers.
import { describe, expect, it } from "vitest";
import { worldDataset } from "./index.js";
import { checkElectionCalendar } from "../validate/election-calendar-checks.js";
import { CALENDAR_OATH, ELECTION_CALENDAR, MONTH_PRECISION_DAY, calendarRow, preOathSelection, termYears, windowSelection, } from "./election-calendar.js";
const key = (date) => date.year * 10_000 + date.month * 100 + date.day;
const OATH = key(CALENDAR_OATH);
describe("the calendar's dated selections", () => {
    it("covers every government abroad, and not the President's own country", () => {
        const abroad = worldDataset.nations.filter((nation) => !nation.playable).map((nation) => nation.id).sort();
        expect(ELECTION_CALENDAR.map((row) => row.nationId).sort()).toEqual(abroad);
        expect(calendarRow("USA")).toBeNull();
        expect(checkElectionCalendar(worldDataset)).toEqual([]);
    });
    it("puts a month cell on the day rule and says so, and keeps a stated day", () => {
        expect(windowSelection("BEL")).toEqual({ nationId: "BEL", date: { year: 2029, month: 6, day: MONTH_PRECISION_DAY }, standing: "scheduled", planningDay: true });
        expect(windowSelection("CAN")).toEqual({ nationId: "CAN", date: { year: 2029, month: 10, day: 15 }, standing: "scheduled", planningDay: false });
    });
    it("holds every pre-oath selection strictly before the oath, and counts the set", () => {
        const set = ELECTION_CALENDAR.flatMap((row) => {
            const pre = preOathSelection(row.nationId);
            return pre ? [pre] : [];
        });
        for (const pre of set)
            expect(key(pre.date), pre.nationId).toBeLessThan(OATH);
        // The leader table's README says 77 and the researcher counted about 80
        // before 2029-02; January 2029 at month precision falls on the fifteenth,
        // before the oath, which is the day rule's choice rather than the table's.
        expect(set.length).toBeGreaterThanOrEqual(77);
        expect(set.length).toBeLessThanOrEqual(81);
        for (const nationId of ["COM", "VUT"])
            expect(preOathSelection(nationId)?.planningDay, nationId).toBe(true);
    });
    it("puts the first selection in the window on or after the oath, and labels estimates and conflicts", () => {
        for (const row of ELECTION_CALENDAR) {
            const selection = windowSelection(row.nationId);
            if (!selection)
                continue;
            expect(key(selection.date), row.nationId).toBeGreaterThanOrEqual(OATH);
        }
        expect(windowSelection("IRL")?.standing).toBe("conflict");
        expect(windowSelection("AUS")).toMatchObject({ standing: "estimated", planningDay: true });
        expect(windowSelection("AFG")).toBeNull();
        expect(windowSelection("PHL")).toBeNull();
    });
    it("carries a row that names only a pre-oath date one term past it", () => {
        const vanuatu = windowSelection("VUT");
        const pre = preOathSelection("VUT");
        expect(vanuatu.date).toEqual({ ...pre.date, year: pre.date.year + termYears("VUT") });
    });
    it("reads the first whole number of a term cell, and none where the table gives none", () => {
        expect(termYears("DEU")).toBe(4);
        expect(termYears("AFG")).toBeNull();
    });
});
