// The product mark, the Nib: an upright fountain-pen nib, because the President's
// work ends in a signature. Brass fills the breather hole, the point where ink
// leaves the pen; the same hole is a cutout in one ink, so the silhouette carries
// the mark and brass only adds to it. An authored product mark, never a seal.
//
// One 64-unit grid, mirror-symmetric about x=32, every edge on a 4-unit step so a
// 32px render lands on whole pixels. Sizes under 24px use BRAND_PARTS_SMALL, whose
// wider slit and hole land on whole pixels at 16px. This file is the only
// geometry source: BrandMark draws it and scripts/generate-brand.mjs renders
// every platform asset from the built copy.

export const BRAND_VIEW_BOX = "0 0 64 64";

/** Which desk role a part takes: `ink` for the body, `brass` for the accent. */
export type BrandPartRole = "ink" | "brass";
export type BrandPart = { readonly d: string; readonly role: BrandPartRole };

/** The body with the slit and breather hole cut out, as one keyhole, so even-odd filling never doubles an overlap. */
export const BRAND_NIB_PATH = "M32 60L12 32L20 4H44L52 32ZM30 33.657A6 6 0 1 1 34 33.657V52L32 56L30 52Z";
export const BRAND_HOLE_PATH = "M32 22A6 6 0 1 1 32 34A6 6 0 1 1 32 22Z";

export const BRAND_NIB_PATH_SMALL = "M32 60L12 32L20 4H44L52 32ZM28 34.928A8 8 0 1 1 36 34.928V52L32 56L28 52Z";
export const BRAND_HOLE_PATH_SMALL = "M32 20A8 8 0 1 1 32 36A8 8 0 1 1 32 20Z";

/** Paint order: body first, brass over its hole. Fill each part with `fillRule="evenodd"`. */
export const BRAND_PARTS: readonly BrandPart[] = [
  { d: BRAND_NIB_PATH, role: "ink" },
  { d: BRAND_HOLE_PATH, role: "brass" },
];
export const BRAND_PARTS_SMALL: readonly BrandPart[] = [
  { d: BRAND_NIB_PATH_SMALL, role: "ink" },
  { d: BRAND_HOLE_PATH_SMALL, role: "brass" },
];

/** Below this rendered size the small geometry is drawn. */
export const BRAND_SMALL_BELOW = 24;
/** The smallest size the mark is drawn at. */
export const BRAND_MIN_SIZE = 16;
/** Clear space on every side, in grid units: the breather hole's diameter. */
export const BRAND_CLEAR_SPACE = 12;

export function brandParts(size: number): readonly BrandPart[] {
  return size < BRAND_SMALL_BELOW ? BRAND_PARTS_SMALL : BRAND_PARTS;
}
