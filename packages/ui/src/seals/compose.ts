import { laurel } from "./devices";
import { star } from "./devices/draw";
import {
  LIGHT,
  accentTone,
  monogramText,
  placeCharge,
  placeDevice,
  raysBehind,
  ribbon,
  ringLine,
  starsAround,
  type SealElement,
  type Tones,
} from "./elements";
import { arcGlyphs, fitSize, textWidth } from "./legend";
import { centerOf, outline } from "./shapes";
import type { SealSpec } from "./types";

export type { SealElement } from "./elements";

/** Below this many pixels a seal drops its legend and ornaments and shows the device alone. */
export const COMPACT_BELOW = 56;

type Center = { readonly x: number; readonly y: number; readonly r: number };

const RING_FACE = 13.5;

function legend(spec: SealSpec): readonly SealElement[] {
  if (!spec.ring) return [];
  const [top = "", ...rest] = spec.ring.text.split(" · ");
  const bottom = rest.join(" · ");
  const size = Math.min(fitSize(top, RING_FACE, 73, bottom ? 156 : 290, 7.5), bottom ? fitSize(bottom, RING_FACE, 85, 124, 7.5) : RING_FACE);
  const glyphs = [...arcGlyphs(top, size, 73, "top"), ...(bottom ? arcGlyphs(bottom, size, 85, "bottom") : [])];
  const color = spec.ring.color;
  // A legend long enough to reach the side marks takes their place rather than running into them.
  const topSpan = (textWidth(top, size) / 73) * (180 / Math.PI);
  const marks = !bottom ? [star(100, 179, 5, 5, 0.42)] : topSpan <= 160 ? [star(22, 100, 4.6, 5, 0.42, -90), star(178, 100, 4.6, 5, 0.42, 90)] : [];
  return [
    ringLine(90.5, spec.rim, 1.6),
    ringLine(65.5, spec.rim, 2.2),
    ...(marks.length ? [{ kind: "path" as const, d: marks.join(" "), fill: color }] : []),
    ...glyphs.map((g) => ({ kind: "text" as const, text: g.char, x: g.x, y: g.y, size, color, rotate: g.rotate, face: "serif" as const })),
  ];
}

function shieldChief(spec: SealSpec): readonly SealElement[] {
  if (!spec.ring) return [];
  const [top = ""] = spec.ring.text.split(" · ");
  const size = Math.min(15, 146 / textWidth(top, 1));
  // The chief is lettered in the field's color, unless both are light and the letters would vanish.
  const ink = !LIGHT.has(spec.field) || !LIGHT.has(spec.rim) ? spec.field : "navy";
  return [
    { kind: "path", d: "M20,14 L180,14 L180,46 L20,46 Z", fill: spec.rim },
    { kind: "text", text: top, x: 100, y: 30 + size * 0.36, size, color: ink, rotate: 0, face: "serif" },
  ];
}

function centerFor(spec: SealSpec, compact: boolean): Center {
  const base = centerOf(spec.shape);
  if (compact) return base;
  if (spec.shape === "shield") return spec.ring ? { x: 100, y: 108, r: 62 } : base;
  if (spec.shape === "star") return base;
  return spec.ring ? { x: 100, y: 100, r: 63 } : base;
}

function wreathAround(c: Center, color: string): readonly SealElement[] {
  return laurel(c.x, c.y + c.r * 0.04, c.r * 0.84, c.r * 0.17).map((p): SealElement =>
    p.stroke !== undefined ? { kind: "path", d: p.d, stroke: color, width: p.stroke } : { kind: "path", d: p.d, fill: color },
  );
}

function ornaments(spec: SealSpec, c: Center, tones: Tones): { readonly under: readonly SealElement[]; readonly over: readonly SealElement[]; readonly device: Center } {
  const a = spec.accents ?? {};
  const stars = a.stars ?? 0;
  const ringOfStars = stars > 13 || (spec.device === "monogram" && stars > 1);
  const metal = spec.rim !== spec.field ? spec.rim : tones.rim;
  const under = [
    ...(a.rays ? [raysBehind(metal, c.x, c.y, c.r * 0.96)] : []),
    ...(a.wreath ? wreathAround(c, metal) : []),
  ];
  const over = [
    ...starsAround(stars, metal, c.x, c.y, ringOfStars ? c.r * 0.86 : c.r * 0.8, ringOfStars),
    ...(a.motto ? ribbon(a.motto, spec.field, metal, c.x, c.y + c.r * 0.6, c.r * 1.3) : []),
  ];
  const shrink = (a.wreath || ringOfStars ? 0.78 : 1) * (stars > 0 && !ringOfStars ? 0.86 : 1) * (a.motto ? 0.84 : 1);
  const dy = (stars > 0 && !ringOfStars ? c.r * 0.1 : 0) - (a.motto ? c.r * 0.16 : 0);
  return { under, over, device: { x: c.x, y: c.y + dy, r: c.r * shrink } };
}

function deviceLayer(spec: SealSpec, at: Center, tones: Tones, compact: boolean): readonly SealElement[] {
  const size = at.r * (compact ? 1.62 : 1.5);
  if (spec.device === "monogram") return [monogramText(spec.monogram ?? spec.id.slice(0, 3).toUpperCase(), tones.ink, at.x, at.y, size)];
  const placed = placeDevice(spec.device, tones, at.x, at.y, size);
  if (!spec.charge || placed.kind !== "group") return [placed];
  return [{ ...placed, children: [...placed.children, ...placeCharge(spec.device, spec.charge, tones)] }];
}

/** Every primitive of one seal, back to front. */
export function composeSeal(spec: SealSpec, pixels: number): readonly SealElement[] {
  const compact = pixels < COMPACT_BELOW;
  const tones: Tones = { ink: spec.deviceColor, field: spec.field, rim: accentTone(spec.rim, spec.deviceColor, spec.field) };
  const round = spec.shape === "roundel" || spec.shape === "octagon" || spec.shape === "rosette";
  const frame: readonly SealElement[] = [
    { kind: "path", d: outline(spec.shape, 0), fill: spec.rim },
    { kind: "path", d: outline(spec.shape, compact ? 9 : 5), fill: spec.field },
    ...(!compact && round && !spec.ring ? [ringLine(88, spec.rim, 1.4)] : []),
  ];
  const c = centerFor(spec, compact);
  if (compact) return [...frame, ...deviceLayer(spec, c, tones, true)];
  const text = round ? legend(spec) : spec.shape === "shield" ? shieldChief(spec) : [];
  const deco = ornaments(spec, c, tones);
  return [...frame, ...text, ...deco.under, ...deviceLayer(spec, deco.device, tones, false), ...deco.over];
}
