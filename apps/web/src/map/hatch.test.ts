import { describe, expect, it } from "vitest";
import { hatchBands } from "./hatch";

describe("hatchBands", () => {
  it("splits one period in proportion to the weights, in order", () => {
    expect(hatchBands([28, 24])).toEqual([
      [0, 28 / 52],
      [28 / 52, 1],
    ]);
    expect(hatchBands([1, 1])).toEqual([
      [0, 0.5],
      [0.5, 1],
    ]);
  });

  it("gives a zero or negative weight no band and an empty mix no bands at all", () => {
    expect(hatchBands([0, 2])).toEqual([
      [0, 0],
      [0, 1],
    ]);
    expect(hatchBands([0, 0])).toEqual([]);
  });
});
