import type { DeviceDrawing, DevicePart } from "../types";
import { circle, ellipse, line, poly, polar, rect, rotate, type Point } from "./draw";

export const ATOM: DeviceDrawing = {
  parts: [
    ...[0, 60, 120].map((deg) => ({ d: ellipse(50, 50, 42, 15, deg), stroke: 4 })),
    { d: circle(50, 50, 9) },
    { d: circle(50, 50, 3.5), tone: "field" },
  ],
};

function helixStrand(phase: number): string {
  const pts: Point[] = [];
  for (let i = 0; i <= 40; i++) {
    const y = 8 + i * 2.1;
    pts.push([50 + 20 * Math.sin(i * 0.31 + phase), y]);
  }
  return line(pts);
}

export const HELIX: DeviceDrawing = {
  parts: [
    ...[14, 24, 34, 44, 54, 64, 74, 84].map((y) => {
      const i = (y - 8) / 2.1;
      return { d: line([[50 + 20 * Math.sin(i * 0.31), y], [50 + 20 * Math.sin(i * 0.31 + Math.PI), y]]), stroke: 2.4 };
    }),
    { d: helixStrand(0), stroke: 5 },
    { d: helixStrand(Math.PI), tone: "field", stroke: 8 },
    { d: helixStrand(Math.PI), stroke: 5 },
  ],
};

export const FLASK: DeviceDrawing = {
  parts: [
    { d: rect(36, 8, 28, 6) },
    { d: "M41,14 L59,14 L59,38 L84,82 C86,87 83,92 78,92 L22,92 C17,92 14,87 16,82 L41,38 Z" },
    { d: "M45,18 L55,18 L55,40 L80,84 L20,84 L45,40 Z", tone: "field" },
    { d: "M31,62 L69,62 L80,84 L20,84 Z" },
    { d: circle(44, 74, 3), tone: "field" },
    { d: circle(56, 70, 2), tone: "field" },
  ],
};

const SERPENT = "M60,84 C38,80 38,68 50,63 C64,58 64,48 50,44 C36,40 36,30 50,26 C58,23 61,18 57,12";

export const ROD_OF_ASCLEPIUS: DeviceDrawing = {
  parts: [
    { d: rect(46.5, 6, 7, 88) },
    { d: SERPENT, tone: "field", stroke: 10 },
    { d: SERPENT, stroke: 6 },
    { d: ellipse(57, 11, 5, 3.5, -30) },
    { d: circle(58, 10, 1), tone: "field" },
  ],
};

function gearOutline(teeth: number, outer: number, inner: number): string {
  const pts: Point[] = [];
  const step = 360 / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    pts.push(polar(50, 50, inner, a - step * 0.3), polar(50, 50, outer, a - step * 0.18), polar(50, 50, outer, a + step * 0.18), polar(50, 50, inner, a + step * 0.3));
  }
  return poly(pts);
}

export const GEAR: DeviceDrawing = {
  parts: [{ d: `${gearOutline(12, 44, 35)} ${circle(50, 50, 15)}`, evenOdd: true }, { d: circle(50, 50, 6) }],
  charge: { x: 50, y: 48, size: 30 },
};

export const ANVIL: DeviceDrawing = {
  parts: [
    { d: "M8,32 C20,34 26,38 30,40 L30,34 L88,34 L88,46 C78,48 70,52 66,58 L66,66 L34,66 L34,58 C30,52 24,46 8,32 Z" },
    { d: poly([[34, 66], [66, 66], [74, 82], [26, 82]]) },
    { d: rect(20, 82, 60, 7) },
  ],
};

export const WHEEL: DeviceDrawing = {
  parts: [
    { d: `${circle(50, 50, 42)} ${circle(50, 50, 34)}`, evenOdd: true },
    ...Array.from({ length: 8 }, (_, i) => ({ d: line([polar(50, 50, 9, i * 45), polar(50, 50, 36, i * 45)]), stroke: 4.5 })),
    { d: circle(50, 50, 11) },
    { d: circle(50, 50, 4), tone: "field" },
  ],
};

export const LIGHTNING: DeviceDrawing = {
  parts: [{ d: poly([[60, 4], [26, 54], [46, 54], [36, 96], [76, 38], [55, 38], [70, 4]]) }],
};

const PANEL: readonly Point[] = [[8, 42], [36, 42], [36, 58], [8, 58]];

