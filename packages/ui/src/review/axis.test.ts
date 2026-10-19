import { describe, expect, it } from "vitest";
import { axesOf, axisShare, effectAxis, sharedCost, sharedLock } from "./axis";
import type { EffectView } from "./types";

const effect = (value: number, unit = "pts"): EffectView => ({ metric: `m${value}`, label: "Approval", value, text: String(value), tone: "neutral", unit });

describe("effectAxis", () => {
  it("is even about zero when moves go both ways", () => {
    const axis = effectAxis([effect(1.4), effect(-0.6)], "pts");
    expect([axis.lo, axis.hi]).toEqual([-2, 2]);
    expect(axisShare(axis, 0)).toBe(0.5);
  });

  it("runs bands three steps each way", () => {
    const axis = effectAxis([effect(2, "band")], "band");
    expect([axis.lo, axis.hi]).toEqual([-3, 3]);
    expect(axis.ticks.map((tick) => tick.label)).toEqual(["Big drop", "None", "Big rise"]);
  });

  it("clips a value past the end and keeps a flat axis drawable", () => {
    const axis = effectAxis([effect(0)], "pts");
    expect(axis.hi).toBe(1);
    expect(axisShare(effectAxis([effect(1)], "pts"), 5)).toBe(1);
  });

  it("orders axes by how many moves use them", () => {
    expect([...axesOf([effect(1, "band"), effect(1), effect(2)]).keys()]).toEqual(["pts", "band"]);
  });
});

describe("shared readings", () => {
  it("says a cost once only when every option pays it", () => {
    expect(sharedCost([{ text: "Free" }, { text: "Free" }])).toBe("Free");
    expect(sharedCost([{ text: "$2B", figure: { value: -2000 } }, { text: "Free" }])).toBeUndefined();
  });

  it("names a lock once only when two or more share it", () => {
    expect(sharedLock(["No forces", "No forces", undefined])).toBe("No forces");
    expect(sharedLock(["No forces", undefined])).toBeUndefined();
  });
});
