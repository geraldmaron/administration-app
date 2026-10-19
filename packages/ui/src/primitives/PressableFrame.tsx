import { View, styled } from "@tamagui/core";

/** A bare pressable area with the shared focus ring, for rows and cards that are doors. */
export const PressableFrame = styled(View, {
  name: "Pressable",
  role: "button",
  tabIndex: 0,
  cursor: "pointer",
  outlineColor: "outlineColor",
  outlineStyle: "solid",
  outlineOffset: 2,
  outlineWidth: { default: 0, "focus-visible": 2 },
  borderRadius: "control",
  backgroundColor: { default: "transparent", hover: "surfaceHover", press: "backgroundPress" },
});
