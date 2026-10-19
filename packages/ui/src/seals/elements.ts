import { DEVICES } from "./devices";
import { circle, polar, star } from "./devices/draw";
import { textWidth } from "./legend";
import type { DeviceDrawing } from "./types";

/**
 * A seal as drawing primitives on a 200×200 grid, with colors still named by
 * key. The `Seal` component maps these onto react-native-svg; anything else
 * (a contact sheet, a test) can read the same composition.
 */
export type SealElement =
  | { readonly kind: "path"; readonly d: string; readonly fill?: string; readonly stroke?: string; readonly width?: number; readonly evenOdd?: boolean; readonly opacity?: number }
  | { readonly kind: "group"; readonly transform: string; readonly children: readonly SealElement[] }
  | {
      readonly kind: "text";
      readonly text: string;
      readonly x: number;
      readonly y: number;
      readonly size: number;
      readonly color: string;
      readonly rotate: number;
      readonly face: "serif" | "sans";
    };

export type Tones = { readonly ink: string; readonly field: string; readonly rim: string };

export const LIGHT = new Set(["white", "cream", "silver", "sky", "gold", "orange"]);

/** Details drawn in the rim metal would vanish on a device of the same metal; they take a color that stands off the field instead. */
export function accentTone(rim: string, ink: string, field: string): string {
  if (rim !== ink) return rim;
  if (!LIGHT.has(field)) return ink === "cream" || ink === "white" ? "gold" : "cream";
  return ink === "gold" ? "navy" : "gold";
}

function partsOf(drawing: DeviceDrawing, tones: Tones): readonly SealElement[] {
  return drawing.parts.map((part) => {
    const color = tones[part.tone ?? "ink"];
    return part.stroke !== undefined
      ? { kind: "path" as const, d: part.d, stroke: color, width: part.stroke }
      : { kind: "path" as const, d: part.d, fill: color, ...(part.evenOdd ? { evenOdd: true } : {}) };
  });
}

/** A device from the set, `size` grid units square, centered on (x, y). */
export function placeDevice(device: string, tones: Tones, x: number, y: number, size: number): SealElement {
  const drawing = DEVICES[device] ?? { parts: [] };
  const scale = size / 100;
  return { kind: "group", transform: `translate(${x - size / 2} ${y - size / 2}) scale(${scale})`, children: partsOf(drawing, tones) };
}

/** A small heater shield on a device's charge point, bearing a second device. */
export function placeCharge(device: string, charge: { readonly device: string; readonly color: string; readonly field?: string }, tones: Tones): readonly SealElement[] {
  const anchor = DEVICES[device]?.charge;
  if (!anchor) return [];
  const { x, y, size: s } = anchor;
  const field = charge.field ?? tones.field;
  const top = y - s * 0.55;
  const d = `M${x - s / 2},${top} L${x + s / 2},${top} L${x + s / 2},${y + s * 0.1} C${x + s / 2},${y + s * 0.4} ${x + s * 0.2},${y + s * 0.55} ${x},${y + s * 0.68} C${x - s * 0.2},${y + s * 0.55} ${x - s / 2},${y + s * 0.4} ${x - s / 2},${y + s * 0.1} Z`;
  const inner: Tones = { ink: charge.color, field, rim: accentTone(tones.rim, charge.color, field) };
  return [
    { kind: "path", d, fill: field, stroke: tones.rim, width: s * 0.06 },
    placeDevice(charge.device, inner, x, y + s * 0.02, s * 0.78),
  ];
}

export function monogramText(letters: string, color: string, x: number, y: number, box: number): SealElement {
  const size = Math.min(box * 0.5, (box * 0.86) / textWidth(letters, 1));
  return { kind: "text", text: letters, x, y: y + size * 0.36, size, color, rotate: 0, face: "sans" };
}

/** Stars over the device: an arc of a few, a full ring of many. */
export function starsAround(count: number, color: string, cx: number, cy: number, r: number, ring: boolean): readonly SealElement[] {
  if (count <= 0) return [];
  const size = ring ? Math.min(7, ((Math.PI * 2 * r) / count) * 0.42) : 6.5;
  const angles = ring
    ? Array.from({ length: count }, (_, i) => (360 * i) / count)
    : count === 1
      ? [0]
      : Array.from({ length: count }, (_, i) => -66 + (132 * i) / (count - 1));
  return [{ kind: "path", fill: color, d: angles.map((a) => { const [x, y] = polar(cx, cy, r, a); return star(x, y, size, 5, 0.42); }).join(" ") }];
}

export function raysBehind(color: string, cx: number, cy: number, r: number): SealElement {
  const d = Array.from({ length: 36 }, (_, i) => {
    const a = i * 10;
    const [x1, y1] = polar(cx, cy, r, a - 2.2);
    const [x2, y2] = polar(cx, cy, r, a + 2.2);
    return `M${cx},${cy} L${x1.toFixed(2)},${y1.toFixed(2)} L${x2.toFixed(2)},${y2.toFixed(2)} Z`;
  }).join(" ");
  return { kind: "path", d, fill: color, opacity: 0.24 };
}

export function ribbon(motto: string, field: string, rim: string, cx: number, y: number, width: number): readonly SealElement[] {
  const h = 15;
  const [l, r] = [cx - width / 2, cx + width / 2];
  const tails = `M${l - 8},${y - 1} L${l + 6},${y - 1} L${l + 6},${y + h + 3} L${l - 8},${y + h + 3} L${l - 3},${y + h / 2 + 1} Z M${r + 8},${y - 1} L${r - 6},${y - 1} L${r - 6},${y + h + 3} L${r + 8},${y + h + 3} L${r + 3},${y + h / 2 + 1} Z`;
  const band = `M${l},${y - 4} Q${cx},${y + 4} ${r},${y - 4} L${r},${y + h - 4} Q${cx},${y + h + 4} ${l},${y + h - 4} Z`;
  const size = Math.min(10, (width * 0.9) / textWidth(motto, 1));
  return [
    { kind: "path", d: tails, fill: rim, opacity: 0.85 },
    { kind: "path", d: band, fill: rim },
    { kind: "text", text: motto, x: cx, y: y + h / 2 + size * 0.34, size, color: field, rotate: 0, face: "serif" },
  ];
}

export function ringLine(r: number, color: string, width: number): SealElement {
  return { kind: "path", d: circle(100, 100, r), stroke: color, width };
}
