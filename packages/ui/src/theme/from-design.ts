// @admin/design is the one source of every value the player draws with. This
// file projects it into the shape Tamagui reads: numeric scales become
// tokens, and each surface role becomes a theme whose keys are the same in
// every theme, so a component names a role ("surface", "accent") and the
// theme it sits under decides the color.

import {
  anchor,
  chrome,
  classification,
  dark,
  darkHighContrast,
  ground,
  highContrast,
  layout,
  line,
  paper,
  paperDark,
  partyPalettes,
  divergingPalettes,
  COLOR_VISIONS,
  type ColorVision,
  radius,
  situation,
  space,
  status,
  text,
  typography,
} from "@admin/design";

const REM = 16;

export const spaceScale = {
  0: 0,
  "2xs": space["2xs"],
  xs: space.xs,
  sm: space.sm,
  md: space.md,
  lg: space.lg,
  xl: space.xl,
  "2xl": space["2xl"],
  "3xl": space["3xl"],
} as const;

export const sizeScale = {
  0: 0,
  hit: layout.hitMin,
  control: layout.control,
  compact: layout.controlCompact,
  bar: layout.barDesktop,
  barPhone: layout.barPhone,
  tab: layout.tabBar,
  rail: layout.rail,
  nav: layout.nav,
  inspector: layout.inspector,
  measure: layout.measure,
} as const;

export const radiusScale = {
  0: 0,
  chip: radius.chip,
  control: radius.control,
  card: radius.card,
  sheet: radius.sheet,
  pill: radius.pill,
} as const;

export const zIndexScale = { 0: 0, raised: 10, nav: 50, sheet: 100, toast: 200 } as const;

/** Type sizes in px from the rem roles; the player's text size scales the root, not each role. */
export const fontSize = {
  caption: typography.size.caption * REM,
  label: typography.size.label * REM,
  body: typography.size.body * REM,
  title: typography.size.title * REM,
  heading: typography.size.heading * REM,
  display: 2 * REM,
  figure: typography.size.figure * REM,
  hero: 3 * REM,
  document: typography.size.document * REM,
  true: typography.size.body * REM,
} as const;

/** Every theme carries exactly these keys; a missing key would be a color a component silently loses. */
export type ThemeRoles = {
  background: string;
  backgroundHover: string;
  backgroundPress: string;
  backgroundFocus: string;
  backgroundStrong: string;
  surface: string;
  surfaceRaised: string;
  surfaceHover: string;
  color: string;
  colorHover: string;
  colorPress: string;
  colorFocus: string;
  colorSecondary: string;
  colorTertiary: string;
  colorDisabled: string;
  borderColor: string;
  borderColorHover: string;
  borderColorFocus: string;
  borderColorPress: string;
  borderColorStrong: string;
  outlineColor: string;
  placeholderColor: string;
  shadowColor: string;
  accent: string;
  accentFill: string;
  accentFillHover: string;
  accentInk: string;
  gold: string;
  goldRule: string;
  /** The gold fill of a primary ceremonial act and its navy ink, the same in every theme so the seal reads one way. */
  goldFill: string;
  goldInk: string;
  danger: string;
  dangerFill: string;
  dangerFillHover: string;
  /** The pale danger wash a reading cell or a notice sits on; ink stays the theme's text. */
  dangerSoft: string;
  infoInk: string;
  infoFill: string;
  successInk: string;
  successFill: string;
  warningInk: string;
  warningFill: string;
  pendingInk: string;
  pendingFill: string;
  chromeBackground: string;
  chromeColor: string;
  chromeSecondary: string;
  chromeBorder: string;
  partyDem: string;
  partyRep: string;
  partyInd: string;
  /** The two ends of a diverging scale (a lean left or right, a move for or against): the standard pair, rewritten per color-vision setting. */
  divergeCool: string;
  divergeWarm: string;
  /** A move for or against the President as a data ink: success and danger on the standard palette, the diverging pair under a color-vision setting, where green and red would not separate. */
  goodInk: string;
  badInk: string;
};

const sharedChrome = {
  chromeBackground: chrome.navy,
  chromeColor: chrome.text,
  chromeSecondary: chrome.secondary,
  chromeBorder: chrome.border,
};

const party = {
  partyDem: partyPalettes.standard.democrat,
  partyRep: partyPalettes.standard.republican,
  partyInd: partyPalettes.standard.independent,
};

/** The cool and warm step either side of the middle: strong enough to read on white and on navy alike. */
const COOL_STEP = 1;
const WARM_STEP = 5;

function divergeOf(vision: ColorVision): { readonly divergeCool: string; readonly divergeWarm: string } {
  const ramp = divergingPalettes[vision];
  return { divergeCool: ramp[COOL_STEP], divergeWarm: ramp[WARM_STEP] };
}

