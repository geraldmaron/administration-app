import type { Affine, Viewport } from "./camera";
import type { Region } from "./data";
import { assignDither } from "./dither";
import { DotKind, type Dots } from "./lattice";
import type { LensLevel } from "./levels";
import type { Octave } from "./pitch";

/**
 * What a lens says about one region. Colors are resolved CSS color strings.
 * `scale` is a magnitude lens's radius multiplier (0.6× to 1.6×).
 */
export type LensFill =
  | { readonly kind: "solid"; readonly color: string; readonly scale?: number }
  | { readonly kind: "dither"; readonly colors: readonly string[]; readonly weights: readonly number[] }
  | { readonly kind: "none" };

export interface Lens {
  readonly id: string;
  readonly name: string;
  readonly level: LensLevel;
  readonly fill: (region: Region, effective: LensLevel) => LensFill;
}

/** Dots of one color and radius, split by how they draw: a frame is a few dozen fills. */
export interface Bucket {
  readonly color: string;
  readonly scale: number;
  /** Drawn at full alpha. */
  readonly solid: Int32Array;
  /** The B-only dots that fade in over an octave. */
  readonly fading: Int32Array;
  /** Centroid dots that carry a ring. */
  readonly ringed: Int32Array;
}

/** A mixed value drawn as diagonal bands in proportion: 28 of 52 seats is a 54/46 hatch. */
export interface Hatch {
  readonly colors: readonly string[];
  readonly weights: readonly number[];
}

export interface Painted {
  /** Each region's ground fill: its lens color, the majority color of a mix, or quiet land where the lens is silent. */
  readonly fills: ReadonlyMap<number, string>;
  /** The regions whose value is a mix, hatched over their majority fill. */
  readonly hatches: ReadonlyMap<number, Hatch>;
  readonly buckets: readonly Bucket[];
  /** The selected regions' dots, drawn last, lifted, and at the local density. */
  readonly lifted: readonly Bucket[];
  /** A second-level detachment's dots (a district inside its detached state), drawn over the lifted ones at full strength. */
  readonly focused: readonly Bucket[];
}

/** Magnitude radii are held to tenths so a magnitude lens adds a handful of buckets, not one per region. */
function quantizeScale(scale: number | undefined): number {
  return scale === undefined ? 1 : Math.round(Math.min(1.6, Math.max(0.6, scale)) * 10) / 10;
}

function groupByRegion(dots: Dots): Map<number, number[]> {
  const byRegion = new Map<number, number[]>();
  for (let d = 0; d < dots.count; d++) {
    const r = dots.region[d] ?? 0;
    const list = byRegion.get(r);
    if (list) list.push(d);
    else byRegion.set(r, [d]);
  }
  return byRegion;
}

interface Style {
  readonly palette: { color: string; scale: number }[];
  readonly slot: Uint16Array;
}

function slotter(neutral: string): { palette: { color: string; scale: number }[]; slotOf: (color: string, scale: number) => number } {
  const palette = [{ color: neutral, scale: 1 }];
  const slotOf = (color: string, scale: number): number => {
    const found = palette.findIndex((entry) => entry.color === color && entry.scale === scale);
    return found >= 0 ? found : palette.push({ color, scale }) - 1;
  };
  return { palette, slotOf };
}

/** Each dot's color and radius slot. Dither is ranked separately for A dots and B-only dots so each grid shows the exact mix. */
function styleDots(dots: Dots, regions: readonly Region[], lens: Lens, effective: LensLevel, neutral: string): Style {
  const { palette, slotOf } = slotter(neutral);
  const slot = new Uint16Array(dots.count);
  for (const [r, members] of groupByRegion(dots)) {
    const region = regions[r];
    const fill: LensFill = region ? lens.fill(region, effective) : { kind: "none" };
    if (fill.kind === "none") continue;
    if (fill.kind === "solid") {
      const s = slotOf(fill.color, quantizeScale(fill.scale));
      for (const d of members) slot[d] = s;
      continue;
    }
    const slots = fill.colors.map((color) => slotOf(color, 1));
    for (const group of [members.filter((d) => dots.kind[d] !== DotKind.B), members.filter((d) => dots.kind[d] === DotKind.B)]) {
      const assigned = assignDither(group.map((d) => dots.key[d] ?? 0), fill.weights);
      group.forEach((d, i) => (slot[d] = slots[assigned[i] ?? 0] ?? 0));
    }
  }
  return { palette, slot };
}

type Lists = { solid: number[]; fading: number[]; ringed: number[] };

function toBuckets(palette: readonly { color: string; scale: number }[], lists: readonly Lists[]): Bucket[] {
  return palette.flatMap((entry, i) => {
    const list = lists[i];
    if (!list || list.solid.length + list.fading.length + list.ringed.length === 0) return [];
    return [{ ...entry, solid: Int32Array.from(list.solid), fading: Int32Array.from(list.fading), ringed: Int32Array.from(list.ringed) }];
  });
}

function majority(fill: { readonly colors: readonly string[]; readonly weights: readonly number[] }, land: string): string {
  let best = 0;
  fill.weights.forEach((weight, i) => {
    if (weight > (fill.weights[best] ?? 0)) best = i;
  });
  return fill.colors[best] ?? land;
}

/**
 * The ground: a solid lens fills its region; a mix fills with its majority
 * color and is hatched over it, so a region too small for the bands to read
 * still says which way it leans; a silent lens leaves quiet land.
 */
