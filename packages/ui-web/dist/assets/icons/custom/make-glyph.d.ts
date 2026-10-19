import type { Icon as Glyph } from "@phosphor-icons/react";
/**
 * A custom silhouette on Phosphor's 256 grid. `body` is the closed outline
 * that takes a fill; `detail` is open strokes inside it (a mast, a seam, a
 * rotor). Both are drawn on the centerline, so the stroke width alone decides
 * the weight, as it does in Phosphor's regular cut.
 */
export type GlyphShape = {
    readonly name: string;
    readonly body: string;
    readonly detail?: string;
    /** Degrees about the center, for a drawing that is easier to author upright. */
    readonly rotate?: number;
};
/**
 * Builds a component that matches Phosphor's `Icon` type, so the ICONS table
 * takes it like any other glyph. Duotone lays a 20% fill under the stroke; fill
 * is the solid silhouette with the detail strokes cut out of it where they cross the body and kept where they stand clear of it.
 */
export declare function makeGlyph({ name, body, detail, rotate }: GlyphShape): Glyph;
