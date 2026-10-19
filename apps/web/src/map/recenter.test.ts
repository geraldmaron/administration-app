import { describe, expect, it } from "vitest";
import { makeProjection } from "./projection";
import { recenterFor } from "./recenter";

const area = { x0: 400, y0: 0, x1: 1400, y1: 900 };

describe("re-centering a tilted view", () => {
  it("re-centers an azimuthal view whose middle has drifted far from its center", () => {
    const state = { lon: -77, lat: 39, blend: 1 };
    const projection = makeProjection(state);
    const at = projection([-100, 41])!;
    const camera = { k: 4, x: 900 - 4 * at[0], y: 450 - 4 * at[1] };
    const result = recenterFor(projection, state, camera, area);
    expect(result?.center[0]).toBeCloseTo(-100, 3);
    expect(result?.center[1]).toBeCloseTo(41, 3);
  });

  it("leaves a view centered on its projection alone, and never re-centers Natural Earth", () => {
    const state = { lon: -77, lat: 39, blend: 1 };
    const projection = makeProjection(state);
    const at = projection([-78, 39.5])!;
    expect(recenterFor(projection, state, { k: 4, x: 900 - 4 * at[0], y: 450 - 4 * at[1] }, area)).toBeNull();
    const world = { lon: 0, lat: 0, blend: 0 };
    expect(recenterFor(makeProjection(world), world, { k: 1, x: 0, y: 0 }, area)).toBeNull();
  });
});
