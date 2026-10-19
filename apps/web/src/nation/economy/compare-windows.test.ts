import { describe, expect, it } from "vitest";
import { windowOptions, windowYears } from "./compare-windows";

describe("the stretch selector", () => {
  it("names a stretch by its years", () => {
    expect(windowYears("2017 to 2019 · before the pandemic")).toBe("2017–2019");
  });

  it("keeps an uncovered stretch visible and says why it cannot be picked", () => {
    const options = windowOptions(
      [
        { id: "a", label: "2007 to 2012 · crisis", available: true },
        { id: "b", label: "1973 to 1982 · oil", available: false },
      ],
      "not in the record we hold",
    );
    expect(options[0]).toEqual({ value: "a", label: "2007–2012" });
    expect(options[1]).toEqual({ value: "b", label: "1973–1982", unavailable: "not in the record we hold" });
  });
});
