import { describe, expect, it } from "vitest";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { daysBetween, nthWeekdayOfMonth, selectDateOfTurn, selectTurnOfDate } from "./clock.js";
import { scheduleSupremeArgument } from "./court-calendar.js";
import { recordSolicitorGeneral, standingAdjustment } from "./solicitor-general.js";
function at(date) {
    const base = buildCampaign();
    return { ...base, calendar: date, turn: selectTurnOfDate(base, date) + 1 };
}
describe("Supreme Court term calendar", () => {
    it("places spring grants in the current term and late-spring grants in the next term", () => {
        const spring = at({ year: 2029, month: 3, day: 1 });
        const first = scheduleSupremeArgument(spring);
        expect(first.termYear).toBe(2028);
        expect(first.argumentTurn).toBeGreaterThan(spring.turn);
        expect(first.opinionTurn).toBeGreaterThan(first.argumentTurn);
        expect(first.opinionTurn).toBeLessThanOrEqual(first.opinionTargetTurn);
        const summer = at({ year: 2029, month: 6, day: 1 });
        const carried = scheduleSupremeArgument(summer);
        const opening = nthWeekdayOfMonth(2029, 10, 1, 1);
        expect(carried.termYear).toBe(2029);
        expect(daysBetween(opening, selectDateOfTurn(summer, carried.argumentTurn))).toBeGreaterThanOrEqual(0);
        expect(carried.opinionTurn).toBeLessThanOrEqual(carried.opinionTargetTurn);
        expect(daysBetween(selectDateOfTurn(summer, carried.opinionTurn), { year: 2030, month: 6, day: 30 })).toBeGreaterThanOrEqual(0);
    });
});
describe("Solicitor General standing", () => {
    it("bounds conduct changes, records their cause, and changes modeled chances", () => {
        let record = recordSolicitorGeneral(undefined, { proceedingId: "first", turn: 1,
            kind: "overreach", change: -3, account: "The forbidden position was pressed." });
        expect(record.standing).toBe(47);
        expect(standingAdjustment(record)).toBeLessThan(0);
        const duplicate = recordSolicitorGeneral(record, { proceedingId: "first", turn: 2,
            kind: "overreach", change: -3, account: "The forbidden position was pressed." });
        expect(duplicate).toBe(record);
        for (let i = 0; i < 50; i += 1)
            record = recordSolicitorGeneral(record, { proceedingId: `case-${i}`, turn: i + 3,
                kind: "restraint", change: 2, account: "The forbidden-ground position was abandoned." });
        expect(record.standing).toBe(85);
        expect(record.events).toHaveLength(24);
        expect(standingAdjustment(record)).toBe(0.07);
    });
});