export const light: ThemeRoles = {
  background: ground.base,
  backgroundHover: ground.raisedHover,
  backgroundPress: ground.overlayHover,
  backgroundFocus: ground.raisedHover,
  backgroundStrong: ground.abyss,
  surface: ground.base,
  surfaceRaised: ground.raised,
  surfaceHover: ground.raisedHover,
  color: text.primary,
  colorHover: text.primary,
  colorPress: text.primary,
  colorFocus: text.primary,
  colorSecondary: text.secondary,
  colorTertiary: text.tertiary,
  colorDisabled: text.disabled,
  borderColor: line.subtle,
  borderColorHover: line.strong,
  borderColorFocus: line.focus,
  borderColorPress: line.strong,
  borderColorStrong: line.strong,
  outlineColor: line.focus,
  placeholderColor: text.tertiary,
  shadowColor: "rgba(11, 20, 36, 0.14)",
  accent: anchor.blue,
  accentFill: anchor.blueFill,
  accentFillHover: anchor.blueFillHover,
  accentInk: anchor.white,
  gold: anchor.gold,
  goldRule: anchor.goldDeep,
  goldFill: dark.anchor.gold,
  goldInk: text.onLight,
  danger: anchor.red,
  dangerFill: anchor.redFill,
  dangerFillHover: anchor.redFillHover,
  dangerSoft: status.danger.fill,
  infoInk: status.info.ink,
  infoFill: status.info.fill,
  successInk: status.success.ink,
  successFill: status.success.fill,
  warningInk: status.warning.ink,
  warningFill: status.warning.fill,
  pendingInk: status.pending.ink,
  pendingFill: status.pending.fill,
  ...sharedChrome,
  ...party,
  ...divergeOf("standard"),
  goodInk: status.success.ink,
  badInk: anchor.red,
};

export const darkTheme: ThemeRoles = {
  background: dark.ground.base,
  backgroundHover: dark.ground.raisedHover,
  backgroundPress: dark.ground.overlayHover,
  backgroundFocus: dark.ground.raisedHover,
  backgroundStrong: dark.ground.abyss,
  surface: dark.ground.base,
  surfaceRaised: dark.ground.raised,
  surfaceHover: dark.ground.raisedHover,
  color: dark.text.primary,
  colorHover: dark.text.primary,
  colorPress: dark.text.primary,
  colorFocus: dark.text.primary,
  colorSecondary: dark.text.secondary,
  colorTertiary: dark.text.tertiary,
  colorDisabled: dark.text.disabled,
  borderColor: dark.line.subtle,
  borderColorHover: dark.line.strong,
  borderColorFocus: dark.line.focus,
  borderColorPress: dark.line.strong,
  borderColorStrong: dark.line.strong,
  outlineColor: dark.line.focus,
  placeholderColor: dark.text.tertiary,
  shadowColor: "rgba(0, 0, 0, 0.45)",
  accent: dark.anchor.blue,
  accentFill: dark.anchor.blueFill,
  accentFillHover: dark.anchor.blueFillHover,
  accentInk: dark.anchor.white,
  gold: dark.anchor.gold,
  goldRule: dark.anchor.goldDeep,
  goldFill: dark.anchor.gold,
  goldInk: text.onLight,
  danger: dark.anchor.red,
  dangerFill: dark.anchor.redFill,
  dangerFillHover: dark.anchor.redFillHover,
  dangerSoft: dark.status.danger.fill,
  infoInk: dark.status.info.ink,
  infoFill: dark.status.info.fill,
  successInk: dark.status.success.ink,
  successFill: dark.status.success.fill,
  warningInk: dark.status.warning.ink,
  warningFill: dark.status.warning.fill,
  pendingInk: dark.status.pending.ink,
  pendingFill: dark.status.pending.fill,
  ...sharedChrome,
  chromeBackground: dark.ground.abyss,
  partyDem: "#55B4F2",
  partyRep: "#F0625C",
  partyInd: "#B9B2A3",
  ...divergeOf("standard"),
  goodInk: dark.status.success.ink,
  badInk: dark.anchor.red,
};

const lightContrast: ThemeRoles = {
  ...light,
  colorSecondary: highContrast.textSecondary,
  colorTertiary: highContrast.textTertiary,
  borderColor: highContrast.lineSubtle,
  borderColorStrong: highContrast.lineStrong,
};

const darkContrast: ThemeRoles = {
  ...darkTheme,
  colorSecondary: darkHighContrast.textSecondary,
  colorTertiary: darkHighContrast.textTertiary,
  borderColor: darkHighContrast.lineSubtle,
  borderColorStrong: darkHighContrast.lineStrong,
};

