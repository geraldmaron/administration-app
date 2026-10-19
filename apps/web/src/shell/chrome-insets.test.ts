import { describe, expect, it } from "vitest";
import { insetsFromBoxes } from "./chrome-insets";

const box = (left: number, top: number, right: number, bottom: number) => ({ left, top, right, bottom });

describe("what the chrome covers of the map", () => {
  it("frames a phone between the bar and a half-open sheet over the tab bar", () => {
    const phone = { width: 390, height: 844 };
    const insets = insetsFromBoxes([box(0, 0, 390, 44), box(0, 794, 390, 844), box(0, 460, 390, 794)], phone);
    expect(insets).toEqual({ top: 44, right: 0, bottom: 384, left: 0 });
  });

  it("frames a desktop beside the rail and the docked panel", () => {
    const desktop = { width: 1440, height: 900 };
    const insets = insetsFromBoxes([box(0, 0, 1440, 56), box(0, 56, 76, 900), box(76, 56, 566, 900)], desktop);
    expect(insets).toEqual({ top: 56, right: 0, bottom: 0, left: 566 });
  });

  it("ignores chrome that is not drawn", () => {
    expect(insetsFromBoxes([box(0, 0, 0, 0)], { width: 390, height: 844 })).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
  });

  it("counts a full-height phone sheet from the top, which leaves the map no strip to frame in", () => {
    const insets = insetsFromBoxes([box(0, 0, 390, 44), box(0, 44, 390, 794)], { width: 390, height: 844 });
    expect(insets.top).toBe(794);
  });
});
