import type { Hatch } from "./paint";

/** One period of the hatch in CSS pixels: wide enough that a two-way split reads as bands, fine enough to stay a texture. */
export const HATCH_PERIOD_PX = 7;

/**
 * Each color's share of one diagonal period, as [start, end) offsets along
 * x + y in units of the period. Shares are normalized, so weights in seats or
 * in fractions draw the same bands.
 */
export function hatchBands(weights: readonly number[]): readonly (readonly [number, number])[] {
  const total = weights.reduce((sum, weight) => sum + Math.max(0, weight), 0);
  if (total <= 0) return [];
  let at = 0;
  return weights.map((weight) => {
    const start = at;
    at += Math.max(0, weight) / total;
    return [start, at] as const;
  });
}

type Tile = OffscreenCanvas | HTMLCanvasElement;

function makeTile(size: number): Tile {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(size, size);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

/**
 * A square tile whose 45° bands wrap seamlessly: a band between the lines
 * x + y = a and x + y = b is drawn once per neighboring period so it crosses
 * the tile's corners whole.
 */
function drawTile(hatch: Hatch, size: number): Tile {
  const tile = makeTile(size);
  const ctx = tile.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (!ctx) throw new Error("The map could not open a 2D context for a hatch tile.");
  hatchBands(hatch.weights).forEach(([start, end], i) => {
    ctx.fillStyle = hatch.colors[i] ?? "transparent";
    for (const shift of [-1, 0, 1]) {
      const a = (start + shift) * size;
      const b = (end + shift) * size;
      ctx.beginPath();
      ctx.moveTo(a, 0);
      ctx.lineTo(b, 0);
      ctx.lineTo(b - size, size);
      ctx.lineTo(a - size, size);
      ctx.closePath();
      ctx.fill();
    }
  });
  return tile;
}

const cache = new Map<string, CanvasPattern>();

/**
 * The hatch as a pattern held to a fixed screen pitch: the context draws in
 * plane units, so the pattern is scaled back by the camera's zoom and the
 * device ratio, and the bands travel with the land as it pans.
 */
export function hatchPattern(ctx: CanvasRenderingContext2D, hatch: Hatch, k: number, dpr: number): CanvasPattern | null {
  const size = Math.max(4, Math.round(HATCH_PERIOD_PX * dpr));
  const key = `${size}|${hatch.colors.join(",")}|${hatch.weights.map((w) => w.toFixed(3)).join(",")}`;
  let pattern = cache.get(key) ?? null;
  if (!pattern) {
    pattern = ctx.createPattern(drawTile(hatch, size), "repeat");
    if (!pattern) return null;
    if (cache.size > 256) cache.clear();
    cache.set(key, pattern);
  }
  pattern.setTransform(new DOMMatrix().scaleSelf(1 / (k * dpr)));
  return pattern;
}
