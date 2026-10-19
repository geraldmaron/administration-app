import { describe, expect, it } from "vitest";
import { regionTable } from "./__fixtures__/map-fixtures";
import { applyAffine } from "./camera";
import { detachFrame, fadeFloor, finerLevel, focusedRegions, liftedCamera, liftedRegions, selectedRegions, selectionLevel, AT_REST } from "./detach";
import { DotKind, type Dots } from "./lattice";
import { paint, type Lens } from "./paint";

const table = regionTable();

describe("detachment", () => {
  it("fades the rest to 22%, or 35% in high contrast, and lifts 6px at 1.03 scale", () => {
    expect(detachFrame(0, false)).toEqual({ progress: 0, othersAlpha: 1, lift: -0, scale: 1 });
    const full = detachFrame(1, false);
    expect(full.othersAlpha).toBeCloseTo(0.22);
    expect(full.lift).toBeCloseTo(-6);
    expect(full.scale).toBeCloseTo(1.03);
    expect(detachFrame(1, true).othersAlpha).toBeCloseTo(fadeFloor(true));
    expect(fadeFloor(true)).toBe(0.35);
  });

  it("eases monotonically and clamps outside 0..1", () => {
    let last = 1;
    for (let t = 0; t <= 1.0001; t += 0.05) {
      const frame = detachFrame(t, false);
      expect(frame.othersAlpha).toBeLessThanOrEqual(last + 1e-12);
      last = frame.othersAlpha;
    }
    expect(detachFrame(2, false)).toEqual(detachFrame(1, false));
    expect(detachFrame(-1, false)).toEqual(detachFrame(0, false));
  });

  it("scales about the selection's centroid, which only rises by the lift", () => {
    const camera = { k: 2, x: 100, y: 50 };
    const centroid = [400, 300] as const;
    const lifted = liftedCamera(camera, centroid, detachFrame(1, false));
    const [px, py] = [(400 - 100) / 2, (300 - 50) / 2];
    const [sx, sy] = applyAffine(lifted, px, py);
    expect(sx).toBeCloseTo(400);
    expect(sy).toBeCloseTo(294);
    expect(liftedCamera(camera, centroid, AT_REST)).toEqual(camera);
  });
});

describe("selection", () => {
  it("parses one ref or a set, dropping refs the map does not know", () => {
    expect(selectedRegions(table, undefined)).toEqual([]);
    expect(selectedRegions(table, "state:CA").map((r) => r.id)).toEqual(["CA"]);
    expect(selectedRegions(table, "nation:FRA|nation:DEU|nation:FRA|nation:XXX").map((r) => r.id)).toEqual(["FRA", "DEU"]);
  });

  it("lifts a state with its districts, so it detaches whole when districts are drawn", () => {
    const lifted = liftedRegions(table, selectedRegions(table, "state:PA"));
    expect(lifted.filter((r) => r.layer === "districts").map((r) => r.id).every((id) => id.startsWith("PA-"))).toBe(true);
    expect(lifted.filter((r) => r.layer === "districts")).toHaveLength(17);
    expect(liftedRegions(table, selectedRegions(table, "nation:FRA"))).toHaveLength(1);
  });

  it("detaches a district a second level only inside its own detached state", () => {
    expect(focusedRegions(selectedRegions(table, "state:PA|district:PA-03")).map((r) => r.id)).toEqual(["PA-03"]);
    expect(focusedRegions(selectedRegions(table, "district:PA-03"))).toEqual([]);
    expect(focusedRegions(selectedRegions(table, "state:NY|district:PA-03"))).toEqual([]);
    expect(focusedRegions(selectedRegions(table, "state:PA"))).toEqual([]);
  });

  it("asks for the finest level its regions need, and a state brings its district lines", () => {
    expect(selectionLevel(selectedRegions(table, "nation:FRA"))).toBe("nation");
    expect(selectionLevel(selectedRegions(table, "nation:FRA|state:CA"))).toBe("district");
    expect(selectionLevel(selectedRegions(table, "district:NY-12"))).toBe("district");
    expect(finerLevel("nation", "state")).toBe("state");
    expect(finerLevel("district", "state")).toBe("district");
  });
});

