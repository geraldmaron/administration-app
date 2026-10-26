import { describe, expect, it } from "vitest";
import { ACUTE_CONDITIONS, CONDITION_KINDS, HOME_EVENT_CONDITIONS, STANDING_CONDITIONS, conditionFamily, isStandingCondition, } from "./condition-kinds.js";
import { STANDING_ONSET_READS, conditionImpactWrites } from "./conditions.js";
import { campaignPhaseSequence } from "./turn-phases.js";
import { usaCharter } from "@admin/world";
// A gating stat has one owner, and no condition writes the stat it is gated on.
//
// This is the invariant that is invisible at every call site and fatal when
// broken: a standing condition whose weekly cost moves the figure its own onset
// reads is a function of itself. Its cause never eases, so the recovery it
// closes on never arrives, and a campaign converges on that stat pinned at its
// clamp under a permanent maximum-severity condition. It looks like a working
// simulation for about fifty turns.
//
// Enforced as a table check rather than left to review, because the pairing
// lives in two files and neither one shows the other.
describe("Law 8 — no condition writes the stat it is gated on", () => {
    it("gives every standing kind a declared reading", () => {
        for (const kind of STANDING_CONDITIONS) {
            expect(STANDING_ONSET_READS[kind], kind).toBeDefined();
            expect(STANDING_ONSET_READS[kind].length, kind).toBeGreaterThan(0);
        }
    });
    it("never lets a standing kind's impact move what its onset reads", () => {
        for (const kind of STANDING_CONDITIONS) {
            const reads = new Set(STANDING_ONSET_READS[kind]);
            for (const written of conditionImpactWrites(kind)) {
                expect(reads.has(written), `${kind} opens on ${[...reads].join(", ")} and its IMPACTS row writes ${written} — ` +
                    `that is a self-exciting loop, and the condition can never close`).toBe(false);
            }
        }
    });
    it("splits the two families exhaustively and without overlap", () => {
        expect(new Set(CONDITION_KINDS).size).toBe(CONDITION_KINDS.length);
        expect(CONDITION_KINDS.length).toBe(ACUTE_CONDITIONS.length + STANDING_CONDITIONS.length + HOME_EVENT_CONDITIONS.length);
        for (const kind of ACUTE_CONDITIONS) {
            expect(conditionFamily(kind), kind).toBe("acute");
            expect(isStandingCondition(kind), kind).toBe(false);
        }
        for (const kind of STANDING_CONDITIONS) {
            expect(conditionFamily(kind), kind).toBe("standing");
        }
        for (const kind of HOME_EVENT_CONDITIONS) {
            expect(conditionFamily(kind), kind).toBe("event");
            expect(isStandingCondition(kind), kind).toBe(false);
        }
    });
});
describe("one writer for the macro stats", () => {
    // A default abroad sits between them by design: it reads the economy the
    // drift settled and writes debt, the rating and a shock the next drift
    // reads, never a macro rate a condition opens on.
    const BETWEEN_DRIFT_AND_CONDITIONS = ["defaultPhase"];
    it("puts the drift phase before the conditions that read it, with no macro writer between", () => {
        const ids = campaignPhaseSequence(usaCharter).map((phase) => phase.id);
        const drift = ids.indexOf("macroDriftPhase");
        const conditions = ids.indexOf("conditionPhase");
        expect(drift).toBeGreaterThanOrEqual(0);
        expect(conditions).toBeGreaterThan(drift);
        expect(ids.slice(drift + 1, conditions)).toEqual(BETWEEN_DRIFT_AND_CONDITIONS);
    });
});
