import { describe, expect, it } from "vitest";
import { levelFor, shadeAt, type ReliefLevel, type ReliefPlate } from "./relief";

const level = (width: number, fill: (x: number, y: number) => number): ReliefLevel => {
  const height = width / 2;
  const shade = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) shade[y * width + x] = fill(x, y);
  return { width, height, shade };
};

describe("the relief plate", () => {
  it("reads a lon/lat off an equirectangular level, wrapping across the antimeridian", () => {
    const ramp = level(360, (x) => (x < 180 ? 100 : 200));
    expect(shadeAt(ramp, -90, 0)).toBeCloseTo(100, 6);
    expect(shadeAt(ramp, 90, 0)).toBeCloseTo(200, 6);
    expect(shadeAt(ramp, 179.9, 0)).toBeGreaterThan(100);
    expect(shadeAt(ramp, -179.9, 0)).toBeGreaterThan(100);
  });

  it("picks a coarser level as the view widens, so a wide view is not pixel noise", () => {
    const plate: ReliefPlate = { levels: [level(4096, () => 128), level(2048, () => 128), level(1024, () => 128), level(512, () => 128)] };
    expect(levelFor(plate, 0.05).width).toBe(4096);
    expect(levelFor(plate, 0.3).width).toBe(1024);
    expect(levelFor(plate, 5).width).toBe(512);
  });
});
