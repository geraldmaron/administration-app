import { forwardRef, useId } from "react";
import type { Icon as Glyph, IconProps } from "@phosphor-icons/react";

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

const STROKE_WIDTH = { regular: 16, bold: 24, duotone: 16, fill: 16 } as const;
type DrawnWeight = keyof typeof STROKE_WIDTH;

const drawnWeight = (weight: IconProps["weight"]): DrawnWeight =>
  weight === "bold" || weight === "duotone" || weight === "fill" ? weight : "regular";

/**
 * Builds a component that matches Phosphor's `Icon` type, so the ICONS table
 * takes it like any other glyph. Duotone lays a 20% fill under the stroke; fill
 * is the solid silhouette with the detail strokes cut out of it where they cross the body and kept where they stand clear of it.
 */
export function makeGlyph({ name, body, detail, rotate }: GlyphShape): Glyph {
  const Component = forwardRef<SVGSVGElement, IconProps>(function CustomGlyph(props, ref) {
    const { alt, color, size, weight, mirrored, children, ...rest } = props;
    const cutId = useId();
    const outsideId = useId();
    const drawn = drawnWeight(weight);
    const ink = color ?? "currentColor";
    const strokeWidth = STROKE_WIDTH[drawn];
    const stroke = { stroke: ink, strokeWidth, strokeLinecap: "round", strokeLinejoin: "round" } as const;
    const solid = drawn === "fill";
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size ?? "1em"}
        height={size ?? "1em"}
        viewBox="0 0 256 256"
        fill="none"
        transform={mirrored ? "scale(-1, 1)" : undefined}
        {...rest}
      >
        {alt ? <title>{alt}</title> : null}
        {children}
        <g transform={rotate ? `rotate(${rotate} 128 128)` : undefined}>
          {solid && detail ? (
            <>
              <mask id={cutId} maskUnits="userSpaceOnUse" x={-128} y={-128} width={512} height={512}>
                <rect x={-128} y={-128} width={512} height={512} fill="white" />
                <path d={detail} fill="none" stroke="black" strokeWidth={STROKE_WIDTH.regular} strokeLinecap="round" strokeLinejoin="round" />
              </mask>
              <mask id={outsideId} maskUnits="userSpaceOnUse" x={-128} y={-128} width={512} height={512}>
                <rect x={-128} y={-128} width={512} height={512} fill="white" />
                <path d={body} fill="black" stroke="black" strokeWidth={STROKE_WIDTH.regular} strokeLinecap="round" strokeLinejoin="round" />
              </mask>
            </>
          ) : null}
          <path
            d={body}
            {...stroke}
            fill={drawn === "duotone" || solid ? ink : "none"}
            fillOpacity={drawn === "duotone" ? 0.2 : undefined}
            mask={solid && detail ? `url(#${cutId})` : undefined}
            data-glyph-part={name}
          />
          {detail ? <path d={detail} {...stroke} fill="none" mask={solid ? `url(#${outsideId})` : undefined} /> : null}
        </g>
      </svg>
    );
  });
  Component.displayName = `${name}Icon`;
  return Component;
}
