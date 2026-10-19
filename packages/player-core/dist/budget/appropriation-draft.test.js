import { describe, expect, it } from "vitest";
import { ACCOUNT_CAP, apply, requestAppropriation, selectBudget } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { appropriationStatus, budgetDraftReading } from "./appropriation-draft";
// The budget room's draft is the book the request sends: what the editor
// projects is what the commit enacts.
const base = openingCampaign();
const military = selectBudget(base).military;
describe("the appropriation in force", () => {
    it("dates the funding and the year the next book pays for", () => {
        const status = appropriationStatus(base);
        expect(status.weeksLeft).toBeGreaterThan(0);
        expect(status.shutdown).toBe(false);
        expect(status.onPriorYear).toBe(false);
        expect(status.next.fiscalYear).toBeGreaterThan(2000);
        expect(status.fundedThrough).toMatch(/\d{4}/);
    });
});
describe("a drafted book", () => {
    it("changes nothing while the draft is the book in force", () => {
        const reading = budgetDraftReading(base, {});
        if (!reading.ok)
            throw new Error(reading.reason);
        expect(reading.candidate.changed).toEqual([]);
        expect(reading.totals.draft).toBeCloseTo(reading.totals.inForce, 6);
    });
    it("projects a raise line by line and the floor counts only the changed line", () => {
        const reading = budgetDraftReading(base, { military: military + 0.002 });
        if (!reading.ok)
            throw new Error(reading.reason);
        expect(reading.candidate.changed).toEqual(["military"]);
        expect(reading.floor.accounts.map((entry) => entry.account)).toEqual(["military"]);
        expect(reading.accounts.find((row) => row.account === "military").draft).toBeCloseTo(military + 0.002, 4);
        expect(reading.flow.draft.accountsDraw).toBeGreaterThan(reading.flow.inForce.accountsDraw);
    });
    // Either way the floor goes, the commit lands where the projection said it would.
    it("commits the outcome the floor count projected", () => {
        const reading = budgetDraftReading(base, { military: military + 0.002 });
        if (!reading.ok)
            throw new Error(reading.reason);
        const result = requestAppropriation(base, reading.candidate);
        if (!result.ok)
            throw new Error("the request was refused");
        const after = apply(base, result.packet);
        const status = appropriationStatus(after);
        if (reading.floor.wouldEnact) {
            expect(status.fundedThrough).toBe(appropriationStatus(base).next.fundedThrough);
            expect(selectBudget(after).military).toBeCloseTo(reading.floor.wouldPass ? reading.candidate.allocation.military : military, 6);
        }
        else {
            expect(status.onPriorYear).toBe(true);
            expect(status.fundedThrough).toBe(appropriationStatus(base).fundedThrough);
            expect(selectBudget(after).military).toBe(military);
        }
    });
    it("refuses a line over what Congress allows, in the engine's words", () => {
        const reading = budgetDraftReading(base, { military: ACCOUNT_CAP + 0.01 });
        expect(reading.ok).toBe(false);
        if (!reading.ok)
            expect(reading.reason).toMatch(/national income/);
    });
});
