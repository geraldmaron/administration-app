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
  borderTopColor: "highlight",
  variants: {
    // Depth is light, not outline: a plane is lifted off the ground by its lit
    // top edge and a tight contact shadow, a card inside it by its own tint; a
    // sunken well sits flush, and `elevated` lifts a sheet, peek or inspector
    // clear of both.
    level: {
      base: { backgroundColor: "surface", shadowColor: "shadowColor", shadowOpacity: 1, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } },
      raised: { backgroundColor: "surfaceRaised", borderColor: "transparent", borderTopColor: "transparent", shadowOpacity: 0 },
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
      true: { shadowColor: "shadowColor", shadowOpacity: 1, shadowRadius: 24, shadowOffset: { width: 0, height: 8 } },
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
    // A card's character is a band across its top, never a colored side border.
    accentEdge: {
      accent: { borderTopWidth: 3, borderTopColor: "accent" },
      gold: { borderTopWidth: 3, borderTopColor: "goldRule" },
      danger: { borderTopWidth: 3, borderTopColor: "danger" },
      warning: { borderTopWidth: 3, borderTopColor: "warningInk" },
      success: { borderTopWidth: 3, borderTopColor: "successInk" },
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
