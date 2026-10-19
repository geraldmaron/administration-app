// The sea's surface: a soft, tileable swell drawn once and laid over the
// abyss, so open water reads as water rather than as an empty fill. It is
// texture, not information: nothing in it changes with the game.

const TILE = 256;
/** Lattice cells per tile side for each octave of the swell, and its weight. */
const OCTAVES: readonly (readonly [number, number])[] = [
  [3, 0.5],
  [6, 0.28],
  [12, 0.14],
  [24, 0.08],
];

function hash(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

const fade = (t: number): number => t * t * t * (t * (t * 6 - 15) + 10);

/** Gradient noise that wraps every `cells` lattice cells, so the tile repeats without a seam; about -0.7..0.7. */
function wrappedNoise(u: number, v: number, cells: number, seed: number): number {
  const x = u * cells;
  const y = v * cells;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const dx = x - x0;
  const dy = y - y0;
  const corner = (i: number, j: number, ox: number, oy: number) => {
    const angle = hash(((i % cells) + cells) % cells, ((j % cells) + cells) % cells, seed) * Math.PI * 2;
    return Math.cos(angle) * ox + Math.sin(angle) * oy;
  };
  const u1 = fade(dx);
  const v1 = fade(dy);
  const top = corner(x0, y0, dx, dy) * (1 - u1) + corner(x0 + 1, y0, dx - 1, dy) * u1;
  const bottom = corner(x0, y0 + 1, dx, dy - 1) * (1 - u1) + corner(x0 + 1, y0 + 1, dx - 1, dy - 1) * u1;
  return top * (1 - v1) + bottom * v1;
}

/** The swell's tile: light where the noise crests, dark in its troughs, transparent in between. */
export function swellTile(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = TILE;
  canvas.height = TILE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("The sea tile has no 2D context");
  const image = ctx.createImageData(TILE, TILE);
  for (let j = 0; j < TILE; j++) {
    for (let i = 0; i < TILE; i++) {
      const value = OCTAVES.reduce((sum, [cells, weight], k) => sum + wrappedNoise(i / TILE, j / TILE, cells, k + 1) * weight, 0);
      // Broad mottling, lighter where the swell rises and deeper where it falls, with a faint line along each crest.
      const rise = Math.max(0, value) * 2;
      const fall = Math.max(0, -value) * 2;
      const line = Math.max(0, 1 - Math.abs(value) * 14) * 0.35;
      const lift = Math.min(1, rise * 0.6 + line);
      const at = (j * TILE + i) * 4;
      const light = lift >= fall * 0.8;
      image.data[at] = light ? 140 : 0;
      image.data[at + 1] = light ? 180 : 4;
      image.data[at + 2] = light ? 245 : 20;
      image.data[at + 3] = Math.round(255 * Math.min(1, light ? lift * 0.32 : fall * 0.4));
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

let tile: HTMLCanvasElement | null = null;

/** The swell as a repeating pattern, built on first use and shared by every map on the page. */
export function swellPattern(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  tile ??= swellTile();
  return ctx.createPattern(tile, "repeat");
}

export const SWELL_TILE = TILE;