export function regionGround(drawn: Iterable<number>, regions: readonly Region[], lens: Lens, effective: LensLevel, land: string): { fills: Map<number, string>; hatches: Map<number, Hatch> } {
  const fills = new Map<number, string>();
  const hatches = new Map<number, Hatch>();
  for (const r of drawn) {
    const region = regions[r];
    const fill: LensFill = region ? lens.fill(region, effective) : { kind: "none" };
    if (fill.kind === "solid") fills.set(r, fill.color);
    else if (fill.kind === "dither") {
      fills.set(r, majority(fill, land));
      hatches.set(r, { colors: fill.colors, weights: fill.weights });
    } else fills.set(r, land);
  }
  return { fills, hatches };
}

export interface PaintOptions {
  readonly selected?: ReadonlySet<number>;
  readonly focused?: ReadonlySet<number>;
  /**
   * The ground is filled, a mix is hatched and the selection is lifted, and
   * no dot is drawn: a dot on this map is a place, never a value. Off, every
   * region is dotted (the title screen's turning globe, the game's mark).
   */
  readonly filled?: boolean;
  /** The regions with drawn shapes, and the quiet land color their fill falls back to. */
  readonly drawn?: Iterable<number>;
  readonly land?: string;
}

/**
 * Group the dots for drawing. A selected region's B-only dots go in with its
 * solid ones: a detached region redraws at its local density.
 */
export function paint(dots: Dots, regions: readonly Region[], lens: Lens, effective: LensLevel, neutral: string, options: PaintOptions = {}): Painted {
  if (options.filled) {
    const { fills, hatches } = regionGround(options.drawn ?? [], regions, lens, effective, options.land ?? neutral);
    return { fills, hatches, buckets: [], lifted: [], focused: [] };
  }
  const selected = options.selected ?? new Set<number>();
  const focused = options.focused ?? new Set<number>();
  const { palette, slot } = styleDots(dots, regions, lens, effective, neutral);
  const make = (): Lists[] => palette.map(() => ({ solid: [], fading: [], ringed: [] }));
  const rest = make();
  const lifted = make();
  const focus = make();
  for (let d = 0; d < dots.count; d++) {
    const region = dots.region[d] ?? -1;
    const isSelected = selected.has(region);
    const kind = dots.kind[d];
    const list = (focused.has(region) ? focus : isSelected ? lifted : rest)[slot[d] ?? 0];
    if (!list) continue;
    if (kind === DotKind.Centroid) list.ringed.push(d);
    else if (kind === DotKind.B && !isSelected) list.fading.push(d);
    else list.solid.push(d);
  }
  return { fills: new Map(), hatches: new Map(), buckets: toBuckets(palette, rest), lifted: toBuckets(palette, lifted), focused: toBuckets(palette, focus) };
}

function traceDots(ctx: CanvasRenderingContext2D, dots: Dots, list: Int32Array, camera: Affine, viewport: Viewport, r: number): void {
  const pad = r * 3;
  ctx.beginPath();
  for (const d of list) {
    const sx = (dots.x[d] ?? 0) * camera.k + camera.x;
    const sy = (dots.y[d] ?? 0) * camera.k + camera.y;
    if (sx < -pad || sy < -pad || sx > viewport.width + pad || sy > viewport.height + pad) continue;
    ctx.moveTo(sx + r, sy);
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
  }
}

/** How a frame draws its dots beyond the octave: the high-contrast radius and the detach fade. */
export interface DrawStyle {
  /** Multiplies every radius: 1.5 in high contrast (0.3 × pitch against 0.2). */
  readonly radiusScale: number;
  /** Alpha of everything not selected. */
  readonly alpha: number;
}

/**
 * The ring that keeps a sub-cell region visible and pickable. On a fine
 * lattice (a phone's world view, where Europe and the Caribbean crowd) the
 * ring tightens and thins so neighbors do not merge into one blot.
 */
export function ringFor(octave: Octave, radius: number): { readonly radius: number; readonly width: number; readonly alpha: number } {
  if (octave.pitch < 5) return { radius: Math.max(radius * 1.9, 2.5), width: 0.6, alpha: 0.55 };
  return { radius: Math.max(radius * 3, 4.5), width: 1, alpha: 1 };
}

/** Draw a set of buckets for the current camera. The context is in CSS pixels. */
export function drawBuckets(ctx: CanvasRenderingContext2D, dots: Dots, buckets: readonly Bucket[], camera: Affine, viewport: Viewport, octave: Octave, style: DrawStyle): void {
  for (const bucket of buckets) {
    const r = octave.radius * style.radiusScale * bucket.scale;
    ctx.fillStyle = bucket.color;
    ctx.globalAlpha = style.alpha;
    traceDots(ctx, dots, bucket.solid, camera, viewport, r);
    ctx.fill();
    if (octave.fadeB > 0.01 && bucket.fading.length > 0) {
      ctx.globalAlpha = octave.fadeB * style.alpha;
      traceDots(ctx, dots, bucket.fading, camera, viewport, r);
      ctx.fill();
    }
    if (bucket.ringed.length > 0) {
      const ring = ringFor(octave, r);
      ctx.globalAlpha = style.alpha;
      traceDots(ctx, dots, bucket.ringed, camera, viewport, Math.max(r * 1.4, 1.5));
      ctx.fill();
      ctx.globalAlpha = style.alpha * ring.alpha;
      ctx.strokeStyle = bucket.color;
      ctx.lineWidth = ring.width;
      traceDots(ctx, dots, bucket.ringed, camera, viewport, ring.radius);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}
