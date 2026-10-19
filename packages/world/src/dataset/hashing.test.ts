import { describe, expect, it } from "vitest";
import { fnv1a, mulberry32 } from "./hashing.js";

// Fixed vectors, not round-trips. Both sides of the workspace seed their draws
// from these two functions, and a caller in the engine composes a key expecting
// the world to hash it the same way — so the thing worth pinning is the exact
// output, which is what a refactor would silently move.
describe("the deterministic primitives", () => {
  it("hashes a string to the same 32-bit value every time", () => {
    expect(fnv1a("")).toBe(2166136261);
    expect(fnv1a("a")).toBe(0xe40c292c);
    expect(fnv1a("foobar")).toBe(0xbf9cf968);
    expect(fnv1a("USA:military:4:6")).toBe(fnv1a("USA:military:4:6"));
    expect(fnv1a("USA:military:4:6")).not.toBe(fnv1a("USA:military:4:7"));
  });

  it("keeps the hash inside the unsigned 32-bit range for any input", () => {
    for (const input of ["", "x", "a longer key with spaces", "ÿ".repeat(40)]) {
      expect(Number.isInteger(fnv1a(input))).toBe(true);
      expect(fnv1a(input)).toBeGreaterThanOrEqual(0);
      expect(fnv1a(input)).toBeLessThan(2 ** 32);
    }
  });

  it("runs the same sequence from the same seed, and a different one from another", () => {
    const first = Array.from({ length: 5 }, mulberry32(12345));
    expect(Array.from({ length: 5 }, mulberry32(12345))).toEqual(first);
    expect(Array.from({ length: 5 }, mulberry32(12346))).not.toEqual(first);
    for (const value of first) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
