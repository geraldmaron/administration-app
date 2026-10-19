import { describe, expect, it } from "vitest";
import { parseBriefSearch } from "./search";

describe("the canonical President’s Brief", () => {
  it("retains a historical week while opening the single history workspace", () => {
    expect(parseBriefSearch({ week: "12" })).toEqual({ view: "history", week: 12 });
    expect(parseBriefSearch({ view: "calendar", week: 12 })).toEqual({ view: "calendar", week: 12 });
  });
  it("rejects malformed weeks and unknown views without hiding the desk", () => {
    for (const week of [-1, 0, 2.5, "no", Infinity]) expect(parseBriefSearch({ view: "old-digest", week })).toEqual({});
  });
});
