import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { worldNations } from "@admin/world";
import { describe, expect, it } from "vitest";
import { regionTable } from "./__fixtures__/map-fixtures";
import { regionKey } from "./data";
import { detachedNation } from "./detach";
import { decodeProvinces, selectedGovernment, type Baked } from "./provinces";

const DIR = fileURLToPath(new URL("./data/provinces/", import.meta.url));
const baked = (id: string): Baked => JSON.parse(readFileSync(`${DIR}${id}.json`, "utf8")) as Baked;
const files = readdirSync(DIR).filter((name) => name.endsWith(".json"));

describe("baked provinces", () => {
  it("covers only governments on the roster, never the United States", () => {
    const roster = new Set<string>(worldNations.map((nation) => nation.id));
    const ids = files.map((name) => name.replace(/\.json$/, ""));
    expect(ids.length).toBeGreaterThan(150);
    expect(ids.filter((id) => !roster.has(id))).toEqual([]);
    expect(ids).not.toContain("USA");
  });

  it("decodes every file to lines on the globe and named provinces", () => {
    for (const name of files) {
      const set = decodeProvinces(name, baked(name.replace(/\.json$/, "")));
      expect(set.provinces.length).toBeGreaterThan(1);
      for (const line of set.lines.coordinates) {
        expect(line.length).toBeGreaterThanOrEqual(2);
        for (const [lon = Number.NaN, lat = Number.NaN] of line) {
          expect(Math.abs(lon)).toBeLessThanOrEqual(180);
          expect(Math.abs(lat)).toBeLessThanOrEqual(90);
        }
      }
    }
  });

  it("draws Canada's provinces and Iran's, larger first", () => {
    const canada = decodeProvinces("CAN", baked("CAN"));
    expect(canada.provinces.map((p) => p.name)).toEqual(expect.arrayContaining(["Ontario", "Quebec", "British Columbia"]));
    expect(canada.lines.coordinates.length).toBeGreaterThan(5);
    const iran = decodeProvinces("IRN", baked("IRN"));
    expect(iran.provinces.map((p) => p.name)).toContain("Tehran");
    const areas = iran.provinces.map((p) => p.area);
    expect(areas).toEqual([...areas].sort((a, b) => b - a));
  });
});

describe("which government's provinces are drawn", () => {
  const table = regionTable();
  const index = (key: string): number => table.byKey.get(key)!.index;

  it("is the one foreign government a selection lifts", () => {
    expect(selectedGovernment(table, new Set([index(regionKey("world", "IRN"))]))).toBe("IRN");
    expect(selectedGovernment(table, new Set([index(regionKey("world", "USA"))]))).toBeNull();
    expect(selectedGovernment(table, new Set([index(regionKey("world", "IRN")), index(regionKey("world", "IRQ"))]))).toBeNull();
    expect(selectedGovernment(table, new Set([index(regionKey("states", "CA"))]))).toBeNull();
  });

  it("pins the cities of the same one government", () => {
    expect(detachedNation("nation:IRN")).toBe("IRN");
    expect(detachedNation("nation:USA")).toBeUndefined();
    expect(detachedNation("nation:IRN|nation:IRQ")).toBeUndefined();
    expect(detachedNation("state:CA")).toBeUndefined();
  });
});
