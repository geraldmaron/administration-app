import { describe, expect, it } from "vitest";
import { NO_REGION, decodeBuffer, decodeId, idFill } from "./id-color";
import { DotKind, SUBGRID_BELOW, sampleLattice, type IdGrid } from "./lattice";
import { pickRegion } from "./picking";

/** A 40×40-cell buffer: region 0 fills the left half, region 1 is a 3×3 patch, region 2 has no cells. */
function fixture(): IdGrid {
  const width = 40;
  const height = 40;
  const ids = new Int32Array(width * height).fill(NO_REGION);
  for (let y = 0; y < height; y++) for (let x = 0; x < 20; x++) ids[y * width + x] = 0;
  for (let y = 30; y < 33; y++) for (let x = 30; x < 33; x++) ids[y * width + x] = 1;
  return { ids, width, height, i0: 0, j0: 0, cell: 2 };
}

const centroids = (points: [number, number][]) => ({
  x: Float64Array.from(points.map((p) => p[0])),
  y: Float64Array.from(points.map((p) => p[1])),
});

describe("lattice sampling", () => {
  it("puts A dots on even lattice points and B-only dots between them", () => {
    const dots = sampleLattice(fixture(), 3, centroids([[0, 0], [62, 62], [Number.NaN, Number.NaN]]));
    for (let d = 0; d < dots.count; d++) {
      if (dots.region[d] !== 0) continue;
      const i = (dots.x[d] ?? 0) / 2;
      const j = (dots.y[d] ?? 0) / 2;
      expect(dots.kind[d]).toBe(i % 2 === 0 && j % 2 === 0 ? DotKind.A : DotKind.B);
    }
    expect(dots.countA[0]).toBe(200);
  });

  it("gives a region under the sub-grid threshold all its B points at full strength", () => {
    const dots = sampleLattice(fixture(), 3, centroids([[0, 0], [62, 62], [Number.NaN, Number.NaN]]));
    expect(dots.countA[1]).toBeLessThan(SUBGRID_BELOW);
    const small = Array.from({ length: dots.count }, (_, d) => d).filter((d) => dots.region[d] === 1);
    expect(small).toHaveLength(9);
    expect(small.every((d) => dots.kind[d] === DotKind.Sub)).toBe(true);
  });

  it("guarantees a centroid dot to a region the lattice misses, if it is in view", () => {
    const inView = sampleLattice(fixture(), 3, centroids([[0, 0], [62, 62], [50, 10]]));
    const ringed = Array.from({ length: inView.count }, (_, d) => d).filter((d) => inView.kind[d] === DotKind.Centroid);
    expect(ringed.map((d) => inView.region[d])).toEqual([2]);
    const outOfView = sampleLattice(fixture(), 3, centroids([[0, 0], [62, 62], [500, 10]]));
    expect(Array.from(outOfView.kind.slice(0, outOfView.count)).includes(DotKind.Centroid)).toBe(false);
  });

  it("anchors lattice keys to the plane, not the buffer origin", () => {
    const base = fixture();
    const shifted: IdGrid = { ...base, i0: 10, j0: 10 };
    const a = sampleLattice(base, 3, centroids([[0, 0], [0, 0], [Number.NaN, Number.NaN]]));
    const b = sampleLattice(shifted, 3, centroids([[0, 0], [0, 0], [Number.NaN, Number.NaN]]));
    const keyAt = (dots: typeof a, x: number, y: number) => {
      for (let d = 0; d < dots.count; d++) if (dots.x[d] === x && dots.y[d] === y) return dots.key[d];
      return undefined;
    };
    expect(keyAt(a, 24, 24)).toBeDefined();
    expect(keyAt(b, 24, 24)).toBe(keyAt(a, 24, 24));
  });
});

describe("id colors", () => {
  it("round-trips every region index", () => {
    for (let index = 0; index < 1200; index++) {
      const [r, g, b] = (idFill(index).match(/\d+/g) ?? []).map(Number);
      expect(decodeId(r ?? 0, g ?? 0, b ?? 0, 255, 1200)).toBe(index);
    }
  });

  it("reads a partly covered pixel as no region", () => {
    const [r, g, b] = (idFill(7).match(/\d+/g) ?? []).map(Number);
    expect(decodeId(r ?? 0, g ?? 0, b ?? 0, 128, 100)).toBe(NO_REGION);
  });

  it("rejects almost every blend of two neighbors", () => {
    let accepted = 0;
    for (let a = 0; a < 60; a++) {
      for (let c = a + 1; c < 60; c++) {
        const [ra = 0, ga = 0, ba = 0] = (idFill(a).match(/\d+/g) ?? []).map(Number);
        const [rc = 0, gc = 0, bc = 0] = (idFill(c).match(/\d+/g) ?? []).map(Number);
        const mix = [Math.round((ra + rc) / 2), Math.round((ga + gc) / 2), Math.round((ba + bc) / 2)] as const;
        if (decodeId(mix[0], mix[1], mix[2], 255, 60) !== NO_REGION) accepted++;
      }
    }
    expect(accepted / 1770).toBeLessThan(0.02);
  });

  it("decodes a whole RGBA buffer", () => {
    const [r = 0, g = 0, b = 0] = (idFill(3).match(/\d+/g) ?? []).map(Number);
    expect(Array.from(decodeBuffer(Uint8ClampedArray.from([r, g, b, 255, 0, 0, 0, 0]), 10))).toEqual([3, NO_REGION]);
  });
});

describe("picking", () => {
  it("reads the region under a point from the id buffer", () => {
    const grid = fixture();
    const dots = sampleLattice(grid, 3, centroids([[0, 0], [62, 62], [Number.NaN, Number.NaN]]));
    expect(pickRegion(grid, dots, 10, 10, 1)).toBe(0);
    expect(pickRegion(grid, dots, 62, 62, 1)).toBe(1);
    expect(pickRegion(grid, dots, 70, 10, 1)).toBe(NO_REGION);
  });

  it("takes the majority around a border cell the buffer left empty", () => {
    const grid = fixture();
    const ids = grid.ids.slice();
    ids[10 * grid.width + 5] = NO_REGION;
    const holed = { ...grid, ids };
    const dots = sampleLattice(holed, 3, centroids([[0, 0], [62, 62], [Number.NaN, Number.NaN]]));
    expect(pickRegion(holed, dots, 10, 20, 1)).toBe(0);
  });

  it("lets a centroid dot win over the shape it sits inside", () => {
    const grid = fixture();
    const dots = sampleLattice(grid, 3, centroids([[0, 0], [62, 62], [20, 20]]));
    expect(pickRegion(grid, dots, 23, 23, 1, 10)).toBe(2);
    expect(pickRegion(grid, dots, 5, 5, 1, 10)).toBe(0);
  });
});
