import { describe, expect, it } from "vitest";
import { applyAffine, fitRectIn, rectInside, visibleArea } from "./camera";
import { UNITED_STATES, WORLD } from "./camera-keys";
import { insetLayout } from "./insets";
import { chooseMotion, detachDuration, isLongMove, recolorDuration, LONG_ZOOM_LEVELS } from "./motion";
import { makeProjection } from "./projection";
import { crossesSeam, framingArea, frameTarget, planeRectOf, projectionFor, screenRectOf } from "./target";

describe("visible area", () => {
  it("is the viewport less what the chrome covers", () => {
    expect(visibleArea({ width: 1440, height: 900 }, { top: 0, right: 480, bottom: 0, left: 72 })).toEqual({ x0: 72, y0: 0, x1: 960, y1: 900 });
    expect(visibleArea({ width: 390, height: 844 }, { top: 91, right: 0, bottom: 418, left: 0 })).toEqual({ x0: 0, y0: 91, x1: 390, y1: 426 });
  });

  it("never collapses below a sliver when a sheet covers everything", () => {
    const area = visibleArea({ width: 390, height: 844 }, { top: 91, right: 0, bottom: 900, left: 0 });
    expect(area.y1 - area.y0).toBeGreaterThanOrEqual(48);
  });
});

describe("framing", () => {
  it("centers a plane rect in an occluded area and keeps it inside", () => {
    const area = { x0: 0, y0: 0, x1: 960, y1: 900 };
    const camera = fitRectIn({ x0: -100, y0: -50, x1: 100, y1: 50 }, area, 24);
    const [cx, cy] = applyAffine(camera, 0, 0);
    expect(cx).toBeCloseTo(480);
    expect(cy).toBeCloseTo(450);
    const [x0] = applyAffine(camera, -100, -50);
    const [x1] = applyAffine(camera, 100, 50);
    expect(x0).toBeCloseTo(24);
    expect(x1).toBeCloseTo(936);
  });

  it("frames a target inside the visible strip above a phone sheet", () => {
    const viewport = { width: 390, height: 844 };
    const area = visibleArea(viewport, { top: 47, right: 0, bottom: 418, left: 0 });
    const projection = makeProjection(projectionFor(WORLD));
    const camera = frameTarget(projection, WORLD, viewport, area);
    const plane = planeRectOf(projection, WORLD.bounds)!;
    const [, top] = applyAffine(camera, plane.x0, plane.y0);
    const [, bottom] = applyAffine(camera, plane.x1, plane.y1);
    expect(top).toBeGreaterThanOrEqual(area.y0 - 1);
    expect(bottom).toBeLessThanOrEqual(area.y1 + 1);
  });

  it("frames the contiguous states above the Alaska and Hawaii band", () => {
    const viewport = { width: 1440, height: 900 };
    const area = visibleArea(viewport);
    const frame = framingArea(UNITED_STATES, area);
    const layout = insetLayout(area);
    expect(frame.y1).toBe(area.y1 - layout.reserve);
    const projection = makeProjection(projectionFor(UNITED_STATES));
    const rect = screenRectOf(projection, frameTarget(projection, UNITED_STATES, viewport, area), UNITED_STATES.bounds)!;
    expect(rectInside(rect, frame, 1)).toBe(true);
    expect(framingArea(WORLD, area)).toBe(area);
  });
});

describe("insets", () => {
  it("sit side by side in the lower left of the area, inside it", () => {
    for (const area of [{ x0: 0, y0: 0, x1: 1440, y1: 900 }, { x0: 0, y0: 47, x1: 390, y1: 426 }, { x0: 72, y0: 0, x1: 960, y1: 900 }]) {
      const { alaska, hawaii } = insetLayout(area);
      expect(rectInside(alaska, area)).toBe(true);
      expect(rectInside(hawaii, area)).toBe(true);
      expect(hawaii.x0).toBeGreaterThan(alaska.x1);
      expect(alaska.y1).toBe(hawaii.y1);
    }
  });
});

describe("motion rules", () => {
  const area = { x0: 0, y0: 0, x1: 1000, y1: 800 };
  const near = { x0: 400, y0: 300, x1: 600, y1: 450 };

  it("calls a move long when the target is outside the framing or the zoom jumps", () => {
    expect(isLongMove(null, near, area)).toBe(true);
    expect(isLongMove({ x0: 1200, y0: 0, x1: 1300, y1: 100 }, near, area)).toBe(true);
    expect(isLongMove(near, { x0: 0, y0: 0, x1: 200 * 2 ** (LONG_ZOOM_LEVELS + 0.2), y1: 150 }, area)).toBe(true);
    expect(isLongMove(near, { x0: 300, y0: 200, x1: 700, y1: 500 }, area)).toBe(false);
  });

  it("cuts under reduced motion and the Cut setting, and keeps short moves quick", () => {
    expect(chooseMotion("fly", true, true)).toEqual({ kind: "cut" });
    expect(chooseMotion("cut", false, true)).toEqual({ kind: "cut" });
    expect(chooseMotion("fly", false, false)).toEqual({ kind: "move", maxDuration: 250 });
    expect(chooseMotion("fly", false, true)).toEqual({ kind: "move" });
    expect(chooseMotion("quick", false, true)).toEqual({ kind: "move", maxDuration: 350 });
  });

  it("recolors in 200ms, 400ms on a level change, and instantly under reduced motion", () => {
    expect(recolorDuration(false, false)).toBe(200);
    expect(recolorDuration(true, false)).toBe(400);
    expect(recolorDuration(true, true)).toBe(0);
    expect(detachDuration(false)).toBe(280);
    expect(detachDuration(true)).toBe(0);
  });
});

describe("the view's seam", () => {
  it("knows a target split by the antimeridian of the view it is drawn in", () => {
    expect(crossesSeam([19.6, 41.2, -169.7, 81.8], 0)).toBe(true);
    expect(crossesSeam([165.9, -52.6, -159.7, -8.5], 0)).toBe(true);
    expect(crossesSeam([22.1, 45.2, 40.1, 52.3], 0)).toBe(false);
  });

  it("moves the seam with the view's center", () => {
    expect(crossesSeam([-125, 24.4, -66.9, 49.4], 100)).toBe(true);
    expect(crossesSeam([-125, 24.4, -66.9, 49.4], -95)).toBe(false);
    expect(crossesSeam([19.6, 41.2, -169.7, 81.8], 100)).toBe(false);
  });

  it("never calls the whole world split", () => {
    expect(crossesSeam([-180, -58, 180, 84], 0)).toBe(false);
  });
});
