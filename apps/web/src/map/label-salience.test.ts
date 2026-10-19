import { describe, expect, it } from "vitest";
import { rankSalience } from "./label-salience";

const row = (ref: string, rank: number) => ({ ref, name: ref, value: "", rank });

describe("rankSalience", () => {
  it("is 1 at either end of the ranking and 0 at the middle", () => {
    const salience = rankSalience([row("a", 5), row("b", 4), row("c", 3), row("d", 2), row("e", 1)]);
    expect(salience.get("a")).toBe(1);
    expect(salience.get("e")).toBe(1);
    expect(salience.get("c")).toBe(0);
  });

  it("ranks by position, so one outlier does not flatten the rest", () => {
    const salience = rankSalience([row("huge", 1000), row("b", 3), row("c", 2), row("d", 1)]);
    expect(salience.get("d")).toBe(1);
    expect(salience.get("b")).toBeCloseTo(1 / 3, 10);
  });

  it("gives tied ranks one shared salience", () => {
    const salience = rankSalience([row("a", 2), row("b", 1), row("c", 1), row("d", 1), row("e", 0)]);
    expect(salience.get("b")).toBe(salience.get("d"));
    expect(salience.get("c")).toBe(0);
  });
});
