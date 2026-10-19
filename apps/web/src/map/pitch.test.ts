import { describe, expect, it } from "vitest";
import { magnitudeRadius, MAX_PITCH, MIN_PITCH, octaveFor, pitchCeiling, targetPitch } from "./pitch";

describe("target pitch", () => {
  it("sits at the floor on a phone world view and rises with zoom to the ceiling", () => {
    expect(targetPitch(0, 390)).toBeCloseTo(MIN_PITCH, 1);
    expect(targetPitch(0, 900)).toBeGreaterThan(targetPitch(0, 390));
    expect(targetPitch(3, 900)).toBeGreaterThan(targetPitch(0, 900));
    expect(targetPitch(12, 900)).toBe(MAX_PITCH);
  });

  it("scales with the density setting", () => {
    expect(targetPitch(1, 900, "bold")).toBeGreaterThan(targetPitch(1, 900, "standard"));
    expect(targetPitch(1, 900, "fine")).toBeLessThan(targetPitch(1, 900, "standard"));
  });
});

describe("octaves", () => {
  it("keeps the A grid within one doubling around the target", () => {
    for (let k = 0.2; k < 400; k *= 1.07) {
      const { pitchA } = octaveFor(k, 6);
      expect(pitchA).toBeGreaterThanOrEqual(6 * 0.8);
      expect(pitchA).toBeLessThan(6 * 1.63);
    }
  });

  it("crossfades without a pop at the octave boundary", () => {
    const target = 6;
    const k = 1.5;
    const below = octaveFor(k, target);
    const boundary = (target * 2 ** (below.n + 1 - 0.3)) / 64;
    const before = octaveFor(boundary * 0.9999, target);
    const after = octaveFor(boundary * 1.0001, target);
    expect(after.n).toBe(before.n + 1);
    expect(before.fadeB).toBeGreaterThan(0.99);
    expect(after.fadeB).toBeLessThan(0.01);
    expect(after.radius).toBeCloseTo(before.radius, 2);
    expect(after.cell).toBeCloseTo(before.cell / 2, 9);
  });

  it("holds the drawn pitch at the ceiling, continuously, where the A grid would overshoot it", () => {
    const ceiling = pitchCeiling("standard");
    let previous: number | null = null;
    for (let k = 0.2; k < 400; k *= 1.01) {
      const octave = octaveFor(k, ceiling, 2, ceiling);
      expect(octave.pitch).toBeLessThanOrEqual(ceiling + 1e-9);
      if (previous !== null) expect(Math.abs(octave.pitch - previous)).toBeLessThan(ceiling * 0.05);
      previous = octave.pitch;
    }
    expect(octaveFor(3, 6).pitch).toBeGreaterThan(0);
  });

  it("never draws a dot under 1.5 device pixels", () => {
    expect(octaveFor(0.001, 3.5, 1).radius).toBeGreaterThanOrEqual(1.5);
    expect(octaveFor(0.001, 3.5, 3).radius).toBeGreaterThanOrEqual(0.5);
  });

  it("scales magnitude radius by area from 0.6x to 1.6x", () => {
    expect(magnitudeRadius(2, 0, 100)).toBeCloseTo(1.2);
    expect(magnitudeRadius(2, 100, 100)).toBeCloseTo(3.2);
    expect(magnitudeRadius(2, 25, 100)).toBeCloseTo(2 * (0.6 + 0.5));
  });
});
