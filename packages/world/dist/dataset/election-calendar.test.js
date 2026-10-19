// Holds the parsed foreign election calendar to the copied audit table.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ELECTION_CALENDAR, calendarRow, scheduledSelection } from "./election-calendar.js";
const SEED = fileURLToPath(new URL("./seed/nation-election-calendar.tsv", import.meta.url));
function seedRows() {
    const lines = readFileSync(SEED, "utf8")
        .trim()
        .split("\n")
        .filter((line) => line.length > 0 && !line.startsWith("#"));
    const [header, ...data] = lines;
    const columns = header.split("\t");
    return data.map((line) => {
        const cells = line.split("\t");
        const raw = Object.fromEntries(columns.map((column, index) => [column, cells[index] ?? ""]));
        return {
            nationId: raw.nation_id,
            leaderSeat: raw.leader_seat,
            electionType: raw.election_type,
            fixedOrFlexible: raw.fixed_or_flexible,
            nextEvent: raw.next_event_in_window,
            precision: raw.precision,
            termLengthYears: raw.term_length_years,
            basis: raw.basis,
            confidence: raw.confidence,
            preOathCrossCheck: raw.pre_oath_cross_check,
        };
    });
}
/** A YYYY-MM or YYYY-MM-DD at the start of the cell. A month cell has no day. */
function statedWhen(cell) {
    if (cell.startsWith("none"))
        return null;
    const match = /^(\d{4})-(\d{2})(?:-(\d{2}))?(?:$| )/.exec(cell);
    if (!match?.[1] || !match[2])
        return null;
    const when = { year: Number(match[1]), month: Number(match[2]) };
    if (!match[3])
        return when;
    return { ...when, day: Number(match[3]) };
}
function monthKey(when) {
    const month = String(when.month).padStart(2, "0");
    return `${when.year}-${month}`;
}
describe("the foreign election calendar", () => {
    it("holds 195 governments, the copied table", () => {
        const seed = seedRows();
        expect(seed).toHaveLength(195);
        expect(ELECTION_CALENDAR).toHaveLength(195);
        expect(ELECTION_CALENDAR.map((row) => row.nationId)).toEqual(seed.map((row) => row.nationId));
        for (const [index, source] of seed.entries()) {
            const row = ELECTION_CALENDAR[index];
            expect(row, source.nationId).toMatchObject({
                nationId: source.nationId,
                leaderSeat: source.leaderSeat,
                electionType: source.electionType,
                fixedOrFlexible: source.fixedOrFlexible,
                nextEvent: source.nextEvent,
                precision: source.precision,
                termLengthYears: source.termLengthYears,
                basis: source.basis,
                confidence: source.confidence,
                preOathCrossCheck: source.preOathCrossCheck,
            });
            expect(row.when, source.nationId).toEqual(statedWhen(source.nextEvent));
            if (row.precision !== "exact_date")
                expect(row.when?.day, source.nationId).toBeUndefined();
        }
    });
    it("gives Afghanistan no scheduled selection", () => {
        expect(calendarRow("AFG")?.nextEvent.startsWith("none")).toBe(true);
        expect(calendarRow("AFG")?.when).toBeNull();
        expect(scheduledSelection("AFG")).toBeNull();
    });
    it("schedules Belgium for 2029-06 on a carried row", () => {
        const belgium = scheduledSelection("BEL");
        expect(belgium?.basis).toBe("carried");
        expect(belgium?.precision).toBe("month");
        expect(belgium?.confidence).toBe("high");
        expect(belgium?.when).toEqual({ year: 2029, month: 6 });
        expect(belgium?.when ? monthKey(belgium.when) : null).toBe("2029-06");
        expect(belgium?.when?.day).toBeUndefined();
    });
    it("does not schedule Ireland, and the conflicts are Ireland, Luxembourg, Nepal, and Serbia", () => {
        expect(scheduledSelection("IRL")).toBeNull();
        expect(calendarRow("IRL")?.nextEvent.startsWith("CONFLICT")).toBe(true);
        const conflicts = ELECTION_CALENDAR.filter((row) => row.nextEvent.startsWith("CONFLICT")).map((row) => row.nationId);
        expect(conflicts).toEqual(["IRL", "LUX", "NPL", "SRB"]);
        for (const nationId of conflicts)
            expect(scheduledSelection(nationId)).toBeNull();
    });
    it("returns a scheduling fact only for a carried or projected stated date", () => {
        for (const row of ELECTION_CALENDAR) {
            const fact = row.when !== null && (row.basis === "carried" || row.basis === "projected") && !row.nextEvent.startsWith("CONFLICT");
            expect(scheduledSelection(row.nationId), row.nationId).toBe(fact ? row : null);
        }
        expect(calendarRow("USA")).toBeNull();
        expect(scheduledSelection("USA")).toBeNull();
    });
});
