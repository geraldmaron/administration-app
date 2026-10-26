export declare const BRAND_VIEW_BOX = "0 0 64 64";
/** Which desk role a part takes: `ink` for the body, `brass` for the accent. */
export type BrandPartRole = "ink" | "brass";
export type BrandPart = {
    readonly d: string;
    readonly role: BrandPartRole;
};
/** The body with the slit and breather hole cut out, as one keyhole, so even-odd filling never doubles an overlap. */
export declare const BRAND_NIB_PATH = "M32 60L12 32L20 4H44L52 32ZM30 33.657A6 6 0 1 1 34 33.657V52L32 56L30 52Z";
export declare const BRAND_HOLE_PATH = "M32 22A6 6 0 1 1 32 34A6 6 0 1 1 32 22Z";
export declare const BRAND_NIB_PATH_SMALL = "M32 60L12 32L20 4H44L52 32ZM28 34.928A8 8 0 1 1 36 34.928V52L32 56L28 52Z";
export declare const BRAND_HOLE_PATH_SMALL = "M32 20A8 8 0 1 1 32 36A8 8 0 1 1 32 20Z";
/** Paint order: body first, brass over its hole. Fill each part with `fillRule="evenodd"`. */
export declare const BRAND_PARTS: readonly BrandPart[];
export declare const BRAND_PARTS_SMALL: readonly BrandPart[];
/** Below this rendered size the small geometry is drawn. */
export declare const BRAND_SMALL_BELOW = 24;
/** The smallest size the mark is drawn at. */
export declare const BRAND_MIN_SIZE = 16;
/** Clear space on every side, in grid units: the breather hole's diameter. */
export declare const BRAND_CLEAR_SPACE = 12;
export declare function brandParts(size: number): readonly BrandPart[];