function dots(regions: readonly number[], kinds: readonly number[]): Dots {
  return {
    count: regions.length,
    x: new Float32Array(regions.length),
    y: new Float32Array(regions.length),
    region: Int32Array.from(regions),
    kind: Uint8Array.from(kinds),
    key: Float32Array.from(regions.map((_, i) => i / regions.length)),
    countA: new Int32Array(4),
  };
}

describe("paint with a selection", () => {
  const lens: Lens = { id: "t", name: "t", level: "state", fill: (region) => (region.index === 1 ? { kind: "solid", color: "a", scale: 1.23 } : { kind: "none" }) };
  const regions = table.regions.slice(0, 3);

  it("puts the selected region's dots in the lifted group, its B dots at full strength", () => {
    const sample = dots([0, 1, 1, 1, 2], [DotKind.A, DotKind.A, DotKind.B, DotKind.Centroid, DotKind.B]);
    const painted = paint(sample, regions, lens, "state", "neutral", { selected: new Set([1]) });
    const lifted = painted.lifted.find((b) => b.color === "a")!;
    expect(Array.from(lifted.solid)).toEqual([1, 2]);
    expect(Array.from(lifted.ringed)).toEqual([3]);
    const rest = painted.buckets.find((b) => b.color === "neutral")!;
    expect(Array.from(rest.solid)).toEqual([0]);
    expect(Array.from(rest.fading)).toEqual([4]);
  });

  it("puts a second-level region's dots in their own group, apart from the rest of the lift", () => {
    const sample = dots([0, 1, 2, 2], [DotKind.A, DotKind.A, DotKind.A, DotKind.B]);
    const painted = paint(sample, regions, lens, "state", "neutral", { selected: new Set([1, 2]), focused: new Set([2]) });
    expect(painted.lifted.flatMap((b) => Array.from(b.solid))).toEqual([1]);
    expect(painted.focused.flatMap((b) => Array.from(b.solid)).sort()).toEqual([2, 3]);
  });

  it("on a filled ground draws no dots: a mix is a hatch over its majority, and the selection is lifted, not dotted", () => {
    const mixed: Lens = { ...lens, fill: (region) => (region.index === 2 ? { kind: "dither", colors: ["x", "y"], weights: [1, 3] } : lens.fill(region, "state")) };
    const sample = dots([0, 0, 1, 2, 2, 0], [DotKind.A, DotKind.B, DotKind.A, DotKind.A, DotKind.A, DotKind.Centroid]);
    for (const selected of [new Set<number>(), new Set([0]), new Set([2])]) {
      const painted = paint(sample, regions, mixed, "state", "neutral", { filled: true, drawn: [0, 1, 2], land: "land", selected });
      expect([...painted.buckets, ...painted.lifted, ...painted.focused]).toEqual([]);
      expect(painted.fills.get(0)).toBe("land");
      expect(painted.fills.get(1)).toBe("a");
      expect(painted.fills.get(2)).toBe("y");
      expect(painted.hatches.get(2)).toEqual({ colors: ["x", "y"], weights: [1, 3] });
      expect(painted.hatches.has(1)).toBe(false);
    }
  });

  it("dots everything when the ground is not filled", () => {
    const painted = paint(dots([0, 1], [DotKind.A, DotKind.A]), regions, lens, "state", "neutral");
    expect(painted.buckets.flatMap((b) => [...b.solid]).sort()).toEqual([0, 1]);
    expect(painted.fills.size).toBe(0);
  });

  it("holds a magnitude radius to tenths", () => {
    const painted = paint(dots([1], [DotKind.A]), regions, lens, "state", "neutral");
    expect(painted.buckets.find((b) => b.color === "a")?.scale).toBe(1.2);
  });
});
