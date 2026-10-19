import type { Icon as Glyph, IconProps } from "phosphor-react-native";
import Svg, { G, Path } from "react-native-svg";

/**
 * A custom silhouette on Phosphor's 256 grid, drawn with react-native-svg so
 * it renders on every platform the player ships to. `body` is the closed
 * outline that takes a fill; `detail` is open strokes inside it.
 */
export type GlyphShape = {
  readonly name: string;
  readonly body: string;
  readonly detail?: string;
  /** Degrees about the center, for a drawing that is easier to author upright. */
  readonly rotate?: number;
};

const STROKE_WIDTH = { regular: 16, bold: 24, duotone: 16, fill: 16, thin: 8, light: 12 } as const;

/**
 * Matches Phosphor's `Icon` type so the ICONS table takes it like any other
 * glyph. Duotone lays a 20% fill under the stroke; fill is the solid
 * silhouette with its detail strokes drawn at reduced opacity, which keeps
 * them legible without the mask the web build used.
 */
export function makeGlyph({ name, body, detail, rotate }: GlyphShape): Glyph {
  const Component: Glyph = ({ color = "currentColor", size = 24, weight = "regular", mirrored, style, testID }: IconProps) => {
    const strokeWidth = STROKE_WIDTH[weight] ?? STROKE_WIDTH.regular;
    const solid = weight === "fill";
    return (
      <Svg width={size} height={size} viewBox="0 0 256 256" fill="none" style={[mirrored ? { transform: [{ scaleX: -1 }] } : null, style]} testID={testID}>
        <G transform={rotate ? `rotate(${rotate} 128 128)` : undefined}>
          <Path
            d={body}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={weight === "duotone" || solid ? color : "none"}
            fillOpacity={weight === "duotone" ? 0.2 : 1}
          />
          {detail ? (
            <Path d={detail} stroke={color} strokeOpacity={solid ? 0.35 : 1} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          ) : null}
        </G>
      </Svg>
    );
  };
  Component.displayName = `${name}Icon`;
  return Component;
}
