import { View, styled } from "@tamagui/core";

/**
 * Every panel, card and row group. `level` is depth in the workspace, not
 * decoration: the base work area, a raised card inside it, a sunken well for
 * a chart or a table. `interactive` adds the hover, press and focus states a
 * door into another screen needs.
 */
export const Surface = styled(View, {
  name: "Surface",
  backgroundColor: "surface",
  borderRadius: "card",
  borderWidth: 1,
  borderColor: "borderColor",
  variants: {
    // A panel rests on the ground with a soft contact shadow and a card inside it
    // with a lighter one, so the levels read in light theme where the tints
    // alone are too close; a sunken well sits flush, and `elevated` lifts a
    // sheet, peek or inspector clear of both.
    level: {
      base: { backgroundColor: "surface", shadowColor: "shadowColor", shadowOpacity: 0.7, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
      raised: { backgroundColor: "surfaceRaised", shadowColor: "shadowColor", shadowOpacity: 0.45, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } },
      sunken: { backgroundColor: "backgroundStrong", shadowOpacity: 0 },
      flat: { backgroundColor: "transparent", borderWidth: 0, shadowOpacity: 0 },
    },
    pad: {
      none: { padding: 0 },
      sm: { padding: "sm" },
      md: { padding: "md" },
      lg: { padding: "lg" },
      xl: { padding: "xl" },
    },
    elevated: {
      true: { shadowColor: "shadowColor", shadowOpacity: 1, shadowRadius: 18, shadowOffset: { width: 0, height: 6 } },
    },
    interactive: {
      true: {
        cursor: "pointer",
        backgroundColor: { default: "surface", hover: "surfaceHover", press: "backgroundPress" },
        borderColor: { default: "borderColor", hover: "borderColorHover", "focus-visible": "outlineColor" },
        outlineColor: "outlineColor",
        outlineWidth: { default: 0, "focus-visible": 2 },
        outlineStyle: "solid",
        outlineOffset: 2,
      },
    },
    accentEdge: {
      accent: { borderLeftWidth: 4, borderLeftColor: "accent" },
      gold: { borderLeftWidth: 4, borderLeftColor: "goldRule" },
      danger: { borderLeftWidth: 4, borderLeftColor: "danger" },
      warning: { borderLeftWidth: 4, borderLeftColor: "warningInk" },
      success: { borderLeftWidth: 4, borderLeftColor: "successInk" },
    },
    radius: {
      none: { borderRadius: 0 },
      chip: { borderRadius: "chip" },
      card: { borderRadius: "card" },
      sheet: { borderRadius: "sheet" },
    },
  } as const,
  defaultVariants: { level: "base", pad: "lg" },
});
