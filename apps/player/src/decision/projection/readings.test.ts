import { describe, expect, it } from "vitest";
import type { ModelingDelta } from "@admin/player-core";
import { axisOf, deltaValence, formatFor, glyph, onAxis } from "./readings";

const delta = (over: Partial<ModelingDelta>): ModelingDelta => ({ metric: "approval", label: "Approval", unit: "points", better: "higher", agreement: "higher", text: "+1.2 pts", median: 0.012, low: 0.004, high: 0.02, ...over }) as ModelingDelta;

describe("projection readings", () => {
  it("calls a move good or bad only when every run agrees on its direction", () => {
    expect(deltaValence(delta({}))).toBe("good");
    expect(deltaValence(delta({ agreement: "lower", text: "−0.8 pts" }))).toBe("bad");
    expect(deltaValence(delta({ agreement: "mixed" }))).toBe("neutral");
    expect(deltaValence(delta({ better: "lower" }))).toBe("bad");
    expect(deltaValence(delta({ text: "0.0 pts" }))).toBe("neutral");
  });

  it("keeps a floor under the axis and clips past it", () => {
    expect(axisOf([{ median: 0.001, low: 0, high: 0.002 }], "points")).toBe(0.005);
    expect(onAxis(0, 0.01)).toBe(0.5);
    expect(onAxis(1, 0.01)).toBe(1);
  });

  it("marks the direction a figure prints", () => {
    expect(glyph("+1")).toBe("▲");
    expect(glyph("−1")).toBe("▼");
    expect(glyph("0")).toBe("▬");
    expect(formatFor("points")(0.5)).toMatch(/50/);
  });
});