export const SATELLITE: DeviceDrawing = {
  parts: [
    ...[PANEL, PANEL.map(([x, y]) => [x + 56, y] as const)].flatMap((p): readonly DevicePart[] => [
      { d: poly(rotate(p, -30)) },
      { d: line(rotate([[p[0]![0] + 9.3, 42], [p[0]![0] + 9.3, 58]], -30)), tone: "field", stroke: 1.4 },
      { d: line(rotate([[p[0]![0] + 18.6, 42], [p[0]![0] + 18.6, 58]], -30)), tone: "field", stroke: 1.4 },
      { d: line(rotate([[p[0]![0], 50], [p[1]![0], 50]], -30)), tone: "field", stroke: 1.4 },
    ]),
    { d: line(rotate([[36, 50], [64, 50]], -30)), stroke: 3 },
    { d: poly(rotate([[41, 38], [59, 38], [59, 62], [41, 62]], -30)) },
    { d: "M60,70 C66,76 76,76 80,70 L70,64 Z" },
    { d: line([[56, 60], [70, 70]]), stroke: 2.4 },
    { d: "M84,80 C88,84 88,88 86,92 M78,84 C81,86 81,88 80,90", stroke: 2 },
  ],
};

export const ROCKET: DeviceDrawing = {
  parts: [
    { d: "M50,4 C62,16 64,32 63,48 L63,70 L37,70 L37,48 C36,32 38,16 50,4 Z" },
    { d: circle(50, 34, 6), tone: "field" },
    { d: poly([[37, 50], [24, 66], [24, 78], [37, 70]]) },
    { d: poly([[63, 50], [76, 66], [76, 78], [63, 70]]) },
    { d: rect(46.5, 54, 7, 22) },
    { d: "M40,72 L60,72 C60,82 55,88 50,96 C45,88 40,82 40,72 Z" },
    { d: "M45,74 L55,74 C55,80 53,84 50,88 C47,84 45,80 45,74 Z", tone: "field" },
  ],
};

export const TOWER: DeviceDrawing = {
  parts: [
    { d: poly([[48, 30], [52, 30], [66, 92], [60, 92], [50, 46], [40, 92], [34, 92]]) },
    { d: line([[44, 56], [56, 56]]), stroke: 2.6 },
    { d: line([[41, 72], [59, 72]]), stroke: 2.6 },
    { d: line([[43, 58], [58, 74], [38, 90]]), stroke: 1.8 },
    { d: line([[57, 58], [42, 74], [62, 90]]), stroke: 1.8 },
    { d: circle(50, 24, 6) },
    ...[12, 22].flatMap((r) => [
      { d: `M${50 - r},${24 - r * 0.9} C${50 - r * 1.4},${24 - r * 0.3} ${50 - r * 1.4},${24 + r * 0.3} ${50 - r},${24 + r * 0.9}`, stroke: 3.2 },
      { d: `M${50 + r},${24 - r * 0.9} C${50 + r * 1.4},${24 - r * 0.3} ${50 + r * 1.4},${24 + r * 0.3} ${50 + r},${24 + r * 0.9}`, stroke: 3.2 },
    ]),
  ],
};

export const MICROPHONE: DeviceDrawing = {
  parts: [
    { d: "M36,26 C36,12 64,12 64,26 L64,48 C64,62 36,62 36,48 Z" },
    ...[24, 32, 40, 48].map((y) => ({ d: line([[38, y], [62, y]]), tone: "field" as const, stroke: 1.6 })),
    { d: "M28,44 C28,74 72,74 72,44", stroke: 4 },
    { d: rect(47.5, 66, 5, 18) },
    { d: rect(32, 84, 36, 6) },
  ],
};

export const DROP: DeviceDrawing = {
  parts: [
    { d: "M50,4 C60,22 78,42 78,62 C78,80 64,92 50,92 C36,92 22,80 22,62 C22,42 40,22 50,4 Z" },
    { d: "M36,60 C36,72 42,80 50,82", tone: "field", stroke: 3.4 },
  ],
};

export const BAR_CHART: DeviceDrawing = {
  parts: [
    { d: rect(14, 60, 14, 26) },
    { d: rect(34, 46, 14, 40) },
    { d: rect(54, 52, 14, 34) },
    { d: rect(74, 30, 14, 56) },
    { d: line([[14, 44], [40, 28], [60, 36], [86, 12]]), stroke: 3.2 },
    { d: poly([[78, 10], [90, 8], [88, 20]]) },
    { d: rect(8, 88, 84, 3) },
  ],
};