/** The navy masthead and navigation. */
function chromeOf(base: ThemeRoles): ThemeRoles {
  return {
    ...base,
    background: base.chromeBackground,
    backgroundHover: chrome.navyHover,
    backgroundPress: chrome.navyHover,
    backgroundFocus: chrome.navyHover,
    surface: base.chromeBackground,
    surfaceRaised: chrome.navyHover,
    surfaceHover: chrome.navyHover,
    color: chrome.text,
    colorHover: chrome.text,
    colorPress: chrome.text,
    colorFocus: chrome.text,
    colorSecondary: chrome.secondary,
    colorTertiary: chrome.secondary,
    borderColor: chrome.border,
    borderColorStrong: chrome.border,
    outlineColor: chrome.focus,
    accent: chrome.focus,
    gold: dark.anchor.gold,
  };
}

/** Issued documents: paper in the fiction under either theme. */
function paperOf(base: ThemeRoles, sheet: { surface: string; ink: string; rule: string }): ThemeRoles {
  return {
    ...light,
    background: sheet.surface,
    surface: sheet.surface,
    surfaceRaised: sheet.surface,
    color: sheet.ink,
    colorHover: sheet.ink,
    colorPress: sheet.ink,
    colorFocus: sheet.ink,
    borderColor: sheet.rule,
    borderColorStrong: sheet.ink,
    chromeBackground: base.chromeBackground,
  };
}

/** The watch floor: classified documents, crises, the command picture. */
const situationRoles: ThemeRoles = {
  ...darkTheme,
  background: situation.ground,
  backgroundHover: situation.raisedHover,
  backgroundPress: situation.raisedHover,
  backgroundFocus: situation.raisedHover,
  backgroundStrong: "#000000",
  surface: situation.surface,
  surfaceRaised: situation.raised,
  surfaceHover: situation.raisedHover,
  color: situation.text,
  colorHover: situation.text,
  colorPress: situation.text,
  colorFocus: situation.text,
  colorSecondary: situation.secondary,
  colorTertiary: situation.tertiary,
  borderColor: situation.line,
  borderColorStrong: situation.lineStrong,
  borderColorFocus: situation.focus,
  outlineColor: situation.focus,
  accent: situation.accent,
  accentFill: situation.accentFill,
  accentFillHover: situation.accent,
  accentInk: "#06090F",
  danger: situation.alert,
  badInk: situation.alert,
  gold: situation.accent,
};

const baseThemes = {
  light,
  dark: darkTheme,
  light_contrast: lightContrast,
  dark_contrast: darkContrast,
  light_chrome: chromeOf(light),
  dark_chrome: chromeOf(darkTheme),
  light_contrast_chrome: chromeOf(lightContrast),
  dark_contrast_chrome: chromeOf(darkContrast),
  light_paper: paperOf(light, paper),
  dark_paper: paperOf(darkTheme, paperDark),
  light_contrast_paper: paperOf(lightContrast, paper),
  dark_contrast_paper: paperOf(darkContrast, paperDark),
  light_situation: situationRoles,
  dark_situation: situationRoles,
  light_contrast_situation: situationRoles,
  dark_contrast_situation: situationRoles,
} as const satisfies Record<string, ThemeRoles>;

type BaseThemeKey = keyof typeof baseThemes;
type Section = "chrome" | "paper" | "situation";
type VisionName = Exclude<ColorVision, "standard">;
type VisionThemeKey<K extends string> = K extends `${infer Head}_${Section}` ? `${Head}_${VisionName}_${Section}` : `${K}_${VisionName}`;

const SECTIONS: readonly string[] = ["chrome", "paper", "situation"];
const VISIONS: readonly VisionName[] = COLOR_VISIONS.filter((vision): vision is VisionName => vision !== "standard");

/** Tamagui resolves a nested `<Theme name="protan">` by appending it to the parent's name, ahead of any section (`dark_protan_chrome`), so every base theme gets one variant per vision and a section keeps the party inks. */
function visionKey(key: string, vision: VisionName): string {
  const parts = key.split("_");
  const last = parts[parts.length - 1] ?? "";
  return SECTIONS.includes(last) ? [...parts.slice(0, -1), vision, last].join("_") : `${key}_${vision}`;
}

function visionThemes(): { readonly [K in BaseThemeKey as VisionThemeKey<K>]: ThemeRoles } {
  const out: Record<string, ThemeRoles> = {};
  for (const vision of VISIONS) {
    const palette = partyPalettes[vision];
    for (const [key, roles] of Object.entries(baseThemes)) {
      const ends = divergeOf(vision);
      out[visionKey(key, vision)] = { ...roles, partyDem: palette.democrat, partyRep: palette.republican, partyInd: palette.independent, ...ends, goodInk: ends.divergeCool, badInk: ends.divergeWarm };
    }
  }
  return out as { readonly [K in BaseThemeKey as VisionThemeKey<K>]: ThemeRoles };
}

export const themes = { ...baseThemes, ...visionThemes() };

export type ThemeKey = keyof typeof themes;

export { classification };
