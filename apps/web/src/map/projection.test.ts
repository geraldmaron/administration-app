import { describe, expect, it } from "vitest";
import { geoAzimuthalEqualArea, geoNaturalEarth1 } from "d3-geo";
import { blendForExtent, boundsExtent, isVisibleFrom, makeProjection, PLANE_SCALE } from "./projection";

const close = (a: readonly number[] | null, b: readonly number[] | null) => {
  expect(a).not.toBeNull();
  expect(b).not.toBeNull();
  a?.forEach((v, i) => expect(v).toBeCloseTo(b?.[i] ?? Number.NaN, 6));
};

describe("projection blend", () => {
  const places: [number, number][] = [[-77, 38.9], [2.35, 48.85], [139.7, 35.7], [-58.4, -34.6]];

  it("is Natural Earth rotated to the focus longitude at blend 0", () => {
    const blended = makeProjection({ lon: 20, lat: 40, blend: 0 });
    const reference = geoNaturalEarth1().rotate([-20, 0]).scale(PLANE_SCALE).translate([0, 0]);
    for (const place of places) close(blended(place), reference(place));
  });

  it("is azimuthal equal-area centered on the focus at blend 1", () => {
    const blended = makeProjection({ lon: -98, lat: 39, blend: 1 });
    const reference = geoAzimuthalEqualArea().rotate([98, -39]).scale(PLANE_SCALE).translate([0, 0]);
    for (const place of places.slice(0, 2)) close(blended(place), reference(place));
    close(blended([-98, 39]), [0, 0]);
  });

  it("interpolates the two raw projections in between", () => {
    const ne = makeProjection({ lon: 0, lat: 0, blend: 0 })([30, 10]);
    const az = makeProjection({ lon: 0, lat: 0, blend: 1 })([30, 10]);
    const mid = makeProjection({ lon: 0, lat: 0, blend: 0.5 })([30, 10]);
    close(mid, [((ne?.[0] ?? 0) + (az?.[0] ?? 0)) / 2, ((ne?.[1] ?? 0) + (az?.[1] ?? 0)) / 2]);
  });

  it("stays Natural Earth for a world-sized target and goes azimuthal for a country", () => {
    expect(blendForExtent(360)).toBe(0);
    expect(blendForExtent(120)).toBe(0);
    expect(blendForExtent(40)).toBe(1);
    expect(blendForExtent(5)).toBe(1);
    expect(blendForExtent(80)).toBeGreaterThan(0);
    expect(blendForExtent(80)).toBeLessThan(1);
  });

  it("measures an antimeridian-crossing extent the short way round", () => {
    expect(boundsExtent([170, 50, -170, 60])).toBeCloseTo(20 * Math.cos((55 * Math.PI) / 180), 6);
  });

  it("culls the far hemisphere only once the view is azimuthal", () => {
    const australia = [113, -44, 154, -10] as const;
    expect(isVisibleFrom({ lon: -98, lat: 39, blend: 0 }, australia)).toBe(true);
    expect(isVisibleFrom({ lon: -98, lat: 39, blend: 1 }, australia)).toBe(false);
    expect(isVisibleFrom({ lon: -98, lat: 39, blend: 1 }, [-80, 25, -75, 30])).toBe(true);
  });
});

describe("the blend's inverse", () => {
  it("returns the lon/lat a point was projected from, at every blend", () => {
    for (const blend of [0, 0.35, 0.6, 0.86, 1]) {
      const projection = makeProjection({ lon: -96, lat: 38, blend });
      for (const at of [[-100, 40], [-75, 42], [-120, 35], [-90, 30]] as const) {
        const point = projection([at[0], at[1]]);
        expect(point).not.toBeNull();
        const back = projection.invert?.(point!);
        expect(back?.[0]).toBeCloseTo(at[0], 4);
        expect(back?.[1]).toBeCloseTo(at[1], 4);
      }
    }
  });
});
