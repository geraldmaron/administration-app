import { View, styled } from "@tamagui/core";

/** A plain box; layout primitives below name the two directions. */

// Each boolean variant names its false case too: without one, `wrap={false}`
// falls through to the DOM as a raw attribute on the web.
export const Box = styled(View, { name: "Box" });

export const Column = styled(View, {
  name: "Column",
  flexDirection: "column",
  variants: { fill: { true: { flex: 1 }, false: {} }, center: { true: { alignItems: "center", justifyContent: "center" }, false: {} } } as const,
});

export const Row = styled(View, {
  name: "Row",
  flexDirection: "row",
  alignItems: "center",
  variants: {
    wrap: { true: { flexWrap: "wrap" }, false: {} },
    fill: { true: { flex: 1 }, false: {} },
    between: { true: { justifyContent: "space-between" }, false: {} },
    top: { true: { alignItems: "flex-start" }, false: {} },
  } as const,
});

export const Spacer = styled(View, { name: "Spacer", flex: 1 });

/** A hairline in the theme's subtle line color; `strong` for a boundary that must stay visible. */
export const Divider = styled(View, {
  name: "Divider",
  height: 1,
  alignSelf: "stretch",
  backgroundColor: "borderColor",
  variants: {
    strong: { true: { backgroundColor: "borderColorStrong" }, false: {} },
    gold: { true: { backgroundColor: "goldRule", height: 2 }, false: {} },
    vertical: { true: { height: "auto", width: 1, alignSelf: "stretch" }, false: {} },
  } as const,
});
