import { describe, expect, it } from "vitest";
import { foundedForBalance } from "./balance-harness.js";
import { localeAct, localeAvailability, homeActAvailability } from "./locale-acts.js";
import { takeLocaleAct, takeHomeAct } from "./locale-act-effects.js";
import { LOCALE_REFUSALS } from "./locale-missions.js";
import type { Campaign } from "./state.js";

const base = foundedForBalance("authority-boundaries").campaign;
const state = "MN";
const declared: Campaign = { ...base, emergencies: {
  ...base.emergencies,
  "emergency:test": { id: "emergency:test", scope: { kind: "state", state }, cause: "unrest", declaredTurn: base.turn, renewedTurn: base.turn, reason: "Test declaration." },
} };

describe("domestic authority boundaries", () => {
  it("does not turn unrest, a declaration or resources into federal mission authority", () => {
    const before = JSON.stringify(declared);
    const refusals = { "property-surge": LOCALE_REFUSALS.disorder, federalize: LOCALE_REFUSALS.federalize, troops: LOCALE_REFUSALS.troops } as const;
    for (const id of ["property-surge", "federalize", "troops"] as const) {
      const result = takeLocaleAct(declared, state, id, "unrest");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain(refusals[id]);
    }
    expect(JSON.stringify(declared)).toBe(before);
  });

  it("uses the same guard from the alternate home entry path", () => {
    const surge = localeAct("property-surge")!;
    expect(homeActAvailability(declared, state, surge)).toEqual(localeAvailability(declared, state, surge));
    expect(takeHomeAct(declared, state, "property-surge").ok).toBe(false);
    // Acts open on any occasion, and the boundary act that carries no coercion, are not the home path's to take at all.
    for (const id of ["federalize", "troops", "surveil"] as const) {
      expect(homeActAvailability(declared, state, localeAct(id)!).ok).toBe(false);
      expect(takeHomeAct(declared, state, id).ok).toBe(false);
    }
  });

  it("retains a governor-controlled support request without federal service", () => {
    const governor = base.states[state]!.governor!;
    const supported: Campaign = { ...base, states: { ...base.states, [state]: { ...base.states[state]!, governor: { ...governor, disposition: 0.9 } } } };
    expect(takeLocaleAct(supported, state, "request-deployment", "flood").ok).toBe(true);
    const { governor: _missing, ...runtime } = supported.states[state]!;
    const unknown: Campaign = { ...supported, states: { ...supported.states, [state]: runtime } };
    expect(takeLocaleAct(unknown, state, "request-deployment", "flood").ok).toBe(false);
  });
});
