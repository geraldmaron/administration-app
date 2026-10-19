import { describe, expect, it } from "vitest";
import { regionTable } from "./__fixtures__/map-fixtures";
import { ALASKA, DC_METRO, HAWAII, UNITED_STATES, WORLD, atLeast, resolveCameraKey, unionBounds } from "./camera-keys";
import { boundsExtent } from "./projection";

const table = regionTable();

describe("camera keys", () => {
  it("resolves the fixed views", () => {
    expect(resolveCameraKey("world", table)).toBe(WORLD);
    expect(resolveCameraKey("us", table)).toBe(UNITED_STATES);
    expect(resolveCameraKey("dc", table)).toBe(DC_METRO);
    expect(UNITED_STATES.insets).toBe(true);
  });

  it("frames an office in the Washington metro at its sourced headquarters", () => {
    const pentagon = resolveCameraKey("office:INST-DOD", table);
    expect(pentagon?.label).toBe("The Pentagon");
    expect(pentagon?.bounds).toEqual(DC_METRO.bounds);
    const [lon, lat] = pentagon?.focus ?? [0, 0];
    expect(lon).toBeCloseTo(-77.056, 1);
    expect(lat).toBeCloseTo(38.871, 1);
  });

  it("frames an office outside the metro around its own point at the metro's scale", () => {
    const cdc = resolveCameraKey("office:INST-CDC", table);
    const [lon, lat] = cdc?.focus ?? [0, 0];
    expect(lat).toBeGreaterThan(33);
    expect(lat).toBeLessThan(34.5);
    expect(lon).toBeCloseTo(-84.3, 0);
    const [w, s, e, n] = cdc?.bounds ?? [0, 0, 0, 0];
    expect(e - w).toBeCloseTo(DC_METRO.bounds[2] - DC_METRO.bounds[0], 6);
    expect(n - s).toBeCloseTo(DC_METRO.bounds[3] - DC_METRO.bounds[1], 6);
    expect(lon).toBeGreaterThan(w);
    expect(lon).toBeLessThan(e);
  });

  it("falls back to the Washington metro for an office with no recorded site or an unknown id", () => {
    expect(resolveCameraKey("office:INST-JUDICIARY", table)).toBe(DC_METRO);
    expect(resolveCameraKey("office:anything-at-all", table)).toBe(DC_METRO);
  });

  it("frames a set of pins a few blocks across, so neighboring headquarters come apart", () => {
    const pins = resolveCameraKey("set:pin:-77.0343,38.8975|pin:-77.0367,38.8978", table);
    const [w, s, e, n] = pins?.bounds ?? [0, 0, 0, 0];
    expect(e - w).toBeLessThan(0.05);
    expect(n - s).toBeLessThan(0.05);
    expect(w).toBeLessThan(-77.0367);
    expect(e).toBeGreaterThan(-77.0343);
  });

  it("resolves states, with Alaska and Hawaii at their real places and DC at the metro", () => {
    expect(resolveCameraKey("state:CA", table)?.label).toBe("California");
    expect(resolveCameraKey("state:AK", table)).toBe(ALASKA);
    expect(resolveCameraKey("state:HI", table)).toBe(HAWAII);
    expect(resolveCameraKey("state:DC", table)?.bounds).toEqual(DC_METRO.bounds);
  });

  it("holds an urban district to a minimum span so its neighbors show", () => {
    const target = resolveCameraKey("district:NY-12", table);
    expect(target).not.toBeNull();
    const [w, s, e, n] = target!.bounds;
    expect(e - w).toBeGreaterThanOrEqual(0.6 - 1e-9);
    expect(n - s).toBeGreaterThanOrEqual(0.6 - 1e-9);
  });

  it("resolves nations, sending the United States to the home view and padding a point-only microstate", () => {
    expect(resolveCameraKey("nation:FRA", table)?.bounds).toBeDefined();
    expect(resolveCameraKey("nation:USA", table)).toBe(UNITED_STATES);
    const tuvalu = resolveCameraKey("nation:TUV", table);
    expect(tuvalu).not.toBeNull();
    expect(boundsExtent(tuvalu!.bounds)).toBeGreaterThan(4);
  });

  it("resolves a zone as a sea or as a government's own territory", () => {
    expect(resolveCameraKey("zone:SEA-red-sea", table)?.label).toBe("Red Sea and Gulf of Aden");
    expect(resolveCameraKey("zone:JPN", table)?.bounds).toEqual(resolveCameraKey("nation:JPN", table)?.bounds);
  });

  it("resolves points and sets", () => {
    const point = resolveCameraKey("point:-77,38.9", table);
    expect(point?.focus).toEqual([-77, 38.9]);
    const set = resolveCameraKey("set:state:CA|state:NY", table);
    expect(set?.label).toBe("California, New York");
    const [w, , e] = set!.bounds;
    expect(w).toBeLessThan(-120);
    expect(e).toBeGreaterThan(-75);
  });

  it("answers null for keep, unknown keys and unknown ids, so the map holds its framing", () => {
    for (const key of ["keep", "", "no-such-key", "state:ZZ", "district:ZZ-99", "nation:XXX", "zone:SEA-nowhere", "point:abc", "set:state:ZZ"]) {
      expect(resolveCameraKey(key, table)).toBeNull();
    }
  });
});

describe("bounds helpers", () => {
  it("unions across the Pacific the short way", () => {
    const japan = [129, 30, 146, 46] as const;
    const westCoast = [-125, 32, -114, 49] as const;
    const union = unionBounds([japan, westCoast])!;
    expect(union[0]).toBe(129);
    expect(union[2]).toBe(-114);
    expect(boundsExtent(union)).toBeLessThan(150);
  });

  it("keeps a member that straddles the prime meridian when the shifted way is shorter", () => {
    const britain = [-8, 50, 2, 59] as const;
    const westCoast = [-125, 32, -114, 49] as const;
    const korea = [124, 33, 131, 43] as const;
    const union = unionBounds([westCoast, britain])!;
    expect(union[0]).toBe(-125);
    expect(union[2]).toBe(2);
    const across = unionBounds([korea, britain, westCoast])!;
    expect(across[0]).toBe(124);
    expect(across[2]).toBe(2);
  });

  it("unions plainly when the short way is the plain one", () => {
    expect(unionBounds([[0, 0, 10, 10], [20, -5, 30, 5]])).toEqual([0, -5, 30, 10]);
    expect(unionBounds([])).toBeNull();
  });

  it("pads bounds out to a minimum span about their center", () => {
    expect(atLeast([10, 10, 10.2, 10.2], 1)).toEqual([9.6, 9.6, 10.6, 10.6].map((v) => expect.closeTo(v, 9)) as never);
    expect(atLeast([0, 0, 5, 5], 1)).toEqual([0, 0, 5, 5]);
  });
});
