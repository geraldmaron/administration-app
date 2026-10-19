import { describe, expect, it } from "vitest";
import { assignDither, slotCounts } from "./dither";
import { latticeKey } from "./lattice";

const keys = (count: number, offset = 0) => Array.from({ length: count }, (_, i) => latticeKey(i + offset, i * 7 - offset));

describe("proportional dither", () => {
  it("shows a 28-of-52 delegation as a 54/46 mix", () => {
    const slots = assignDither(keys(200), [28, 24]);
    const first = slots.filter((s) => s === 0).length;
    expect(first).toBe(108);
    expect(first / 200).toBeCloseTo(28 / 52, 2);
  });

  it("splits a Senate pair 1:1", () => {
    const slots = assignDither(keys(41), [1, 1]);
    const first = slots.filter((s) => s === 0).length;
    expect(Math.abs(first - (41 - first))).toBeLessThanOrEqual(1);
  });

  it("is exact to one dot for every slot, by largest remainder", () => {
    const counts = slotCounts([43, 8, 1, 0], 37);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(37);
    counts.forEach((count, i) => expect(Math.abs(count - (37 * [43, 8, 1, 0][i]!) / 52)).toBeLessThan(1));
  });

  it("is stable: the same lattice keeps its colors", () => {
    const input = keys(120, 5);
    expect(Array.from(assignDither(input, [3, 2]))).toEqual(Array.from(assignDither(input, [3, 2])));
  });

  it("orders by hash, so the mix is scattered rather than banded", () => {
    const slots = Array.from(assignDither(keys(100), [1, 1]));
    const firstHalf = slots.slice(0, 50).filter((s) => s === 0).length;
    expect(firstHalf).toBeGreaterThan(10);
    expect(firstHalf).toBeLessThan(40);
  });

  it("gives nothing to a slot with no weight", () => {
    expect(slotCounts([0, 0], 10)).toEqual([0, 0]);
    expect(Array.from(assignDither(keys(10), [0, 5]))).toEqual(Array(10).fill(1));
  });
});
