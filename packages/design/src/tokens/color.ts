// The player's color: light analytical surfaces under navy institutional
// chrome, with paper for issued documents and a dark theater for the map.
//
// Each surface role has one job:
//   canvas and surface   the work: light, so long reading and dense data stay legible
//   chrome               navy masthead and navigation, the institution's frame
//   paper                documents that are paper in the fiction
//   theater              the map, dark so overlays and data colors read
// The anchors keep one meaning each: blue for selection and action, gold for
// identity (rules, the seal, "you are here"), red for danger, failure and
// force. Status pairs carry state; party and data colors are separate
// palettes with their own checks. tokens.css is the web projection of these
// values; parity.test.ts holds the two together.

/** Light grounds, the canvas behind everything first. A work area is `base`; a row or card inside it is `raised`. */
export const ground = {
  abyss: "#E8EDF5",
  sunken: "#F1F5FB",
  base: "#FFFFFF",
  raised: "#F5F8FD",
  raisedHover: "#EAF0FA",
  overlay: "#FFFFFF",
  overlayHover: "#EDF2FC",
} as const;

export const text = {
  primary: "#14223B",
  secondary: "#485971",
  tertiary: "#52627A",
  /** A disabled control's label; its explanation is set in `secondary`, never in this. */
  disabled: "#8A9099",
  /** Ink on a light fill wherever the surrounding surface is dark: a gold chip in the masthead. */
  onLight: "#14223B",
} as const;

/** The anchors on light surfaces. A `fill` carries white text at AA; the plain value is a mark or text. */
export const anchor = {
  blue: "#2457D6",
  blueFill: "#2457D6",
  blueFillHover: "#1944B0",
  /** Gold as ink: an institutional label on a light surface. */
  gold: "#76571E",
  /** Gold as a rule or insignia, never text and never a warning. */
  goldDeep: "#C6AA72",
  red: "#B42346",
  redFill: "#B42346",
  redFillHover: "#941C39",
  white: "#FFFFFF",
} as const;

export const line = {
  /** Decoration only: a divider whose loss loses nothing. */
  subtle: "#D9E2F0",
  /** A boundary that must stay visible: a field, a control, a table frame. */
  strong: "#718097",
  focus: "#2457D6",
} as const;

/** Issued documents. */
export const paper = {
  surface: "#F8F6EF",
  ink: "#1B1B1B",
  rule: "#C9C0A8",
} as const;

/** The navy masthead and navigation. */
export const chrome = {
  navy: "#0B1424",
  navyHover: "#172D4F",
  text: "#FFFFFF",
  secondary: "#C4CFDA",
  border: "#6B839C",
  focus: "#9CC4FF",
} as const;

/** Map overlays and the map's own controls. */
export const theater = {
  surface: "#14273E",
  text: "#F2F5F7",
  secondary: "#C4CFDA",
  interactive: "#73B3F4",
  border: "#6B839C",
} as const;

export type StatusPair = { readonly ink: string; readonly fill: string };

/** State, never severity of a category: pending and unknown share a neutral pair and differ by label and icon. */
export const status = {
  info: { ink: "#2457D6", fill: "#EAF0FF" },
  pending: { ink: "#485971", fill: "#EDF1F7" },
  success: { ink: "#176544", fill: "#E9F5EE" },
  warning: { ink: "#795016", fill: "#FFF4DD" },
  danger: { ink: "#B42346", fill: "#FCEAF0" },
  unknown: { ink: "#485971", fill: "#EDF1F7" },
} as const satisfies Readonly<Record<string, StatusPair>>;

/**
 * The dark set, applied under `data-surface="dark"`: the map theater, the
 * title screen and anything laid over the map. These are the values the
 * player was first built on, kept so the map's overlays keep their contrast.
 */
export const dark = {
  ground: {
    abyss: "#040811",
    sunken: "#080E18",
    base: "#101B2B",
    raised: "#19283E",
    raisedHover: "#223651",
    overlay: "#1D2E46",
    overlayHover: "#283E5B",
  },
  text: {
    primary: "#F3F6FC",
    secondary: "#C3CDE4",
    tertiary: "#98A8CC",
    disabled: "#5F6C8C",
    onLight: "#101B2B",
  },
  anchor: {
    blue: "#94B8FF",
    blueFill: "#315FD5",
    blueFillHover: "#284FBB",
    gold: "#E4C58A",
    goldDeep: "#A9843A",
    red: "#FF9AB1",
    redFill: "#C42F3C",
    redFillHover: "#AE2734",
    white: "#FFFFFF",
  },
  line: {
    subtle: "#30435E",
    strong: "#6B80B6",
    focus: "#9CC4FF",
  },
  /**
   * The light set's status inks are dark on pale fills; on navy they fall
   * under 3:1, and every good-or-bad cue on a dark card went unreadable. These
   * keep the same hues, lightened, on fills dark enough to sit on a card.
   */
  status: {
    info: { ink: "#94B8FF", fill: "#16305E" },
    pending: { ink: "#B5C0D8", fill: "#1A2747" },
    success: { ink: "#6FD69B", fill: "#123A2C" },
    warning: { ink: "#F2C66D", fill: "#3A2E12" },
    danger: { ink: "#FF9AB1", fill: "#3D1A2A" },
    unknown: { ink: "#B5C0D8", fill: "#1A2747" },
  },
} as const;

