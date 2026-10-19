import type { DeviceDrawing, DevicePart } from "../types";
import { circle, ellipse, line, poly, polar, rect, type Point } from "./draw";

export const ANCHOR: DeviceDrawing = {
  parts: [
    { d: `${circle(50, 13, 8)} ${circle(50, 13, 4)}`, evenOdd: true },
    { d: rect(30, 24, 40, 6) },
    { d: circle(30, 27, 3.5) },
    { d: circle(70, 27, 3.5) },
    { d: rect(46.5, 20, 7, 66) },
    { d: "M18,62 C20,80 34,88 50,88 C66,88 80,80 82,62", stroke: 6 },
    { d: poly([[10, 66], [18, 52], [26, 66]]) },
    { d: poly([[74, 66], [82, 52], [90, 66]]) },
  ],
};

export const SHIP: DeviceDrawing = {
  parts: [
    { d: poly([[6, 62], [94, 62], [86, 78], [16, 78]]) },
    { d: line([[14, 68], [88, 68]]), tone: "field", stroke: 1.6 },
    ...[30, 52, 72].map((x) => ({ d: line([[x, 8 + (x === 52 ? 0 : 8)], [x, 62]]), stroke: 2.2 })),
    ...([[30, 18, 14], [52, 10, 18], [72, 18, 14]] as const).flatMap(([x, top, w]): readonly DevicePart[] => [
      { d: `M${x - w},${top + 4} C${x - w + 4},${top + 1} ${x + w - 4},${top + 1} ${x + w},${top + 4} L${x + w - 2},${top + 18} L${x - w + 2},${top + 18} Z` },
      { d: `M${x - w + 1},${top + 22} C${x - w + 5},${top + 19} ${x + w - 5},${top + 19} ${x + w - 1},${top + 22} L${x + w - 3},${top + 38} L${x - w + 3},${top + 38} Z` },
    ]),
    { d: poly([[52, 4], [62, 6], [52, 8]]) },
    { d: poly([[78, 56], [94, 40], [92, 56]]) },
    { d: "M4,86 C14,80 22,80 32,86 C42,92 50,92 60,86 C70,80 78,80 88,86 L96,86", stroke: 3.2 },
  ],
};

export const LIGHTHOUSE: DeviceDrawing = {
  parts: [
    { d: poly([[44, 14], [56, 14], [56, 18], [44, 18]]) },
    { d: "M42,14 C42,6 58,6 58,14 Z" },
    { d: rect(43, 18, 14, 12) },
    { d: rect(46, 20, 8, 8), tone: "field" },
    { d: rect(38, 30, 24, 4) },
    { d: poly([[41, 34], [59, 34], [64, 80], [36, 80]]) },
    { d: poly([[39.3, 50], [60.7, 50], [61.6, 58], [38.4, 58]]), tone: "field" },
    { d: poly([[37.6, 66], [62.4, 66], [63.2, 73], [36.8, 73]]), tone: "field" },
    { d: poly([[62, 20], [94, 10], [94, 20]]) },
    { d: poly([[38, 20], [6, 10], [6, 20]]) },
    { d: poly([[24, 80], [76, 80], [84, 88], [16, 88]]) },
    { d: "M4,94 C14,88 24,88 34,94 C44,100 56,100 66,94 C76,88 86,88 96,94", stroke: 3 },
  ],
};

function rosePoint(degrees: number, length: number, width: number): readonly [readonly Point[], readonly Point[]] {
  const tip = polar(50, 50, length, degrees);
  const left = polar(50, 50, width, degrees - 45);
  const right = polar(50, 50, width, degrees + 45);
  return [[[50, 50], left, tip], [[50, 50], tip, right]];
}

export const COMPASS_ROSE: DeviceDrawing = {
  parts: [
    { d: `${circle(50, 50, 34)} ${circle(50, 50, 30)}`, evenOdd: true },
    ...[45, 135, 225, 315].flatMap((deg): readonly DevicePart[] => {
      const [a, b] = rosePoint(deg, 30, 7);
      return [{ d: poly(a) }, { d: poly(b), tone: "rim" }];
    }),
    ...[0, 90, 180, 270].flatMap((deg): readonly DevicePart[] => {
      const [a, b] = rosePoint(deg, 47, 10);
      return [{ d: poly(a) }, { d: poly(b), tone: "rim" }, { d: poly([...a, ...b.slice(1)]), stroke: 1.2 }];
    }),
    { d: circle(50, 50, 4), tone: "field" },
  ],
};

export const GLOBE: DeviceDrawing = {
  parts: [
    { d: circle(50, 50, 40), stroke: 4.5 },
    { d: ellipse(50, 50, 16, 40), stroke: 3 },
    { d: line([[50, 10], [50, 90]]), stroke: 3 },
    { d: line([[10, 50], [90, 50]]), stroke: 3 },
    { d: "M16,30 C34,36 66,36 84,30", stroke: 3 },
    { d: "M16,70 C34,64 66,64 84,70", stroke: 3 },
  ],
};

const MAP: readonly Point[] = [[8, 22], [36, 14], [64, 22], [92, 14], [92, 78], [64, 86], [36, 78], [8, 86]];

export const MAP_GRID: DeviceDrawing = {
  parts: [
    { d: poly(MAP) },
    { d: line([[36, 14], [36, 78]]), tone: "field", stroke: 2 },
    { d: line([[64, 22], [64, 86]]), tone: "field", stroke: 2 },
    { d: line([[8, 44], [36, 37], [64, 45], [92, 37]]), tone: "field", stroke: 1.4 },
    { d: line([[8, 66], [36, 59], [64, 67], [92, 59]]), tone: "field", stroke: 1.4 },
    { d: "M50,62 C42,50 38,44 38,38 C38,30 44,26 50,26 C56,26 62,30 62,38 C62,44 58,50 50,62 Z", tone: "field" },
    { d: "M50,58 C44,49 41,44 41,38 C41,32 45,29 50,29 C55,29 59,32 59,38 C59,44 56,49 50,58 Z", tone: "rim" },
    { d: circle(50, 38, 3.5), tone: "field" },
  ],
};
