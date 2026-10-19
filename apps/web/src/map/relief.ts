import type { GeoProjection } from "d3-geo";
import type { Affine, Viewport } from "./camera";

/**
 * Natural Earth's shaded relief (public domain, GRAY_50M_SR_W), equirectangular,
 * downsampled to 4096×2048: the terrain the land is lit by. One channel is kept.
 */
export interface ReliefLevel {
  readonly width: number;
  readonly height: number;
  readonly shade: Uint8Array;
}

export interface ReliefPlate {
  /**
   * Full resolution first, each next level half the last, so a wide view reads
   * the terrain's shape rather than its pixel noise. Each level holds the
   * plate's local detail around middle gray: flat ground of any brightness is
   * 128, and only ridges and valleys move off it.
   */
  readonly levels: readonly ReliefLevel[];
}

/** A view's terrain as gray pixels, rendered for one camera at a fraction of screen resolution. */
export interface ReliefPixels {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

/** How hard local detail is pushed off middle gray: the plate's ridges span about ±20 levels. */
const GAIN = 4;
const MIP_LEVELS = 5;
/** The radius, in a level's own pixels, of the neighborhood whose mean counts as flat ground there. */
const DETAIL_RADIUS = 5;
/** The plate from its decoded RGBA pixels: one channel, a mip pyramid, each level as its local detail. */
export function plateFromPixels(width: number, height: number, rgba: Uint8ClampedArray): ReliefPlate {
  const shade = new Uint8Array(width * height);
  for (let i = 0; i < shade.length; i++) shade[i] = rgba[i * 4] ?? 0;
  const levels: ReliefLevel[] = [{ width, height, shade }];
  while (levels.length < MIP_LEVELS) levels.push(halve(levels[levels.length - 1]!));
  return { levels: levels.map(detail) };
}

/** A box blur along one axis, with the edge pixel repeated. */
function blurAxis(src: Float32Array, width: number, height: number, horizontal: boolean): Float32Array {
  const out = new Float32Array(src.length);
  const span = DETAIL_RADIUS * 2 + 1;
  const lines = horizontal ? height : width;
  const length = horizontal ? width : height;
  const index = (line: number, i: number): number => (horizontal ? line * width + i : i * width + line);
  for (let line = 0; line < lines; line++) {
    let sum = 0;
    for (let i = -DETAIL_RADIUS; i <= DETAIL_RADIUS; i++) sum += src[index(line, Math.min(length - 1, Math.max(0, i)))] ?? 0;
    for (let i = 0; i < length; i++) {
      out[index(line, i)] = sum / span;
      sum += (src[index(line, Math.min(length - 1, i + DETAIL_RADIUS + 1))] ?? 0) - (src[index(line, Math.max(0, i - DETAIL_RADIUS))] ?? 0);
    }
  }
  return out;
}

/** The level's detail: each pixel against the mean around it, pushed off middle gray. */
function detail(level: ReliefLevel): ReliefLevel {
  const { width, height } = level;
  const raw = Float32Array.from(level.shade);
  const smooth = blurAxis(blurAxis(raw, width, height, true), width, height, false);
  const shade = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) shade[i] = Math.max(0, Math.min(255, 128 + ((raw[i] ?? 0) - (smooth[i] ?? 0)) * GAIN));
  return { width, height, shade };
}

/** A level at half the size, each pixel the mean of the four under it. */
function halve(level: ReliefLevel): ReliefLevel {
  const width = Math.max(1, level.width >> 1);
  const height = Math.max(1, level.height >> 1);
  const shade = new Uint8Array(width * height);
  const at = (x: number, y: number): number => level.shade[y * level.width + x] ?? 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      shade[y * width + x] = (at(2 * x, 2 * y) + at(2 * x + 1, 2 * y) + at(2 * x, 2 * y + 1) + at(2 * x + 1, 2 * y + 1)) >> 2;
    }
  }
  return { width, height, shade };
}

/** The level whose pixels are about the size of one rendered pixel at this zoom. */
export function levelFor(relief: ReliefPlate, degreesPerPixel: number): ReliefLevel {
  for (const level of relief.levels) {
    if (360 / level.width >= degreesPerPixel * 0.75) return level;
  }
  return relief.levels[relief.levels.length - 1]!;
}

/** The level's detail at a lon/lat, bilinear: 128 on flat ground. */
export function shadeAt(level: ReliefLevel, lon: number, lat: number): number {
  const u = (((((lon + 180) % 360) + 360) % 360) / 360) * level.width - 0.5;
  const v = ((90 - lat) / 180) * level.height - 0.5;
  const x0 = Math.floor(u);
  const y0 = Math.max(0, Math.min(level.height - 2, Math.floor(v)));
  const fx = u - x0;
  const fy = Math.min(1, Math.max(0, v - y0));
  const xa = ((x0 % level.width) + level.width) % level.width;
  const xb = (xa + 1) % level.width;
  const at = (x: number, y: number): number => level.shade[y * level.width + x] ?? 128;
  const top = at(xa, y0) * (1 - fx) + at(xb, y0) * fx;
  const bottom = at(xa, y0 + 1) * (1 - fx) + at(xb, y0 + 1) * fx;
  return top * (1 - fy) + bottom * fy;
}

/**
 * Render a view's terrain: every pixel inverted through the camera and the
 * projection to a lon/lat, then read off the plate. Runs in the relief
 * worker, so it never holds a frame.
 */
export function renderShade(projection: GeoProjection, camera: Affine, viewport: Viewport, relief: ReliefPlate, scale: number): ReliefPixels {
  const width = Math.max(1, Math.ceil(viewport.width * scale));
  const height = Math.max(1, Math.ceil(viewport.height * scale));
  const data = new Uint8ClampedArray(width * height * 4);
  const invert = projection.invert;
  // Plane units per radian is the projection's scale; at the view's center that sets the degrees one rendered pixel spans.
  const degreesPerPixel = 180 / Math.PI / (projection.scale() * camera.k * scale);
  const level = levelFor(relief, degreesPerPixel);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const at = invert?.([((x + 0.5) / scale - camera.x) / camera.k, ((y + 0.5) / scale - camera.y) / camera.k]);
      if (!at || !Number.isFinite(at[0]) || !Number.isFinite(at[1])) continue;
      const g = shadeAt(level, at[0], at[1]);
      const i = (y * width + x) * 4;
      data[i] = g;
      data[i + 1] = g;
      data[i + 2] = g;
      data[i + 3] = 255;
    }
  }
  return { width, height, data };
}