export type PartyPalette = {
  readonly democrat: string;
  readonly republican: string;
  readonly independent: string;
};

/**
 * Party color on light surfaces, per color-vision setting. Deep enough to
 * hold 4.5:1 on white so a seat graphic and its label agree; under protan and
 * deutan the Republican hue turns toward orange, under tritan the Democratic
 * hue toward teal.
 */
export const partyPalettes = {
  standard: { democrat: "#1F6FB5", republican: "#C0352B", independent: "#6F6A5E" },
  protan: { democrat: "#1F6FB5", republican: "#A35200", independent: "#6F6A5E" },
  deutan: { democrat: "#1F6FB5", republican: "#A35200", independent: "#6F6A5E" },
  tritan: { democrat: "#00737F", republican: "#C0352B", independent: "#6F6A5E" },
} as const satisfies Readonly<Record<string, PartyPalette>>;

/** Party color on the dark map, per color-vision setting: lighter, so a seat never sinks into the navy. */
export const mapPartyPalettes = {
  standard: { democrat: "#55B4F2", republican: "#F0625C", independent: "#B9B2A3" },
  protan: { democrat: "#5AA9F5", republican: "#F0943C", independent: "#C9C3B6" },
  deutan: { democrat: "#5AA9F5", republican: "#F0943C", independent: "#C9C3B6" },
  tritan: { democrat: "#3FC6D6", republican: "#F0625C", independent: "#C9C3B6" },
} as const satisfies Readonly<Record<string, PartyPalette>>;

export type ColorVision = keyof typeof partyPalettes;

export const COLOR_VISIONS = Object.keys(partyPalettes) as readonly ColorVision[];

/** Seven steps, lightness first, from a deep federal blue through teal to gold: a value reads from dark to light on any color vision, and every step is deep and saturated, so a filled region reads as rich rather than washed. The low end stays clear of the land, so a small value never reads as no reading. */
export const sequential = ["#3A58CC", "#3268DA", "#2A82E0", "#1AA3C4", "#2DB889", "#C9AE22", "#F0C02A"] as const;

/**
 * Diverging around a neutral middle, per color vision. Negative is the Democratic side by convention.
 * Each pair of steps shares one perceptual lightness, so neither end of a scale reads dimmer
 * than the other, and lightness climbs from the middle out. Every step is deep and saturated:
 * the strongest reading is the most vivid one, and none reaches the pale end, because a whole
 * state filled in a pale step reads as washed out. The middle is a muted violet that recedes,
 * lighter than the land so an even state still reads as lit.
 */
export const divergingPalettes = {
  standard: ["#5294F8", "#3A76EA", "#3360D4", "#665B93", "#C2392E", "#E04B37", "#F0644A"],
  protan: ["#5294F8", "#3A76EA", "#3360D4", "#665B93", "#98591A", "#B06E1C", "#CC8626"],
  deutan: ["#5294F8", "#3A76EA", "#3360D4", "#665B93", "#98591A", "#B06E1C", "#CC8626"],
  tritan: ["#20A0BC", "#1A8CA8", "#167A94", "#665B93", "#C2392E", "#E04B37", "#F0644A"],
} as const satisfies Readonly<Record<ColorVision, readonly string[]>>;

/** Categories with no order: blocs, sides, series. Distinct by hue and lightness together. */
export const categorical = ["#55B4F2", "#E5BC62", "#F0625C", "#7CD6A8", "#B79CF0", "#F09BC8", "#9AD0E0", "#D9A27A"] as const;

/**
 * The map table: neutral land, no-data dots, the seam between regions, the
 * light pooled in the middle of the sea, the glow along every coast and the
 * graticule scored into the water.
 */
export const mapBoard = {
  land: "#16244E",
  neutral: "#3B4E7E",
  noData: "#2A3760",
  border: "#050C1E",
  /** The light line a border draws over the seam, so a state, a district or a country edge reads on any fill. */
  line: "#8FA3D1",
  seaGlow: "#0D2456",
  coast: "#3F8CFF",
  graticule: "#1A3470",
} as const;

/** What the high-contrast setting (and `prefers-contrast: more`) swaps in on light surfaces: quiet inks and hairlines get louder. */
export const highContrast = {
  textSecondary: text.primary,
  textTertiary: "#3D4249",
  lineSubtle: line.strong,
  lineStrong: "#14223B",
} as const;

/**
 * The same swap for the dark set. The light swap darkens inks, which on navy
 * would sink them, so dark high contrast lightens quiet inks toward primary
 * and brightens the hairlines instead.
 */
export const darkHighContrast = {
  textSecondary: dark.text.primary,
  textTertiary: dark.text.secondary,
  lineSubtle: dark.line.strong,
  lineStrong: "#B5C3E6",
} as const;

export const color = {
  ground,
  text,
  anchor,
  line,
  paper,
  chrome,
  theater,
  status,
  /** Party chroma as a fact about a seat, on a light surface; the standard palette. */
  party: partyPalettes.standard,
  /** The gold of the seal, for the portrait's metal. */
  mark: { gold: dark.anchor.gold },
} as const;

export type ColorToken = typeof color;
