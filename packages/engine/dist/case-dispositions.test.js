import { describe, expect, it } from "vitest";
import { apply } from "./effects.js";
import { foundedForBalance } from "./balance-harness.js";
import { raiseForFamily } from "./case-families.js";
import { withRaisedCase } from "./cases.js";
import { dispositionCase } from "./case-dispositions.js";
import { addDays } from "./clock.js";
const base = foundedForBalance("case-dispositions").campaign;
describe("dispositionCase: the tray's own generic commit", () => {
    it("refuses a case that does not exist", () => {
        expect(dispositionCase(base, "case:nowhere", { kind: "decline" })).toEqual({ ok: false, reason: "There is no such case." });
    });
    it("commits a decline, and the case reads declined once applied", () => {
        const raise = raiseForFamily({ kind: "foreign-request", id: "case:foreign-request:1", title: "A request", subject: { kind: "nation", id: "FRA" }, dueAt: addDays(base.calendar, 10) });
        const campaign = withRaisedCase(base, raise, "world", undefined);
        const answer = dispositionCase(campaign, "case:foreign-request:1", { kind: "decline" });
        if (!answer.ok)
            throw new Error("expected the decline to be allowed");
        const applied = apply(campaign, answer.packet);
        expect(applied.cases?.["case:foreign-request:1"]?.status).toBe("declined");
    });
    it("refuses a disposition the family does not allow", () => {
        const raise = raiseForFamily({ kind: "nomination", id: "case:nomination:1", title: "A nominee", subject: { kind: "office", id: "OFF-1" } });
        const campaign = withRaisedCase(base, raise, "world", undefined);
        // A nomination's own contract allows act, decline and defer, not delegate.
        const answer = dispositionCase(campaign, "case:nomination:1", { kind: "delegate", institution: "INST-X" });
        expect(answer.ok).toBe(false);
    });
    it("refuses a deferral onto or past the case's own deadline", () => {
        const raise = raiseForFamily({ kind: "bill", id: "case:bill:1", title: "A bill", subject: { kind: "bill", id: "HB-1" }, dueAt: addDays(base.calendar, 5) });
        const campaign = withRaisedCase(base, raise, "world", undefined);
        const answer = dispositionCase(campaign, "case:bill:1", { kind: "defer", until: addDays(base.calendar, 5) });
        expect(answer.ok).toBe(false);
    });
});
