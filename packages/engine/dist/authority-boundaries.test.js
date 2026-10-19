import { describe, expect, it } from "vitest";
import { foundedForBalance } from "./balance-harness.js";
import { localeAct, localeAvailability, homeActAvailability, takeLocaleAct, takeHomeAct } from "./locale-acts.js";
const base = foundedForBalance("authority-boundaries").campaign;
const state = "MN";
const declared = { ...base, emergencies: {
        ...base.emergencies,
        "emergency:test": { id: "emergency:test", scope: { kind: "state", state }, cause: "unrest", declaredTurn: base.turn, renewedTurn: base.turn, reason: "Test declaration." },
    } };
describe("domestic authority boundaries", () => {
    it("does not turn unrest, a declaration or resources into federal mission authority", () => {
        const before = JSON.stringify(declared);
        for (const id of ["agents", "federalize", "troops"]) {
            const result = takeLocaleAct(declared, state, id, "unrest");
            expect(result.ok).toBe(false);
            if (!result.ok)
                expect(result.reason).toContain("doesn't include");
        }
        expect(JSON.stringify(declared)).toBe(before);
    });
    it("uses the same guard from the alternate home entry path", () => {
        for (const id of ["agents", "troops", "surveil"]) {
            expect(homeActAvailability(declared, state, localeAct(id))).toEqual(localeAvailability(declared, state, localeAct(id)));
            expect(takeHomeAct(declared, state, id).ok).toBe(false);
        }
    });
    it("retains a governor-controlled support request without federal service", () => {
        const governor = base.states[state].governor;
        const supported = { ...base, states: { ...base.states, [state]: { ...base.states[state], governor: { ...governor, disposition: 0.9 } } } };
        expect(takeLocaleAct(supported, state, "request-deployment", "flood").ok).toBe(true);
        const { governor: _missing, ...runtime } = supported.states[state];
        const unknown = { ...supported, states: { ...supported.states, [state]: runtime } };
        expect(takeLocaleAct(unknown, state, "request-deployment", "flood").ok).toBe(false);
    });
});
