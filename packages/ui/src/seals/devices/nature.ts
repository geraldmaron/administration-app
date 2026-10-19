import type { DeviceDrawing, DevicePart } from "../types";
import { arcPoints, circle, leaf, line, mirror, poly, type Point } from "./draw";

/* The bison in profile, facing the viewer's left: the hump high over the shoulders, head carried low. */
const BISON_BODY =
  "M8,63 C7,57 8,49 12,44 C15,35 21,24 31,17 C37,13 45,12 51,16 C59,21 71,27 82,30 C87,32 90,36 90,42 C91,48 89,54 87,58 L88,82 L82.5,82 L81,64 C78,65 75,65 73,63 L72,82 L66.5,82 L66,62 C58,63 50,64 44,66 L43,82 L37.5,82 L36,72 C34,73 32,73 30,72 L29.5,82 L24,82 L24,73 C22,77 19,79 16.5,78 C15,75 14,72 13,70 C10.5,69 8.5,67 8,63 Z";

export const BISON: DeviceDrawing = {
  parts: [
    { d: BISON_BODY },
    { d: "M16,40 C10,38 8,31 12,26 C12.5,31 15,34 20,36 Z" },
    { d: "M89,44 C93,48 95,55 94,62", stroke: 2 },
    { d: circle(94, 64, 2.6) },
    { d: circle(14, 50, 1.6), tone: "field" },
    { d: "M38,15 C44,28 45,46 41,66", tone: "field", stroke: 1.4 },
    { d: poly([[4, 85], [96, 85], [96, 89], [4, 89]]) },
  ],
};

export const MOUNTAIN: DeviceDrawing = {
  parts: [
    { d: circle(28, 26, 10) },
    { d: poly([[4, 84], [34, 36], [46, 52], [64, 24], [96, 84]]) },
    { d: poly([[64, 24], [71.5, 38], [67, 35], [63, 40], [59, 35], [56.5, 37.5]]), tone: "field" },
    { d: poly([[34, 36], [39.5, 45], [36, 43], [32, 47], [29, 44]]), tone: "field" },
    { d: line([[8, 90], [92, 90]]), stroke: 3 },
  ],
};

function stalk(base: Point, degrees: number, length: number): readonly DevicePart[] {
  const rad = (degrees * Math.PI) / 180;
  const at = (t: number): Point => [base[0] + Math.sin(rad) * length * t, base[1] - Math.cos(rad) * length * t];
  const grains = [0.56, 0.66, 0.76, 0.86].flatMap((t) => {
    const [x, y] = at(t);
    return [{ d: leaf(x, y, 11, 5.5, degrees - 32) }, { d: leaf(x, y, 11, 5.5, degrees + 32) }];
  });
  const tip = at(0.92);
  return [{ d: line([base, at(0.9)]), stroke: 2.4 }, ...grains, { d: leaf(tip[0], tip[1], 10, 5, degrees) }];
}

/* A sheaf: three stalks crossing at the binding, ears fanned above it. */
export const WHEAT: DeviceDrawing = {
  parts: [
    ...stalk([62, 96], -24, 88),
    ...stalk([38, 96], 24, 88),
    ...stalk([50, 96], 0, 90),
    { d: poly([[41, 68], [59, 68], [58, 75], [42, 75]]) },
  ],
};

function branch(points: readonly Point[], side: 1 | -1): readonly DevicePart[] {
  return points.slice(1).flatMap(([x, y], i) => {
    const [px, py] = points[i]!;
    const heading = (Math.atan2(x - px, py - y) * 180) / Math.PI;
    return [{ d: leaf(x, y, 12, 5.5, heading - 50 * side) }, { d: leaf(x, y, 12, 5.5, heading + 45 * side) }];
  });
}

const OLIVE_STEM: readonly Point[] = [[22, 86], [30, 74], [38, 62], [47, 51], [57, 41], [67, 31], [77, 21]];

export const OLIVE_BRANCH: DeviceDrawing = {
  parts: [
    { d: line(OLIVE_STEM), stroke: 2.6 },
    ...branch(OLIVE_STEM, 1),
    { d: leaf(77, 21, 13, 6, 40) },
    { d: circle(44, 44, 3.4) },
    { d: circle(62, 46, 3.4) },
    { d: circle(30, 64, 3.4) },
  ],
};

export const LEAF: DeviceDrawing = {
  parts: [
    { d: "M50,6 C74,22 80,48 70,68 C64,80 56,84 50,86 C44,84 36,80 30,68 C20,48 26,22 50,6 Z" },
    { d: line([[50, 14], [50, 94]]), tone: "field", stroke: 2.4 },
    { d: line([[50, 86], [50, 96]]), stroke: 3 },
    ...[30, 44, 58, 72].flatMap((y) => [
      { d: line([[50, y + 8], [36, y - 2]]), tone: "field" as const, stroke: 1.6 },
      { d: line([[50, y + 8], [64, y - 2]]), tone: "field" as const, stroke: 1.6 },
    ]),
  ],
};

/** Laurel along two arcs meeting at the foot: the device alone, or behind another as a wreath. */
export function laurel(cx: number, cy: number, r: number, size: number): readonly DevicePart[] {
  const left = arcPoints(cx, cy, r, 196, 330, 9);
  const right = mirror(left, cx);
  const sprig = (pts: readonly Point[], side: 1 | -1) =>
    pts.flatMap((p, i) => {
      const along = 196 + (134 * i) / (pts.length - 1);
      const heading = side === 1 ? along + 90 : -along - 90;
      return [{ d: leaf(p[0], p[1], size, size * 0.45, heading - 30 * side) }, { d: leaf(p[0], p[1], size, size * 0.45, heading + 25 * side) }];
    });
  return [
    { d: line(left), stroke: size * 0.18 },
    { d: line(right), stroke: size * 0.18 },
    ...sprig(left, 1),
    ...sprig(right, -1),
  ];
}

export const WREATH: DeviceDrawing = { parts: laurel(50, 50, 38, 12) };

export const WAVE: DeviceDrawing = {
  parts: [
    { d: "M6,40 C18,28 30,28 38,38 C42,44 50,46 54,40 C46,40 44,32 52,26 C62,20 78,24 94,40 L94,52 C80,40 70,40 62,48 C52,58 36,58 26,48 C20,42 12,42 6,50 Z" },
    { d: "M6,64 C16,56 26,56 36,64 C46,72 56,72 66,64 C76,56 86,56 94,64 L94,72 C86,64 76,64 66,72 C56,80 46,80 36,72 C26,64 16,64 6,72 Z" },
    { d: "M6,82 C16,74 26,74 36,82 C46,90 56,90 66,82 C76,74 86,74 94,82 L94,90 C86,82 76,82 66,90 C56,98 46,98 36,90 C26,82 16,82 6,90 Z" },
  ],
};

export const SEABIRD: DeviceDrawing = {
  parts: [
    { d: "M50,46 C42,30 28,22 6,24 C24,28 34,36 42,50 C45,54 48,56 50,56 C52,56 55,54 58,50 C66,36 76,28 94,24 C72,22 58,30 50,46 Z" },
    { d: "M6,72 C16,64 26,64 36,72 C46,80 56,80 66,72 C76,64 86,64 94,72 L94,80 C86,72 76,72 66,80 C56,88 46,88 36,80 C26,72 16,72 6,80 Z" },
    { d: circle(76, 18, 8) },
  ],
};
