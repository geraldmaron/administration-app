import { describe, expect, it } from "vitest";
import { foundedForBalance } from "./balance-harness.js";
import { apply } from "./effects.js";
import { intelligencePhase } from "./intelligence.js";
import { inspectorGeneralPhase } from "./inspectors-general.js";
import { matterRipensTurn, oversightRipeningPhase, type OversightMatter } from "./oversight.js";
import { createSave, loadSave } from "./save.js";
import type { Campaign } from "./state.js";

function intercepted(): Campaign {
  let state = foundedForBalance("nsa-interception-case").campaign;
  state = { ...state, institutions: { ...state.institutions,
    "INST-NSA": { ...state.institutions["INST-NSA"]!, integrity: 0.3 } } };
  for (let step = 0; step < 100 && !state.security.intelligence.surveillanceIncident; step += 1) {
    state = intelligencePhase(state).reduce(apply, state);
    state = { ...state, turn: state.turn + 1 };
  }
  if (!state.security.intelligence.surveillanceIncident) throw new Error("No recorded interception");
  return state;
}

function report(state: Campaign, matter: OversightMatter): Campaign {
  const gathering = { ...matter, stage: "gathering" as const };
  const due = matterRipensTurn(gathering);
  if (due === undefined) throw new Error("No report date");
  const ready = { ...state, turn: due, oversight: { ...state.oversight, matters: [gathering] } };
  return oversightRipeningPhase(ready).reduce(apply, ready);
}

describe("an inspector finding belongs to the investigated interception", () => {
  it("does not expose interception through an unrelated Defense audit", () => {
    const state = intercepted();
    const unrelated: OversightMatter = { id: "matter:ig:unrelated-purchasing",
      origin: { kind: "inspector-general", institution: "INST-DOD" }, direction: "received",
      subject: "purchasing records", openedTurn: state.turn, stage: "opened",
      public: false, obstructed: false, beats: [] };
    const after = report(state, unrelated);
    expect(after.security.intelligence.surveillanceIncident?.status).toBe("recorded");
    expect(after.oversight.matters[0]?.finding).not.toContain("NSA collection log");
  });

  it("does not substitute the current incident for a different recorded audit subject", () => {
    let state = intercepted();
    state = inspectorGeneralPhase(state).reduce(apply, state);
    const matter = state.oversight.matters.find((entry) => entry.origin.kind === "inspector-general"
      && entry.origin.institution === "INST-DOD");
    if (!matter) throw new Error("No Defense investigation");
    const after = report(state, { ...matter, surveillanceIncidentId: "intercept:nsa:earlier-record" });
    expect(after.security.intelligence.surveillanceIncident?.status).toBe("recorded");
    expect(after.oversight.matters[0]?.finding).not.toContain(state.security.intelligence.surveillanceIncident!.id);
  });

  it("exposes the exact recorded log only through its linked investigation after reload", () => {
    let state = intercepted();
    state = inspectorGeneralPhase(state).reduce(apply, state);
    const matter = state.oversight.matters.find((entry) => entry.origin.kind === "inspector-general"
      && entry.origin.institution === "INST-DOD");
    expect(matter).toBeDefined();
    const saved = loadSave(createSave(state));
    const after = report(saved, matter!);
    expect(after.security.intelligence.surveillanceIncident?.status).toBe("exposed");
    expect(after.oversight.matters[0]?.finding).toContain(state.security.intelligence.surveillanceIncident!.id);
  });
});
