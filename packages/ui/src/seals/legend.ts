import { polar } from "./devices/draw";

/*
 * The legend around a seal, set one glyph at a time on the circle. Each
 * glyph is placed and turned by hand rather than along an SVG textPath,
 * which react-native-svg does not render the same way on every platform.
 */

export type PlacedGlyph = { readonly char: string; readonly x: number; readonly y: number; readonly rotate: number };

/* Advance widths of a bold serif's capitals, in ems; close enough to space a legend evenly. */
const NARROW = new Set(["I", "J", "1", ".", ",", "'", ":", ";", "!"]);
const WIDE = new Set(["M", "W"]);

function advance(char: string): number {
  if (char === " ") return 0.32;
  if (char === "·") return 0.36;
  if (char === "-") return 0.4;
  if (NARROW.has(char)) return 0.38;
  if (WIDE.has(char)) return 0.98;
  if (/[0-9]/.test(char)) return 0.6;
  return 0.75;
}

const TRACKING = 0.06;

export function textWidth(text: string, size: number): number {
  return [...text].reduce((sum, char) => sum + (advance(char) + TRACKING) * size, -TRACKING * size);
}

/** The largest size at or below `size` that fits `text` within `maxDegrees` of arc at radius `r`. */
export function fitSize(text: string, size: number, r: number, maxDegrees: number, floor: number): number {
  const room = (r * Math.PI * maxDegrees) / 180;
  const width = textWidth(text, 1);
  return Math.max(floor, Math.min(size, room / width));
}

/**
 * Glyphs centered on twelve o'clock (`side` "top", reading clockwise, tops
 * outward) or six o'clock ("bottom", reading left to right, tops inward).
 */
export function arcGlyphs(text: string, size: number, r: number, side: "top" | "bottom"): readonly PlacedGlyph[] {
  const total = textWidth(text, size);
  const span = (total / r) * (180 / Math.PI);
  let along = 0;
  return [...text].flatMap((char) => {
    const w = advance(char) * size;
    const middle = ((along + w / 2) / r) * (180 / Math.PI);
    along += w + TRACKING * size;
    if (char === " ") return [];
    const degrees = side === "top" ? -span / 2 + middle : 180 + span / 2 - middle;
    const [x, y] = polar(100, 100, r, degrees);
    return [{ char, x, y, rotate: side === "top" ? degrees : degrees - 180 }];
  });
}
