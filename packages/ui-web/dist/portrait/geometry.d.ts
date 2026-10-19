export type Pt = {
    readonly x: number;
    readonly y: number;
};
export declare const CX = 100;
export declare const pt: (x: number, y: number) => Pt;
export declare const fmt: (p: Pt) => string;
export declare const mirror: (p: Pt) => Pt;
export declare const lerp: (a: number, b: number, t: number) => number;
export declare const lerpPt: (a: Pt, b: Pt, t: number) => Pt;
export declare const add: (a: Pt, dx: number, dy: number) => Pt;
export declare const clamp: (v: number, lo?: number, hi?: number) => number;
/**
 * A symmetric outline from its right half, listed top to bottom. The two ends
 * sit on the center line, so the mirrored half joins without a seam.
 */
export declare function symmetric(rightHalf: readonly Pt[]): Pt[];
/** A smooth curve through every point: the path most shapes in a face are. */
export declare function smooth(points: readonly Pt[], closed?: boolean, tension?: number): string;
export declare function polygon(points: readonly Pt[]): string;
export declare function polyline(points: readonly Pt[]): string;
/** The same smooth curve as a dense polyline, for offsets and edge textures. */
export declare function sample(points: readonly Pt[], closed?: boolean, perSegment?: number, tension?: number): Pt[];
/** Push each point away from a center, by an amount that may depend on direction. */
export declare function inflate(points: readonly Pt[], center: Pt, amount: (dir: Pt) => number): Pt[];
/**
 * An edge broken into small outward arcs: what curly and coiled hair looks
 * like at the silhouette. Arc size varies with a deterministic wobble so the
 * edge never reads as a stamped pattern.
 */
export declare function scallop(points: readonly Pt[], radius: number, closed: boolean, wobble: (i: number) => number): string;
/** Offset an open polyline sideways (positive = to the right of travel). */
export declare function offsetLine(points: readonly Pt[], dist: (t: number) => number): Pt[];
/** A tapered ribbon along a centerline: brows, strands, folds. */
export declare function ribbon(center: readonly Pt[], width: (t: number) => number): string;
