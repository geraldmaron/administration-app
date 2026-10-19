/**
 * Region ids in the offscreen id buffer. A region index is spread over red
 * and green, and blue carries a checksum of the two. Canvas 2D antialiases
 * every edge, so a pixel on a border is a blend of two ids; a blend almost
 * never satisfies the checksum, and a partly covered pixel has alpha below
 * 255. Both read as "no region", which is what a border should be.
 */
export const NO_REGION = -1;
export const MAX_REGIONS = 65534;

// Nonlinear on purpose: a linear checksum survives averaging, so the blend of
// two neighbors' colors would pass as a third region.
function checksum(r: number, g: number): number {
  let x = Math.imul(r | (g << 8), 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  return (x ^ (x >>> 16)) & 0xff;
}

/** The CSS color a region is filled with in the id buffer. Index 0 is a real region. */
export function idFill(index: number): string {
  if (!Number.isInteger(index) || index < 0 || index >= MAX_REGIONS) throw new RangeError(`Region index ${index} out of range`);
  const value = index + 1;
  const r = value & 0xff;
  const g = (value >> 8) & 0xff;
  return `rgb(${r},${g},${checksum(r, g)})`;
}

export function decodeId(r: number, g: number, b: number, a: number, regionCount: number): number {
  if (a !== 255 || b !== checksum(r, g)) return NO_REGION;
  const index = (r | (g << 8)) - 1;
  return index >= 0 && index < regionCount ? index : NO_REGION;
}

/** Decode a whole RGBA buffer into region indices. */
export function decodeBuffer(rgba: Uint8ClampedArray, regionCount: number): Int32Array {
  const ids = new Int32Array(rgba.length / 4);
  for (let p = 0, i = 0; i < ids.length; i++, p += 4) {
    ids[i] = decodeId(rgba[p] ?? 0, rgba[p + 1] ?? 0, rgba[p + 2] ?? 0, rgba[p + 3] ?? 0, regionCount);
  }
  return ids;
}
