import type { DeviceDrawing, DevicePart } from "../types";
import { circle, line, mirror, poly, rect, rotate, type Point } from "./draw";

const PAN: readonly Point[] = [[8, 60], [32, 60], [29, 66], [20, 69], [11, 66]];

function pan(points: readonly Point[], hang: Point): readonly DevicePart[] {
  const [left, right] = [points[0]!, points[1]!];
  return [{ d: line([left, hang, right]), stroke: 1.6 }, { d: poly(points) }];
}

export const SCALES: DeviceDrawing = {
  parts: [
    { d: circle(50, 13, 4.5) },
    { d: poly([[47.5, 17], [52.5, 17], [53.5, 84], [46.5, 84]]) },
    { d: poly([[18, 26], [50, 22.5], [82, 26], [82, 30], [50, 27], [18, 30]]) },
    { d: circle(18, 28, 3) },
    { d: circle(82, 28, 3) },
    ...pan(PAN, [20, 30]),
    ...pan(mirror(PAN), [80, 30]),
    { d: poly([[36, 84], [64, 84], [70, 92], [30, 92]]) },
  ],
  charge: { x: 50, y: 52, size: 24 },
};

const GAVEL_HEAD: readonly Point[] = [[30, 22], [62, 22], [62, 42], [30, 42]];
const GAVEL_HANDLE: readonly Point[] = [[43, 42], [49, 42], [49, 80], [43, 80]];

export const GAVEL: DeviceDrawing = {
  parts: [
    { d: poly(rotate([...GAVEL_HEAD], -40, 46, 40)) },
    { d: poly(rotate([[26, 24], [30, 22], [30, 42], [26, 40]], -40, 46, 40)) },
    { d: poly(rotate([[62, 22], [66, 24], [66, 40], [62, 42]], -40, 46, 40)) },
    { d: poly(rotate([[37, 22], [39, 22], [39, 42], [37, 42]], -40, 46, 40)), tone: "field" },
    { d: poly(rotate([[53, 22], [55, 22], [55, 42], [53, 42]], -40, 46, 40)), tone: "field" },
    { d: poly(rotate([...GAVEL_HANDLE], -40, 46, 40)) },
    { d: poly([[20, 80], [80, 80], [84, 88], [16, 88]]) },
    { d: rect(24, 74, 52, 6) },
  ],
};

const COLUMN_XS = [16, 29, 42, 55, 68, 81];

export const TEMPLE: DeviceDrawing = {
  parts: [
    { d: poly([[8, 30], [50, 9], [92, 30]]) },
    { d: poly([[20, 27], [50, 15], [80, 27]]), tone: "field" },
    { d: circle(50, 22.5, 2.5) },
    { d: rect(10, 31, 80, 7) },
    ...COLUMN_XS.map((x) => ({ d: rect(x - 1, 41, 5, 33) })),
    ...COLUMN_XS.map((x) => ({ d: rect(x - 2.5, 39, 8, 3) })),
    { d: rect(8, 76, 84, 5) },
    { d: rect(4, 83, 92, 6) },
  ],
};

export const COLUMN: DeviceDrawing = {
  parts: [
    { d: rect(28, 12, 44, 7) },
    { d: poly([[32, 19], [68, 19], [63, 25], [37, 25]]) },
    { d: poly([[37, 27], [63, 27], [61, 78], [39, 78]]) },
    ...[43, 50, 57].map((x) => ({ d: line([[x, 30], [x, 75]]), tone: "field" as const, stroke: 1.8 })),
    { d: rect(32, 80, 36, 5) },
    { d: rect(24, 86, 52, 6) },
  ],
};

export const CAPITOL_DOME: DeviceDrawing = {
  parts: [
    { d: poly([[47.5, 4], [52.5, 4], [53.5, 12], [46.5, 12]]) },
    { d: rect(45, 12, 10, 10) },
    { d: "M42,23 C42,17 58,17 58,23 Z" },
    { d: "M28,46 C28,26 72,26 72,46 Z" },
    ...[36, 43, 50, 57, 64].map((x) => ({ d: line([[x, 33], [x, 45]]), tone: "field" as const, stroke: 1.4 })),
    { d: rect(25, 47, 50, 5) },
    { d: rect(28, 53, 44, 14) },
    ...[32, 38, 44, 50, 56, 62, 68].map((x) => ({ d: line([[x, 54], [x, 66]]), tone: "field" as const, stroke: 2 })),
    { d: rect(22, 68, 56, 5) },
    { d: rect(6, 74, 88, 12) },
    ...[12, 20, 28, 36, 64, 72, 80, 88].map((x) => ({ d: line([[x, 76], [x, 84]]), tone: "field" as const, stroke: 1.8 })),
    { d: poly([[38, 74], [50, 66], [62, 74]]) },
    { d: rect(3, 88, 94, 5) },
  ],
};

