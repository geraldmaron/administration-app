import type { DeviceDrawing } from "../types";
import { circle, ellipse, line, mirror, poly, rect, star, type Point } from "./draw";

export const STAR: DeviceDrawing = {
  parts: [{ d: star(50, 53, 44, 5, 0.4) }],
};

/* Thirteen stars in the six-pointed constellation of the first union: rows of one, four, three, four, one. */
const CONSTELLATION: readonly Point[] = [
  [50, 14],
  [26, 32], [42, 32], [58, 32], [74, 32],
  [34, 50], [50, 50], [66, 50],
  [26, 68], [42, 68], [58, 68], [74, 68],
  [50, 86],
];

export const STAR_CLUSTER: DeviceDrawing = {
  parts: CONSTELLATION.map(([x, y]) => ({ d: star(x, y, 8.5, 5, 0.4) })),
};

export const SOUTHERN_CROSS: DeviceDrawing = {
  parts: [
    { d: star(50, 12, 10, 5, 0.42) },
    { d: star(28, 44, 9, 5, 0.42) },
    { d: star(74, 38, 8, 5, 0.42) },
    { d: star(62, 56, 5, 5, 0.42) },
    { d: star(48, 86, 11, 5, 0.42) },
  ],
};

const SHIELD: readonly Point[] = [[14, 8], [86, 8], [86, 46], [82, 62], [72, 76], [50, 92], [28, 76], [18, 62], [14, 46]];

export const SHIELD_STARS_STRIPES: DeviceDrawing = {
  parts: [
    { d: poly(SHIELD) },
    { d: poly([[20, 36], [80, 36], [80, 47], [76, 61], [67, 72], [50, 85], [33, 72], [24, 61], [20, 47]]), tone: "field" },
    ...[23, 37, 50, 63, 77].map((x) => ({ d: rect(x - 3.4, 34, 6.8, 54) })),
    { d: poly(SHIELD.map(([x, y]) => [x, y] as const)), tone: "ink", stroke: 4 },
    { d: rect(14, 8, 72, 26) },
    ...[30, 50, 70].map((x) => ({ d: star(x, 21, 7, 5, 0.42), tone: "field" as const })),
  ],
};

const WING: readonly Point[] = [[40, 46], [8, 32], [4, 38], [16, 44], [6, 46], [18, 52], [10, 56], [24, 58], [20, 62], [38, 60]];

export const WINGED_STAR: DeviceDrawing = {
  parts: [
    { d: poly(WING) },
    { d: poly(mirror(WING)) },
    { d: circle(50, 52, 17), tone: "field" },
    { d: circle(50, 52, 15) },
    { d: star(50, 53, 12, 5, 0.42), tone: "field" },
  ],
};

function linkArc(cx: number, from: number, to: number): string {
  const pts: Point[] = [];
  for (let i = 0; i <= 12; i++) {
    const t = ((from + ((to - from) * i) / 12) * Math.PI) / 180;
    pts.push([cx + 22 * Math.cos(t), 50 + 13 * Math.sin(t)]);
  }
  return line(pts);
}

/* Two links interlocked: the right link passes over the left at the bottom, under it at the top. */
export const CHAIN_LINKS: DeviceDrawing = {
  parts: [
    { d: ellipse(34, 50, 22, 13), stroke: 7 },
    { d: ellipse(66, 50, 22, 13), tone: "field", stroke: 12 },
    { d: ellipse(66, 50, 22, 13), stroke: 7 },
    { d: linkArc(34, -85, -15), tone: "field", stroke: 12 },
    { d: linkArc(34, -85, -15), stroke: 7 },
  ],
};

export const BATTLEMENT: DeviceDrawing = {
  parts: [
    { d: poly([[8, 30], [20, 30], [20, 40], [32, 40], [32, 30], [44, 30], [44, 40], [56, 40], [56, 30], [68, 30], [68, 40], [80, 40], [80, 30], [92, 30], [92, 88], [8, 88]]) },
    { d: "M40,88 L40,70 C40,60 60,60 60,70 L60,88 Z", tone: "field" },
    ...[52, 64, 76].map((y) => ({ d: line([[12, y], [36, y]]), tone: "field" as const, stroke: 1.4 })),
    ...[52, 64, 76].map((y) => ({ d: line([[64, y], [88, y]]), tone: "field" as const, stroke: 1.4 })),
    { d: rect(16, 48, 6, 10), tone: "field" },
    { d: rect(78, 48, 6, 10), tone: "field" },
  ],
};

/** The letters are the device; the seal sets the monogram in their place. */
export const MONOGRAM: DeviceDrawing = { parts: [] };
