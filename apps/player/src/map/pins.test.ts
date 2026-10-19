import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { Topology } from "topojson-specification";
import { collectionOf, topologyFeatures } from "./geometry";
import { pinsFor, regionAnchor, regionBounds } from "./pins";

const topology = JSON.parse(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "../../assets/map/states-hi.json"), "utf8")) as Topology;
const states = collectionOf(topologyFeatures(topology, "states"));

describe("pins and state frames", () => {
  it("sets a pin on the land of an irregular state", () => {
    const [lon, lat] = regionAnchor(states, "state:FL")!;
    expect(lon).toBeGreaterThan(-83.5);
    expect(lon).toBeLessThan(-80);
    expect(lat).toBeGreaterThan(26);
    expect(lat).toBeLessThan(30);
  });

  it("frames Alaska on its mainland, not the Aleutians' run across the Pacific", () => {
    const [w, s, e, n] = regionBounds(states, "state:AK")!;
    expect(w).toBeGreaterThan(-175);
    expect(e).toBeLessThan(-125);
    expect(s).toBeGreaterThan(50);
    expect(n).toBeLessThan(75);
  });

  it("frames Hawaii on its main islands, not the atolls to the northwest", () => {
    const [w, s, e, n] = regionBounds(states, "state:HI")!;
    expect(w).toBeGreaterThan(-162);
    expect(e).toBeLessThan(-153);
    expect(s).toBeGreaterThan(18);
    expect(n).toBeLessThan(23);
  });

  it("drops a pin only where a region exists, and none before the map loads", () => {
    const marks = new Map([["state:TX", "needs" as const], ["state:ZZ", "declared" as const]]);
    expect(pinsFor(states, marks).map((pin) => pin.regionKey)).toEqual(["state:TX"]);
    expect(pinsFor(null, marks)).toEqual([]);
  });
});
