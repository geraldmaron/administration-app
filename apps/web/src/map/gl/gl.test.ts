import { describe, expect, it } from "vitest";
import type { Topology } from "topojson-specification";
import { tableFromIndex, type RawIndex } from "../data";
import { neutralLens, type MapLens } from "../lenses/contract";
import { readFileSync } from "node:fs";
import { feature } from "topojson-client";
import type { MultiPolygon, Polygon } from "geojson";
import { fitBoundsOf, fitCamera, layerCollection, splitAtAntimeridian } from "./geojson";
import { flatColor, lensPaintsStates, paintLayer } from "./lens-paint";
import { fillOpacity, OTHERS_OPACITY } from "./style";

const INDEX: RawIndex = {
  world: { FRA: { c: [2, 46], b: [-5, 42, 8, 51], name: "France" }, USA: { c: [-98, 39], b: [-125, 24, -67, 49] } },
  states: { TX: { c: [-99, 31], b: [-106, 26, -93, 36] } },
  districts: {},
};

const square = (x: number, y: number): number[][] => [
  [x, y],
  [x + 1, y],
  [x + 1, y + 1],
  [x, y + 1],
  [x, y],
];

const TOPOLOGY = {
  type: "Topology",
  arcs: [square(0, 0), square(5, 5)],
  objects: {
    regions: {
      type: "GeometryCollection",
      geometries: [
        { type: "Polygon", id: "FRA", arcs: [[0]] },
        { type: "Polygon", id: "XXX", arcs: [[1]] },
      ],
    },
  },
} as unknown as Topology;

describe("the GL map's sources", () => {
  const table = tableFromIndex(INDEX);

  it("keys each feature by its region's table index and leaves out regions the table does not list", () => {
    const collection = layerCollection(table, "world", TOPOLOGY);
    expect(collection.features).toHaveLength(1);
    const [france] = collection.features;
    expect(france?.id).toBe(table.byKey.get("world:FRA")?.index);
    expect(france?.properties).toEqual({ key: "world:FRA", id: "FRA" });
  });

  it("refuses a topology with no regions object rather than drawing nothing", () => {
    expect(() => layerCollection(table, "world", { type: "Topology", arcs: [], objects: {} } as unknown as Topology)).toThrow(/regions/);
  });

  it("carries a box across the antimeridian past 180 so the fit takes the short way", () => {
    expect(fitBoundsOf([170, -20, -170, -10])).toEqual([
      [170, -20],
      [190, -10],
    ]);
    expect(fitBoundsOf([-5, 42, 8, 51])).toEqual([
      [-5, 42],
      [8, 51],
    ]);
  });
});

describe("a lens on the GL map", () => {
  const table = tableFromIndex(INDEX);

  it("draws a proportional mix as its largest share and plain land as nothing", () => {
    expect(flatColor({ kind: "solid", color: "solid-color" })).toBe("solid-color");
    expect(flatColor({ kind: "dither", colors: ["minor-share", "major-share"], weights: [0.3, 0.7] })).toBe("major-share");
    expect(flatColor({ kind: "none" })).toBeNull();
  });

  it("paints every region of the layer it is asked for, and only those", () => {
    const lens: MapLens = { ...neutralLens(), level: "nation", read: (region) => (region.id === "FRA" ? { text: "", rank: 1, fill: { kind: "solid", color: "france-color" } } : null) };
    const paints = paintLayer(table, "world", lens);
    expect(paints).toHaveLength(2);
    expect(paints.find((paint) => paint.id === table.byKey.get("world:FRA")?.index)?.fill).toBe("france-color");
    expect(paints.find((paint) => paint.id === table.byKey.get("world:USA")?.index)?.fill).toBeNull();
    expect(lensPaintsStates(lens)).toBe(false);
    expect(lensPaintsStates({ ...lens, level: "state" })).toBe(true);
  });

  it("fades only the regions a selection is not about", () => {
    expect(JSON.stringify(fillOpacity(true))).toContain(String(OTHERS_OPACITY));
    expect(JSON.stringify(fillOpacity(false))).not.toContain(String(OTHERS_OPACITY));
  });
});

const longEdges = (geometry: Polygon | MultiPolygon): number => {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.flat().reduce((count, ring) => count + ring.filter((point, i) => i > 0 && Math.abs((point[0] ?? 0) - (ring[i - 1]?.[0] ?? 0)) > 180).length, 0);
};

describe("a shape across the antimeridian", () => {
  it("is cut into pieces inside -180..180, so no edge runs the long way round the globe", () => {
    const straddling: Polygon = { type: "Polygon", coordinates: [[[178, 60], [-178, 60], [-178, 64], [178, 64], [178, 60]]] };
    const split = splitAtAntimeridian(straddling);
    expect(longEdges(split)).toBe(0);
    expect(split.type).toBe("MultiPolygon");
    const lons = (split as MultiPolygon).coordinates.flat(2).map((point) => point[0] ?? 0);
    expect(Math.min(...lons)).toBeGreaterThanOrEqual(-180);
    expect(Math.max(...lons)).toBeLessThanOrEqual(180);
    expect((split as MultiPolygon).coordinates).toHaveLength(2);
  });

  it("leaves a shape that does not cross untouched", () => {
    const france: Polygon = { type: "Polygon", coordinates: [[[-5, 42], [8, 42], [8, 51], [-5, 51], [-5, 42]]] };
    expect(splitAtAntimeridian(france)).toBe(france);
  });

  it("leaves no long edge anywhere in the baked world", () => {
    const topology = JSON.parse(readFileSync(new URL("../data/world-hi.json", import.meta.url), "utf8")) as Topology;
    const all = feature(topology, topology.objects["regions"] as never) as unknown as { features: { geometry: Polygon | MultiPolygon | null }[] };
    const remaining = all.features.reduce((count, f) => count + (f.geometry ? longEdges(splitAtAntimeridian(f.geometry)) : 0), 0);
    expect(remaining).toBe(0);
  });
});

describe("framing a target", () => {
  it("fits bounds to the box by Mercator, centered on them", () => {
    const { center, zoom } = fitCamera([-10, -10, 10, 10], 512, 512);
    expect(center[0]).toBeCloseTo(0, 6);
    expect(center[1]).toBeCloseTo(0, 6);
    expect(zoom).toBeCloseTo(Math.log2(360 / 20), 1);
  });
});
