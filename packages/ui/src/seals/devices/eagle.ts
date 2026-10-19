import type { DeviceDrawing, DevicePart } from "../types";
import { line, mirror, poly, circle, type Point } from "./draw";

/*
 * The American eagle displayed: wings raised and spread, head turned to the
 * viewer's left, tail fanned. One wing is plotted and mirrored so the bird is
 * exactly balanced; the head breaks the symmetry the way the heraldic eagle does.
 */

const WING: readonly Point[] = [
  [54, 40], [56, 31], [61, 23], [69, 15], [80, 9], [93, 5],
  [89, 13], [97, 15], [90, 22], [98, 26], [89, 32], [96, 38], [85, 42], [90, 50],
  [78, 50], [80, 58], [68, 56], [66, 64], [56, 58],
];

const FEATHER_SPLITS: readonly (readonly [Point, Point])[] = [
  [[72, 24], [89, 13]],
  [[72, 29], [90, 22]],
  [[71, 34], [89, 32]],
  [[69, 39], [85, 42]],
  [[66, 44], [78, 50]],
  [[62, 49], [68, 56]],
];

const TALON: readonly (readonly Point[])[] = [
  [[45, 66], [40, 72]],
  [[40, 72], [35, 72.5]],
  [[40, 72], [37, 76.5]],
  [[40, 72], [41, 77]],
];

function wingParts(points: readonly Point[], splits: readonly (readonly [Point, Point])[]): readonly DevicePart[] {
  return [{ d: poly(points) }, ...splits.map(([a, b]) => ({ d: line([a, b]), tone: "field" as const, stroke: 1.5 }))];
}

const BODY = "M43.5,38 C40,47 40,62 44,72 L56,72 C60,62 60,47 56.5,38 Z";
/* Head and hooked beak as one profile: flat crown, overhanging brow, the hook turning down. */
const HEAD =
  "M56,40 L56,25 C56.5,17.5 53.5,12 48.5,11.5 C45,11.5 42.5,13 41,15.5 L36,16.2 C31.5,16.8 28.5,19.8 28.5,24 C28.5,26.6 29.5,28.6 31,30 C31.6,27.2 33.2,25.4 36,25 L41.5,25 C42.5,30 43.5,35 44,40 Z";
const TAIL = poly([[44, 70], [36, 90], [40.5, 88], [43, 94], [47, 89.5], [50, 95], [53, 89.5], [57, 94], [59.5, 88], [64, 90], [56, 70]]);

const LEGS: readonly DevicePart[] = [...TALON, ...TALON.map((p) => mirror(p))].map((points, i) => ({
  d: line(points),
  stroke: i % 4 === 0 ? 4 : 2.4,
}));

const EAGLE_PARTS: readonly DevicePart[] = [
  ...wingParts(WING, FEATHER_SPLITS),
  ...wingParts(mirror(WING), FEATHER_SPLITS.map(([a, b]) => [mirror([a])[0]!, mirror([b])[0]!] as const)),
  ...LEGS,
  { d: TAIL },
  { d: line([[50, 76], [50, 92]]), tone: "field", stroke: 1.2 },
  { d: HEAD, tone: "field", stroke: 3 },
  { d: HEAD },
  { d: BODY },
  { d: line([[35, 21.2], [41.5, 22]]), tone: "field", stroke: 1.1 },
  { d: "M42.5,17 C44.5,16 47.5,16 49.5,17.5", tone: "field", stroke: 1.1 },
  { d: circle(46, 19.6, 1.5), tone: "field" },
  { d: "M43,34 C46,37 52,37.5 56,36", tone: "field", stroke: 1.1 },
];

export const EAGLE_DISPLAYED: DeviceDrawing = {
  parts: EAGLE_PARTS,
  charge: { x: 50, y: 54, size: 24 },
};

const BREAST_SHIELD: readonly Point[] = [[40, 42], [60, 42], [60, 58], [58, 64], [54, 68], [50, 70], [46, 68], [42, 64], [40, 58]];
const PALES: readonly DevicePart[] = [42.5, 47.5, 52.5, 57.5].map((x) => ({ d: line([[x, 50], [x, 68]]), tone: "field" as const, stroke: 2.2 }));

export const EAGLE_SHIELD: DeviceDrawing = {
  parts: [
    ...EAGLE_PARTS,
    { d: poly(BREAST_SHIELD), tone: "field" },
    { d: poly(BREAST_SHIELD.map(([x, y]) => [50 + (x - 50) * 0.84, 44 + (y - 42) * 0.88] as const)) },
    ...PALES,
    { d: poly([[41.6, 43.8], [58.4, 43.8], [58.4, 50], [41.6, 50]]), tone: "rim" },
  ],
  charge: { x: 50, y: 56, size: 22 },
};
