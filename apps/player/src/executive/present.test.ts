import { describe, expect, it } from "vitest";
import { authorityByCite } from "@admin/player-core";
import { ACT_LAW, actCitation, cellWords, qualityOf, readingTone, removalLaw, type ActLaw } from "./present";

describe("the law each act cites", () => {
  it("resolves every citation to a record in the register (DECISIONS §8.12)", () => {
    for (const act of Object.keys(ACT_LAW) as ActLaw[]) {
      expect(authorityByCite(ACT_LAW[act]), act).toBeDefined();
      expect(actCitation(act).title.length).toBeGreaterThan(0);
    }
  });

  it("cites the Federal Reserve Act for a governor and the executive power for any other officer", () => {
    expect(removalLaw("INST-FED")).toBe("removeFed");
    expect(removalLaw("INST-FTC")).toBe("remove");
  });
});

describe("readings", () => {
  it("bands an operating reading at 40% and 60%", () => {
    expect([qualityOf(0.39), qualityOf(0.4), qualityOf(0.6)]).toEqual(["bad", "watch", "good"]);
  });

  it("never grades ambition: a pressure reading takes a pressure tone", () => {
    expect(readingTone({ kind: "pressure", band: 3 })).toBe("pressure-past");
    expect(readingTone({ kind: "pressure", band: 1 })).toBe("pressure-low");
    expect(readingTone({ kind: "graded", stance: "adverse", band: 0 })).toBe("bad");
  });

  it("says a priced cell in words, with whether it helps", () => {
    expect(cellWords({ kind: "money", amount: -5, text: "$5B spent" })).toEqual({ text: "$5B spent", tone: "bad" });
    expect(cellWords({ kind: "lines", lines: ["a", "b"] }).text).toBe("a; b");
    expect(cellWords(undefined).text).toBe("Not measured");
  });
});
