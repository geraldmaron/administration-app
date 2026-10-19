import { describe, expect, it } from "vitest";
import { foundedForBalance } from "./balance-harness.js";
import { apply } from "./effects.js";
import { fiscalPhase, selectFiscalStatement } from "./fiscal.js";
import { selectDeficitDrivers } from "./fiscal-drivers.js";
import { subjectToLimit } from "./debt-limit.js";
// The deficit, split into the parts that put it there. The parts have to add
// up to the balance on the statement, in every state the books can be in, or
// the room that shows them is telling a different story from the one it sums.
const { campaign: FOUNDED } = foundedForBalance("fiscal-drivers");
const US = FOUNDED.founding.nation;
function states() {
    const investing = { ...FOUNDED, player: { ...FOUNDED.player, policies: { ...FOUNDED.player.policies, fiscal: "fiscal-investment" } } };
    const invested = fiscalPhase(investing).reduce(apply, investing);
    const bill = { id: "bill:act-tax-relief-and-growth:0", act: "act-tax-relief-and-growth", title: "", sponsor: "administration", introducedTurn: 0, status: "law", passage: [] };
    const taxCut = { ...FOUNDED, bills: { ...FOUNDED.bills, [bill.id]: bill } };
    const conflict = {
        id: "war:test", aggressor: US, defender: "MEX", joined: { aggressor: [], defender: [] }, startedTurn: 0, cause: "", intensity: 0.7,
        warSupport: { aggressor: 0.5, defender: 0.5 }, exhaustion: { aggressor: 0, defender: 0 }, status: "active", beats: [],
    };
    const warring = { ...FOUNDED, conflicts: { ...FOUNDED.conflicts, [conflict.id]: conflict } };
    const slump = { ...FOUNDED, nations: { ...FOUNDED.nations, [US]: { ...FOUNDED.nations[US], stats: { ...FOUNDED.nations[US].stats, economy: { ...FOUNDED.nations[US].stats.economy, gdp: FOUNDED.nations[US].stats.economy.gdp * 0.96, unemployment: 0.07 } } } } };
    const limit = FOUNDED.debtLimit;
    const withheld = {
        ...FOUNDED,
        debtLimit: { ...limit, base: subjectToLimit(limit, FOUNDED.nations[US].stats.economy.debt), bindingSince: 0, measuresLeft: 0, xDateTurn: FOUNDED.turn, measuresUsed: 0 },
    };
    return [["founded", FOUNDED], ["investing", invested], ["tax cut", taxCut], ["at war", warring], ["in a slump", slump], ["past the X-date", withheld]];
}
describe("what moved the deficit", () => {
    it("sums to the balance on the statement within a million, in every state the books can be in", () => {
        for (const [label, campaign] of states()) {
            const drivers = selectDeficitDrivers(campaign);
            const total = drivers.reduce((sum, driver) => sum + driver.amount, 0);
            expect(Math.abs(total - selectFiscalStatement(campaign).balance), label).toBeLessThanOrEqual(1);
        }
    });
    it("names the President's own part as the program's, and the inherited part first", () => {
        const [, invested] = states()[1];
        const drivers = selectDeficitDrivers(invested);
        expect(drivers[0].source).toBe("inherited");
        const program = drivers.find((driver) => driver.source === "program");
        expect(program.amount / selectFiscalStatement(invested).gdp).toBeCloseTo(-0.018, 2);
        const founded = selectDeficitDrivers(FOUNDED);
        expect(founded.map((driver) => driver.source)).toEqual(["inherited", "interest"]);
    });
    it("separates the cycle, a war, a law and the limit from what was inherited", () => {
        const by = new Map(states());
        const amount = (label, source) => selectDeficitDrivers(by.get(label)).find((driver) => driver.source === source).amount;
        expect(amount("tax cut", "laws")).toBeLessThan(0);
        expect(amount("at war", "world")).toBeLessThan(0);
        expect(amount("in a slump", "cycle")).toBeLessThan(0);
        expect(amount("past the X-date", "limit")).toBeGreaterThan(0);
    });
});
