import { createFont, createTamagui, createTokens } from "@tamagui/core";
import { animations } from "./animations";
import { fontSize, lineHeight, radiusScale, sizeScale, spaceScale, themes, zIndexScale } from "./from-design";

/** The face names expo-font registers for each weight; web loads the same names through @font-face. */
export const FONT_FACES = {
  sans: {
    400: "Geist_400Regular",
    500: "Geist_500Medium",
    600: "Geist_600SemiBold",
    700: "Geist_700Bold",
  },
  serif: {
    400: "Newsreader_400Regular",
    500: "Newsreader_500Medium",
    600: "Newsreader_600SemiBold",
    700: "Newsreader_600SemiBold",
  },
  serifItalic: "Newsreader_400Regular_Italic",
  mono: {
    400: "GeistMono_400Regular",
    500: "GeistMono_500Medium",
    600: "GeistMono_500Medium",
    700: "GeistMono_500Medium",
  },
} as const;

type FaceSet = { readonly 400: string; readonly 500: string; readonly 600: string; readonly 700: string };

function faceOf(set: FaceSet, italic?: string) {
  const at = (weight: keyof FaceSet) => (italic ? { normal: set[weight], italic } : { normal: set[weight] });
  return { 400: at(400), 500: at(500), 600: at(600), 700: at(700) };
}

const body = createFont({
  family: FONT_FACES.sans[400],
  size: fontSize,
  lineHeight,
  weight: { true: "400" },
  letterSpacing: { true: 0, display: -0.4, figureXl: -0.9, figure: -0.3 },
  face: faceOf(FONT_FACES.sans),
});

const heading = createFont({
  family: FONT_FACES.sans[600],
  size: fontSize,
  lineHeight,
  weight: { true: "600" },
  letterSpacing: { true: 0, heading: -0.2, display: -0.4 },
  face: faceOf(FONT_FACES.sans),
});

const serif = createFont({
  family: FONT_FACES.serif[400],
  size: fontSize,
  lineHeight,
  weight: { true: "400" },
  letterSpacing: { true: 0, headline: -0.3, hero: -1.2 },
  face: faceOf(FONT_FACES.serif, FONT_FACES.serifItalic),
});

const mono = createFont({
  family: FONT_FACES.mono[500],
  size: fontSize,
  lineHeight,
  weight: { true: "500" },
  letterSpacing: { true: 0, clock: 0.3, code: 0.5 },
  face: faceOf(FONT_FACES.mono),
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
