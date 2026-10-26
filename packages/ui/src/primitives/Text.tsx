import { Text as CoreText, styled } from "@tamagui/core";

/**
 * Every line of player text. `variant` is the type ramp from DESIGN.md; `tone`
 * names what the ink means, never a color, so the theme it sits under (light,
 * dark, the navy chrome, paper, the situation room) decides the value.
 */
export const Text = styled(CoreText, {
  name: "Text",
  fontFamily: "body",
  color: "color",
  fontSize: "body",
  lineHeight: "body",
  variants: {
    variant: {
      eyebrow: { fontSize: "caption", lineHeight: "caption", fontWeight: "600", letterSpacing: 1, textTransform: "uppercase" },
      caption: { fontSize: "caption", lineHeight: "caption" },
      label: { fontSize: "label", lineHeight: "label", fontWeight: "500" },
      body: { fontSize: "body", lineHeight: "body" },
      title: { fontFamily: "heading", fontSize: "title", lineHeight: "title", fontWeight: "600" },
      heading: { fontFamily: "heading", fontSize: "heading", lineHeight: "heading", fontWeight: "600", letterSpacing: -0.2 },
      display: { fontFamily: "heading", fontSize: "display", lineHeight: "display", fontWeight: "600", letterSpacing: -0.4 },
      figure: { fontSize: "figure", lineHeight: "figure", fontWeight: "500", letterSpacing: -0.3, fontVariant: ["tabular-nums"] },
      figureXl: { fontSize: "figureXl", lineHeight: "figureXl", fontWeight: "500", letterSpacing: -0.9, fontVariant: ["tabular-nums"] },
      // Newsreader is ceremony, voice and paper: a matter's title, the President's own words, the title screen, an issued document.
      headline: { fontFamily: "serif", fontSize: "headline", lineHeight: "headline", fontWeight: "500", letterSpacing: -0.3 },
      voice: { fontFamily: "serif", fontSize: "voice", lineHeight: "voice", fontStyle: "italic" },
      hero: { fontFamily: "serif", fontSize: "hero", lineHeight: "hero", fontWeight: "500", letterSpacing: -1.2 },
      document: { fontFamily: "serif", fontSize: "document", lineHeight: "document" },
      clock: { fontFamily: "mono", fontSize: "clock", lineHeight: "clock", fontWeight: "500", letterSpacing: 0.3 },
      code: { fontFamily: "mono", fontSize: "code", lineHeight: "code", fontWeight: "500", letterSpacing: 0.5 },
    },
    tone: {
      primary: { color: "color" },
      secondary: { color: "colorSecondary" },
      tertiary: { color: "colorTertiary" },
      disabled: { color: "colorDisabled" },
      accent: { color: "accent" },
      gold: { color: "gold" },
      danger: { color: "danger" },
      success: { color: "successInk" },
      warning: { color: "warningInk" },
      info: { color: "infoInk" },
      inverse: { color: "accentInk" },
      onDanger: { color: "dangerInk" },
      goldInk: { color: "goldInk" },
    },
    weight: {
      regular: { fontWeight: "400" },
      medium: { fontWeight: "600" },
      strong: { fontWeight: "700" },
    },
    serif: { true: { fontFamily: "serif" } },
    mono: { true: { fontFamily: "mono" } },
    tabular: { true: { fontVariant: ["tabular-nums"] } },
    center: { true: { textAlign: "center" } },
    // Tracked capitals: a stamp, a classification banner, a form's fixed heading, a masthead plate. Pass it after `variant`, whose own tracking it replaces.
    caps: { true: { textTransform: "uppercase", letterSpacing: 1.2 } },
  } as const,
  defaultVariants: { variant: "body" },
});

export type TextProps = React.ComponentProps<typeof Text>;