export const HOUSE: DeviceDrawing = {
  parts: [
    { d: poly([[6, 50], [50, 12], [94, 50], [86, 50], [50, 21], [14, 50]]) },
    { d: rect(66, 18, 9, 18) },
    { d: poly([[20, 49], [50, 25], [80, 49], [80, 88], [20, 88]]) },
    { d: rect(43, 62, 14, 26), tone: "field" },
    { d: rect(27, 56, 11, 11), tone: "field" },
    { d: rect(62, 56, 11, 11), tone: "field" },
    { d: circle(50, 42, 4), tone: "field" },
  ],
};

const PAGE: readonly Point[] = [[50, 28], [44, 24], [32, 21], [18, 22], [8, 26], [8, 78], [18, 74], [32, 73], [44, 76], [50, 80]];

export const OPEN_BOOK: DeviceDrawing = {
  parts: [
    { d: poly(PAGE) },
    { d: poly(mirror(PAGE)) },
    { d: line([[50, 28], [50, 80]]), tone: "field", stroke: 2 },
    ...[34, 42, 50, 58].flatMap((y) => [
      { d: line([[15, y], [43, y + 2]]), tone: "field" as const, stroke: 1.5 },
      { d: line([[57, y + 2], [85, y]]), tone: "field" as const, stroke: 1.5 },
    ]),
    { d: poly([[6, 80], [18, 77], [32, 76], [44, 79], [50, 84], [56, 79], [68, 76], [82, 77], [94, 80], [94, 84], [50, 88], [6, 84]]) },
  ],
};

export const QUILL: DeviceDrawing = {
  parts: [
    { d: "M86,6 C68,10 50,24 40,42 C34,53 30,63 28,73 L33,74.5 C38,62 48,51 60,43 C74,33 84,22 86,6 Z" },
    { d: "M84,9 C66,24 48,46 31,73", tone: "field", stroke: 1.4 },
    ...[[52, 33, 60, 36], [46, 41, 55, 44], [41, 50, 49, 52], [65, 22, 73, 26]].map(([a, b, c, d]) => ({
      d: line([[a!, b!], [c!, d!]]),
      tone: "field" as const,
      stroke: 1.2,
    })),
    { d: poly([[28, 73], [33, 74.5], [26, 90]]) },
    { d: rect(16, 90, 40, 3) },
  ],
};

export const LAMP: DeviceDrawing = {
  parts: [
    { d: "M84,24 C79,30 78,36 84,40 C90,36 89,30 84,24 Z" },
    { d: "M14,62 C14,52 34,47 52,50 L80,44 C86,43 87,49 83,51 L64,62 C58,70 26,72 14,62 Z" },
    { d: "M14,58 C6,54 4,64 12,66", stroke: 3 },
    { d: rect(28, 46, 12, 4) },
    { d: poly([[28, 70], [44, 70], [48, 78], [24, 78]]) },
    { d: circle(34, 58, 3.5), tone: "field" },
  ],
};

export const TORCH: DeviceDrawing = {
  parts: [
    { d: "M50,4 C60,16 68,26 63,38 C61,43 56,46 50,46 C44,46 39,43 37,38 C33,29 40,22 45,15 C45,24 48,27 50,28 C53,21 49,13 50,4 Z" },
    { d: "M50,22 C55,30 57,35 54,40 C52,42 48,42 46,40 C44,36 47,31 50,22 Z", tone: "field" },
    { d: poly([[36, 46], [64, 46], [58, 58], [42, 58]]) },
    { d: line([[39, 51], [61, 51]]), tone: "field", stroke: 1.4 },
    { d: poly([[44, 59], [56, 59], [53, 92], [47, 92]]) },
    { d: line([[45, 70], [55, 70]]), tone: "field", stroke: 1.4 },
  ],
};

export const KEY: DeviceDrawing = {
  parts: [
    { d: `${circle(50, 22, 15)} ${circle(50, 22, 7)}`, evenOdd: true },
    { d: rect(45.5, 36, 9, 52) },
    { d: rect(40, 38, 20, 4) },
    { d: rect(54, 68, 14, 7) },
    { d: rect(54, 79, 18, 9) },
    { d: rect(62, 79, 3, 5), tone: "field" },
  ],
};
