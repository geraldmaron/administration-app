import { createFont, createTamagui, createTokens } from "@tamagui/core";
import { typography } from "@admin/design";
import { animations } from "./animations";
import { fontSize, radiusScale, sizeScale, spaceScale, themes, zIndexScale } from "./from-design";

/** The face names expo-font registers for each Source weight; web loads the same names through @font-face. */
export const FONT_FACES = {
  sans: {
    400: "SourceSans3_400Regular",
    600: "SourceSans3_600SemiBold",
    700: "SourceSans3_700Bold",
  },
  serif: {
    400: "SourceSerif4_400Regular",
    600: "SourceSerif4_600SemiBold",
    700: "SourceSerif4_700Bold",
  },
} as const;

const leading = (ratio: number) =>
  Object.fromEntries(Object.entries(fontSize).map(([k, v]) => [k, Math.round(v * ratio)])) as Record<keyof typeof fontSize, number>;

function faceOf(set: { 400: string; 600: string; 700: string }) {
  return {
    400: { normal: set[400] },
    600: { normal: set[600] },
    700: { normal: set[700] },
  };
}

const body = createFont({
  family: FONT_FACES.sans[400],
  size: fontSize,
  lineHeight: leading(typography.leading.body),
  weight: { true: "400", caption: "400", label: "600", title: "600", heading: "700", display: "700", figure: "700", hero: "700" },
  letterSpacing: { true: 0, caption: 0.4, display: -0.5, hero: -0.8 },
  face: faceOf(FONT_FACES.sans),
});

const heading = createFont({
  family: FONT_FACES.sans[700],
  size: fontSize,
  lineHeight: leading(typography.leading.tight),
  weight: { true: "700" },
  letterSpacing: { true: 0, display: -0.5, hero: -0.8 },
  face: faceOf(FONT_FACES.sans),
});

const serif = createFont({
  family: FONT_FACES.serif[400],
  size: fontSize,
  lineHeight: leading(typography.leading.document),
  weight: { true: "400" },
  face: faceOf(FONT_FACES.serif),
});

const mono = createFont({
  family: "Menlo, Consolas, ui-monospace, monospace",
  size: fontSize,
  lineHeight: leading(typography.leading.compact),
  weight: { true: "400" },
});

export const tokens = createTokens({
  size: sizeScale,
  space: spaceScale,
  radius: radiusScale,
  zIndex: zIndexScale,
  color: {},
});

/**
 * Widths, never platforms (DECISIONS §8.5). `phone` is below the side rail;
 * `wide` is where the labeled navigation and three columns fit.
 */
export const media = {
  phone: { maxWidth: 767 },
  tablet: { minWidth: 768 },
  desktop: { minWidth: 1024 },
  wide: { minWidth: 1440 },
  narrow: { maxWidth: 359 },
  short: { maxHeight: 700 },
} as const;

export const config = createTamagui({
  tokens,
  themes,
  fonts: { body, heading, serif, mono },
  media,
  animations,
  settings: {
    allowedStyleValues: "somewhat-strict-web",
    styleValueSyntax: "object",
  },
});

export type AppConfig = typeof config;

declare module "@tamagui/core" {
  // Declaration merging is how Tamagui learns this config's tokens and themes; the interface is empty by design.
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config;
