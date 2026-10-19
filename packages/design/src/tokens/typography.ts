// The type system, from docs/DESIGN.md.
//
// Source Sans 3 carries the application: titles, labels, readings, controls
// and data, with tabular numerals wherever a figure sits in a column or
// moves. Source Serif 4 carries documents that are paper in the fiction (an
// issued order, a dispatch, the oath) at a reading size with a longer
// leading. Monospace is the system stack, for codes a player may copy. Sizes
// are rem so the player's own text size scales everything; each role has its
// size and leading from the role table in DESIGN.md.

export const typography = {
  family: {
    display: "Source Sans 3",
    sans: "Source Sans 3",
    serif: "Source Serif 4",
    mono: "ui-monospace",
  },
  weight: {
    regular: 400,
    medium: 600,
    strong: 700,
  },
  /** rem. Metadata 12, compact data 14, body and controls 16, subheading 18, panel heading 22, primary figure 36, formal reading 18. */
  size: {
    caption: 0.75,
    label: 0.875,
    small: 0.875,
    body: 1,
    title: 1.125,
    heading: 1.375,
    figure: 2.25,
    document: 1.125,
  },
  /** Page titles grow with the viewport; the title screen's name is larger. */
  fluid: {
    display: "clamp(1.75rem, 1.25rem + 1.5vw, 2.5rem)",
    hero: "clamp(2.25rem, 1.75rem + 1.5vw, 3rem)",
  },
  leading: {
    tight: 1.15,
    snug: 1.3,
    body: 1.5,
    compact: 1.4286,
    control: 1.25,
    document: 1.5556,
  },
  /** em. */
  tracking: {
    display: -0.025,
    normal: 0,
    eyebrow: 0.04,
  },
} as const;

export type TypographyToken = typeof typography;
