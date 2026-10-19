import { describe, expect, it } from "vitest";
import type { ActAssessment, ActTerms, ActWorkspace } from "@admin/player-core";
import { authorizationSummary } from "./act-summary";

type Chosen = NonNullable<ActWorkspace["chosen"]>;

const chosen = (ref: Chosen["option"]["ref"], name = "The act"): Chosen => ({ option: { id: "x", goal: "trade", family: "tariff", name, ref }, preview: { state: "open" } as Chosen["preview"] });

function assessment(rows: ActAssessment["rows"]): ActAssessment {
  return { rows } as unknown as ActAssessment;
}

const row = (label: string, text: string, detail?: readonly string[]) => ({ label, baseline: { text: "None" }, act: { text, ...(detail ? { detail } : {}) } });

const STEEL_LAW = { statute: "s232", name: "Section 232", cite: "19 U.S.C. §1862", purpose: "National security", available: true, reason: "Commerce made the finding.", orders: "tariff", roomPercent: 90, limits: "No cap below a total ban, lasts until lifted.", courts: "" } as const;
const TARIFF_TERMS: ActTerms = { tariff: { sectors: [{ sector: "steel", name: "Steel" }], sector: "steel", rate: 25, standing: 10, room: 65, law: STEEL_LAW, laws: [STEEL_LAW] } };

describe("what the President reads before authorizing", () => {
  it("states the terms as set, the cost with what it rests on, and that a tariff can be lifted", () => {
    const lines = authorizationSummary({
      name: "Canada",
      chosen: chosen({ kind: "tariff" }),
      terms: TARIFF_TERMS,
      assessment: assessment([row("Revenue", "$2.10B a year coming in", ["Net of the volume the tariff destroys."]), row("When", "Takes effect right away")]),
    });
    const by = Object.fromEntries(lines.map((line) => [line.label, line]));
    expect(by["Country"]?.value).toBe("Canada");
    expect(by["What you set"]?.value).toBe("25% on steel, on top of the 10% already in place, under Section 232");
    expect(by["Cost"]).toMatchObject({ value: "$2.10B a year coming in", basis: "Net of the volume the tariff destroys." });
    expect(by["Who decides"]?.value).toBe("Your order, under Section 232 (19 U.S.C. §1862). It takes effect right away.");
    expect(by["Can it be undone"]?.value).toBe("You can lift it later from this page.");
  });

  it("says a force act with a delay can be called off, and one that lands at once cannot", () => {
    const terms: ActTerms = { force: { min: 1, max: 8, count: 4, unitType: "navy.surface-combatant", countText: "4 surface combatants", preferredText: "4", purpose: "", } };
    const delayed = authorizationSummary({ name: "Iran", chosen: chosen({ kind: "instrument", instrument: "military", rung: 3 }), terms, assessment: assessment([row("Cost now", "$1.20B spent"), row("When", "First results in about 6 days", ["Sailing time."]), row("Who is consulted", "Secretary of Defense")]) });
    expect(delayed.find((line) => line.label === "What you set")?.value).toBe("sends 4 surface combatants");
    expect(delayed.find((line) => line.label === "Can it be undone")?.value).toContain("call it off until its first report");
    expect(delayed.find((line) => line.label === "Who decides")?.value).toBe("Your order, after consulting Secretary of Defense.");
    const instant = authorizationSummary({ name: "Iran", chosen: chosen({ kind: "instrument", instrument: "diplomatic", rung: 1 }), terms: {}, assessment: assessment([row("When", "Takes effect right away")]) });
    expect(instant.find((line) => line.label === "Can it be undone")?.value).toContain("takes effect right away");
    expect(instant.find((line) => line.label === "Cost")?.value).toBe("No price yet");
  });

  it("names the vote an authorization or a treaty needs", () => {
    const auth = authorizationSummary({ name: "Iran", chosen: chosen({ kind: "authorization" }), terms: {}, assessment: assessment([]) });
    expect(auth.find((line) => line.label === "Who decides")?.value).toBe("Both chambers of Congress vote on it.");
    const treaty = authorizationSummary({ name: "Japan", chosen: chosen({ kind: "treaty", treaty: "alliance" }), terms: {}, assessment: assessment([row("The Senate", "Needs two thirds of the Senate: likely")]) });
    expect(treaty.find((line) => line.label === "Who decides")?.value).toBe("Needs two thirds of the Senate: likely.");
  });
});
