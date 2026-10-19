import { describe, expect, it } from "vitest";
import { mapDestination } from "./map-routes";

const BUILT = new Set(["/", "/brief", "/nation/state/$id", "/world/nation/$id"]);
const UNBUILT = new Set(["/", "/brief"]);

describe("where a choice on the map leads", () => {
  it("routes a state, a district and a government to their screens", () => {
    expect(mapDestination("state:CA", BUILT)).toBe("/nation/state/CA");
    expect(mapDestination("district:NY-12", BUILT)).toBe("/nation/state/NY?district=NY-12");
    expect(mapDestination("nation:FRA", BUILT)).toBe("/world/nation/FRA");
  });

  it("leaves the choice to the map while the screen is not built", () => {
    expect(mapDestination("state:CA", UNBUILT)).toBeNull();
    expect(mapDestination("nation:FRA", UNBUILT)).toBeNull();
  });

  it("leaves refs with no screen of their own to the map", () => {
    expect(mapDestination("zone:SEA-red-sea", BUILT)).toBeNull();
    expect(mapDestination("point:10,20", BUILT)).toBeNull();
    expect(mapDestination("state:", BUILT)).toBeNull();
    expect(mapDestination("world", BUILT)).toBeNull();
  });
});
