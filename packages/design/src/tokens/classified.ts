// Classified material and the situation room.
//
// The banner colors follow the convention U.S. agencies use for classified
// cover sheets and banner lines (SF 703/704/705 and the marking guidance in
// 32 C.F.R. part 2001): green unclassified, blue confidential, red secret,
// orange top secret, yellow for compartmented top secret. A player who has
// seen one recognizes the level before reading it, which is the point of
// the convention. Each `fill` carries its `ink` at 4.5:1 or better.

export type ClassificationMark = { readonly fill: string; readonly ink: string; readonly label: string; readonly portion: string };

export const classification = {
  unclassified: { fill: "#007A33", ink: "#FFFFFF", label: "UNCLASSIFIED", portion: "U" },
  cui: { fill: "#502B85", ink: "#FFFFFF", label: "CUI", portion: "CUI" },
  confidential: { fill: "#0033A0", ink: "#FFFFFF", label: "CONFIDENTIAL", portion: "C" },
  secret: { fill: "#C8102E", ink: "#FFFFFF", label: "SECRET", portion: "S" },
  topSecret: { fill: "#B34700", ink: "#FFFFFF", label: "TOP SECRET", portion: "TS" },
  topSecretSci: { fill: "#FCE83A", ink: "#1B1B1B", label: "TOP SECRET//SCI", portion: "TS//SCI" },
} as const satisfies Readonly<Record<string, ClassificationMark>>;

export type ClassificationKey = keyof typeof classification;

/**
 * The situation room: the surface a classified document, a crisis and the
 * command picture sit on. Near-black so the banner colors and the map's
 * readings carry, with an amber ink that reads as a watch floor rather than
 * as the everyday workspace.
 */
export const situation = {
  ground: "#06090F",
  surface: "#0E141F",
  raised: "#152033",
  raisedHover: "#1C2A42",
  text: "#EDE6D3",
  secondary: "#B9B09A",
  tertiary: "#8E8775",
  line: "#2F3A4E",
  lineStrong: "#5B6A86",
  accent: "#F2B33D",
  accentFill: "#C98A12",
  alert: "#FF5A5F",
  focus: "#FFD27A",
} as const;

/** Paper under the dark theme: still paper in the fiction, dimmed so it does not glare. */
export const paperDark = {
  surface: "#E7E1D1",
  ink: "#1B1B1B",
  rule: "#B4AA8F",
} as const;
