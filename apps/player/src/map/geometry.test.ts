import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { Topology } from "topojson-specification";
import type { Position } from "geojson";
import { insetFrame, splitAtAntimeridian, topologyFeatures, usInsets, withInsets, type RegionFeature } from "./geometry";

const topology = (name: string): Topology => JSON.parse(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), `../../assets/map/${name}.json`), "utf8")) as Topology;
const states = topologyFeatures(topology("states-hi"), "states");
const world = topologyFeatures(topology("world-hi"), "world");
const US_FRAME = [-138, 12, -65, 50] as const;

function boxOf(region: RegionFeature): readonly [number, number, number, number] {
  const points: Position[] = region.geometry.type === "Polygon" ? region.geometry.coordinates.flat() : region.geometry.coordinates.flat(2);
  const lons = points.map((point) => point[0] ?? 0);
  const lats = points.map((point) => point[1] ?? 0);
  return [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)];
}

describe("the map's regions", () => {
  it("keys every feature by its ref and layer", () => {
    expect(states).toHaveLength(51);
    expect(states.find((region) => region.properties.key === "state:CA")?.properties.layer).toBe("states");
    expect(world.some((region) => region.properties.key === "nation:FRA")).toBe(true);
  });

  it("cuts a shape that crosses the antimeridian so every piece sits inside -180..180", () => {
    const crossing = splitAtAntimeridian({ type: "Polygon", coordinates: [[[178, 0], [-178, 0], [-178, 2], [178, 2], [178, 0]]] });
    expect(crossing.type).toBe("MultiPolygon");
    const lons = (crossing.coordinates as Position[][][]).flat(2).map((point) => point[0] ?? 0);
    expect(Math.max(...lons)).toBeLessThanOrEqual(180);
    expect(Math.min(...lons)).toBeGreaterThanOrEqual(-180);
    for (const region of world) expect(boxOf(region)[2] - boxOf(region)[0]).toBeLessThanOrEqual(360);
  });
});

describe("Alaska and Hawaii on the US frame", () => {
  const insets = usInsets(US_FRAME);
  const moved = withInsets(states, insets);
  const box = (key: string) => boxOf(moved.find((region) => region.properties.key === key)!);

  it("moves both inside the frame and leaves the contiguous states where they are", () => {
    for (const key of ["state:AK", "state:HI"]) {
      const [w, s, e, n] = box(key);
      expect(w).toBeGreaterThanOrEqual(US_FRAME[0]);
      expect(s).toBeGreaterThanOrEqual(US_FRAME[1]);
      expect(e).toBeLessThanOrEqual(US_FRAME[2]);
      expect(n).toBeLessThanOrEqual(US_FRAME[3]);
    }
    expect(box("state:CA")).toEqual(boxOf(states.find((region) => region.properties.key === "state:CA")!));
  });

  it("sets each clear of the contiguous states and of Mexico, framed as an inset", () => {
    const neighbors = [...moved.filter((region) => region.properties.layer === "states" && !["state:AK", "state:HI"].includes(region.properties.key)), ...world.filter((region) => ["nation:MEX", "nation:CAN"].includes(region.properties.key))];
    for (const inset of insets) {
      const [w, s, e, n] = boxOf(insetFrame(inset));
      for (const neighbor of neighbors) {
        const points: Position[] = neighbor.geometry.type === "Polygon" ? neighbor.geometry.coordinates.flat() : neighbor.geometry.coordinates.flat(2);
        const inside = points.find(([lon = 0, lat = 0]) => lon > w && lon < e && lat > s && lat < n);
        expect(inside, `${neighbor.properties.key} inside the ${inset.id} inset`).toBeUndefined();
      }
    }
    expect(moved.filter((region) => region.properties.layer === "inset").map((region) => region.properties.key)).toEqual(["inset:AK", "inset:HI"]);
    expect(moved.filter((region) => region.properties.layer === "mask").map((region) => region.properties.key).sort()).toEqual(["mask:state:AK", "mask:state:HI"]);
  });

  it("keeps Hawaii to its main islands", () => {
    const [w, , e] = box("state:HI");
    expect(e - w).toBeLessThan(8);
  });
});
