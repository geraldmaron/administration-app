import { describe, expect, it } from "vitest";
import { fitRect, flightDuration, smoothZoom, zoomAbout } from "./camera";
import { flightFrame, flightPoint, planFlight } from "./flight";
import { planLevels } from "./levels";
import { percentile, summarize } from "./stats";

const viewport = { width: 1440, height: 900 };

describe("camera", () => {
  it("fits a plane rectangle inside the padded viewport, centered", () => {
    const a = fitRect({ x0: -500, y0: -250, x1: 500, y1: 250 }, viewport, 20);
    expect(a.k).toBeCloseTo(1.4, 6);
    expect(a.x).toBeCloseTo(720, 6);
    expect(a.y).toBeCloseTo(450, 6);
  });

  it("zooms about a point without moving it", () => {
    const a = zoomAbout({ k: 2, x: 10, y: 20 }, 3, 300, 200);
    expect((300 - 10) / 2).toBeCloseTo((300 - a.x) / a.k, 9);
    expect((200 - 20) / 2).toBeCloseTo((200 - a.y) / a.k, 9);
  });

  it("smooth zoom starts and ends at its views and zooms out between distant ones", () => {
    const path = smoothZoom({ cx: 0, cy: 0, w: 100 }, { cx: 1000, cy: 0, w: 100 });
    expect(path.at(0).cx).toBeCloseTo(0, 6);
    expect(path.at(1).cx).toBeCloseTo(1000, 6);
    expect(path.at(1).w).toBeCloseTo(100, 6);
    expect(path.at(0.5).w).toBeGreaterThan(100);
    expect(flightDuration(path)).toBeGreaterThanOrEqual(600);
    expect(flightDuration(path)).toBeLessThanOrEqual(1100);
  });
});

describe("cached-bitmap flight", () => {
  const plan = planFlight({ x0: 300, y0: 300, x1: 400, y1: 360 }, { x0: 120, y0: 150, x1: 1320, y1: 870 }, viewport);

  it("starts on the source bitmap untouched and lands on the destination untouched", () => {
    const start = flightFrame(plan, 0);
    expect(start.source.k).toBeCloseTo(1, 6);
    expect(start.source.x).toBeCloseTo(0, 6);
    expect(start.destAlpha).toBe(0);
    const end = flightFrame(plan, plan.duration);
    expect(end.dest.k).toBeCloseTo(1, 6);
    expect(end.dest.x).toBeCloseTo(0, 4);
    expect(end.dest.y).toBeCloseTo(0, 4);
    expect(end.destAlpha).toBe(1);
  });

  it("keeps the two bitmaps registered on the target all the way", () => {
    for (const t of [0.2, 0.5, 0.8]) {
      const frame = flightFrame(plan, plan.duration * t);
      const sourceCenter = 350 * frame.source.k + frame.source.x;
      const destCenter = 720 * frame.dest.k + frame.dest.x;
      expect(destCenter).toBeCloseTo(sourceCenter, 4);
    }
  });
});

describe("levels of detail", () => {
  it("drops a district lens to state dither until state zoom", () => {
    expect(planLevels("district", 50, false).effective).toBe("state");
    expect(planLevels("district", 8, false).effective).toBe("district");
    expect(planLevels("district", 8, false).layers.map((l) => `${l.layer}-${l.lod}`)).toEqual(["world-hi", "districts-hi"]);
  });

  it("uses the light levels for a flight's destination frame", () => {
    expect(planLevels("district", 8, true).layers.map((l) => `${l.layer}-${l.lod}`)).toEqual(["world-lo", "districts-lo"]);
    expect(planLevels("nation", 360, false).layers.map((l) => `${l.layer}-${l.lod}`)).toEqual(["world-lo"]);
  });

  it("replaces the United States' nation shape whenever states or districts draw", () => {
    expect(planLevels("nation", 30, false).replacesUsa).toBe(false);
    expect(planLevels("state", 30, false).replacesUsa).toBe(true);
  });
});

describe("frame statistics", () => {
  it("reports nearest-rank percentiles", () => {
    const values = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(percentile(values, 50)).toBe(50);
    expect(percentile(values, 95)).toBe(95);
    const summary = summarize(values.map((v) => ({ interval: 16, work: v / 10, phase: "pan" as const })));
    expect(summary.fps).toBeCloseTo(62.5, 6);
    expect(summary.workMax).toBe(10);
  });
});

describe("pins in flight", () => {
  const plan = planFlight({ x0: 100, y0: 100, x1: 300, y1: 200 }, { x0: 500, y0: 300, x1: 900, y1: 500 }, viewport, 1000);

  it("ride the source bitmap's transform before the destination is ready", () => {
    const frame = flightFrame(plan, 400);
    const at = flightPoint(frame, [200, 150], null, false);
    expect(at).toEqual([200 * frame.source.k + frame.source.x, 150 * frame.source.k + frame.source.y]);
  });

  it("start where the pin was drawn and land where the destination draws it", () => {
    const start = flightPoint(flightFrame(plan, 0), [200, 150], [700, 400], true);
    expect(start?.[0]).toBeCloseTo(200, 6);
    expect(start?.[1]).toBeCloseTo(150, 6);
    const end = flightPoint(flightFrame(plan, plan.duration), [200, 150], [700, 400], true);
    expect(end?.[0]).toBeCloseTo(700, 3);
    expect(end?.[1]).toBeCloseTo(400, 3);
  });

  it("follow whichever bitmap is visible when the point is off the other's hemisphere", () => {
    expect(flightPoint(flightFrame(plan, 0), [200, 150], null, true)).not.toBeNull();
    expect(flightPoint(flightFrame(plan, plan.duration), [200, 150], null, true)).toBeNull();
    expect(flightPoint(flightFrame(plan, 0), null, [700, 400], true)).toBeNull();
  });
});
