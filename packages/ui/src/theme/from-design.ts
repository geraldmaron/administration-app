// @admin/design is the one source of every value the player draws with. This
// file projects it into the shape Tamagui reads: numeric scales become
// tokens, and each surface role becomes a theme whose keys are the same in
// every theme, so a component names a role ("surface", "accent") and the
// theme it sits under decides the color.

import {
  classification,
  desk,
  deskRadius,
  deskShadow,
  deskType,
  divergingPalettes,
  layout,
  partyPalettes,
  COLOR_VISIONS,
  type ColorVision,
  type DeskRoles,
  space,
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
  chip: deskRadius.xs,
  control: deskRadius.sm,
  card: deskRadius.md,
  sheet: deskRadius.lg,
  pill: deskRadius.pill,
} as const;

export const zIndexScale = { 0: 0, raised: 10, nav: 50, sheet: 100, toast: 200 } as const;

const px = (style: keyof typeof deskType.style) => deskType.style[style].size * REM;
const leadingPx = (style: keyof typeof deskType.style) => deskType.style[style].leading * REM;

/** Type sizes in px from the rem roles; the player's text size scales the root, not each role. */
export const fontSize = {
  caption: px("caption"),
  label: px("label"),
  body: px("body"),
  title: px("title"),
  heading: px("heading"),
  display: px("pageTitle"),
  figure: px("figure"),
  figureXl: px("figureXl"),
  headline: px("headline"),
  voice: px("voice"),
  hero: px("hero"),
  document: px("document"),
  clock: px("clock"),
  code: px("code"),
  true: px("body"),
} as const;

/** Line heights in px for each size, from the same style table. */
export const lineHeight = {
  caption: leadingPx("caption"),
  label: leadingPx("label"),
  body: leadingPx("body"),
  title: leadingPx("title"),
  heading: leadingPx("heading"),
  display: leadingPx("pageTitle"),
  figure: leadingPx("figure"),
  figureXl: leadingPx("figureXl"),
  headline: leadingPx("headline"),
  voice: leadingPx("voice"),
  hero: leadingPx("hero"),
  document: leadingPx("document"),
  clock: leadingPx("clock"),
  code: leadingPx("code"),
  true: leadingPx("body"),
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
  /** A selected row or card's fill; the selection also carries a 2px accent edge or ring. */
  selected: string;
  /** The top light that lifts a plane off the ground instead of a border. */
  highlight: string;
  /** The command bar and dock: translucent over the ground so the attention light reads through. */
  glass: string;
  /** The attention light behind the work plane, per state; transparent where it must not show (contrast themes). */
  attentionClear: string;
  attentionWaiting: string;
  attentionHeld: string;
  /** The attention pip and its word in the command bar. */
  attentionClearPip: string;
  attentionWaitingPip: string;
  attentionHeldPip: string;
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
  /** Text and icons on `dangerFill`; its own role, because a zone that re-maps `accentInk` for its own fill must not re-ink the red one. */
  dangerInk: string;
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

/** The cool and warm step either side of the middle: strong enough to read on white and on navy alike. */
const COOL_STEP = 1;
const WARM_STEP = 5;

function divergeOf(vision: ColorVision): { readonly divergeCool: string; readonly divergeWarm: string } {
  const ramp = divergingPalettes[vision];
  return { divergeCool: ramp[COOL_STEP], divergeWarm: ramp[WARM_STEP] };
}

/** The desk's roles under the names every component already reads. */
function rolesOf(d: DeskRoles, shadow: string, scheme: "day" | "night"): ThemeRoles {
  return {
    background: d.plane,
    backgroundHover: d.raisedHover,
    backgroundPress: d.pressed,
    backgroundFocus: d.raisedHover,
    backgroundStrong: d.ground,
    surface: d.plane,
    surfaceRaised: d.raised,
    surfaceHover: d.raisedHover,
    color: d.ink,
    colorHover: d.ink,
    colorPress: d.ink,
    colorFocus: d.ink,
    colorSecondary: d.ink2,
    colorTertiary: d.ink3,
    colorDisabled: d.inkDisabled,
    borderColor: d.line,
    borderColorHover: d.lineStrong,
    borderColorFocus: d.focus,
    borderColorPress: d.lineStrong,
    borderColorStrong: d.lineStrong,
    outlineColor: d.focus,
    placeholderColor: d.ink3,
    shadowColor: shadow,
    selected: d.selected,
    // Native draws the top light as a border, not an inset shadow; on a white day plane a white edge would read as a gap, so day takes the hairline.
    highlight: scheme === "day" ? d.line : d.highlight,
    glass: d.glass,
    attentionClear: d.attentionClear,
    attentionWaiting: d.attentionWaiting,
    attentionHeld: d.attentionHeld,
    attentionClearPip: d.attentionClearPip,
    attentionWaitingPip: d.attentionWaitingPip,
    attentionHeldPip: d.attentionHeldPip,
    accent: d.signal,
    accentFill: d.signalFill,
    accentFillHover: d.signalFillHover,
    accentInk: d.onSignal,
    gold: d.brass,
    goldRule: d.brass,
    goldFill: d.brassFill,
    goldInk: d.onBrass,
    danger: d.alarm,
    dangerFill: d.alarmFill,
    dangerFillHover: d.alarmFillHover,
    dangerInk: d.onAlarm,
    dangerSoft: d.dangerWash,
    infoInk: d.info,
    infoFill: d.infoWash,
    successInk: d.success,
    successFill: d.successWash,
    warningInk: d.warning,
    warningFill: d.warningWash,
    pendingInk: d.pending,
    pendingFill: d.pendingWash,
    chromeBackground: d.plane,
    chromeColor: d.ink,
    chromeSecondary: d.ink2,
    chromeBorder: d.line,
    partyDem: d.partyDem,
    partyRep: d.partyRep,
    partyInd: d.partyInd,
    ...divergeOf("standard"),
    goodInk: d.success,
    badInk: d.alarm,
  };
}

export const light: ThemeRoles = rolesOf(desk.day, deskShadow.day.lift1, "day");
export const darkTheme: ThemeRoles = rolesOf(desk.night, deskShadow.night.lift1, "night");
const lightContrast: ThemeRoles = rolesOf(desk.dayContrast, deskShadow.day.lift1, "day");
const darkContrast: ThemeRoles = rolesOf(desk.nightContrast, deskShadow.night.lift1, "night");

/** The command bar and the mode navigation: glass over the ground, the desk's own inks. */
function chromeOf(base: ThemeRoles): ThemeRoles {
  return { ...base, background: base.glass };
}

/** Issued documents: paper in the fiction under either theme. Actions turn to ink, so a button on paper reads as print. */
function paperOf(base: ThemeRoles, d: DeskRoles): ThemeRoles {
  return {
    ...base,
    background: d.paper,
    backgroundHover: d.paper,
    backgroundStrong: d.paper,
    surface: d.paper,
    surfaceRaised: d.paper,
    surfaceHover: d.paper,
    color: d.paperInk,
    colorHover: d.paperInk,
    colorPress: d.paperInk,
    colorFocus: d.paperInk,
    colorSecondary: d.paperInk2,
    colorTertiary: d.paperInk2,
    placeholderColor: d.paperInk2,
    borderColor: d.paperRule,
    borderColorHover: d.paperRuleStrong,
    borderColorPress: d.paperRuleStrong,
    borderColorStrong: d.paperRuleStrong,
    borderColorFocus: d.paperInk,
    outlineColor: d.paperInk,
    selected: d.paperRule,
    highlight: d.paper,
    // The desk's red fill is lightened at night; on paper a destructive act takes the deepest red so the paper-colored label holds.
    dangerFill: desk.dayContrast.alarmFill,
    dangerFillHover: desk.dayContrast.alarmFillHover,
    dangerInk: d.paper,
    accent: d.paperInk,
    accentFill: d.paperInk,
    accentFillHover: d.paperInk2,
    accentInk: d.paper,
    gold: d.paperInk,
    goldRule: d.paperRuleStrong,
    goldFill: d.paperInk,
    goldInk: d.paper,
  };
}

/** The watch floor: classified material, crises, the command picture. Dark in every theme; amber is its signal. */
function situationOf(base: ThemeRoles, d: DeskRoles): ThemeRoles {
  return {
    ...base,
    background: d.situationPlane,
    // Hover lifts toward the dark desk's own hover tint; the situation rule is a line color and, in the contrast themes, white.
    backgroundHover: base.surfaceHover,
    backgroundPress: base.backgroundPress,
    backgroundFocus: base.surfaceHover,
    backgroundStrong: d.situationGround,
    surface: d.situationPlane,
    surfaceRaised: d.situationPlane,
    surfaceHover: base.surfaceHover,
    color: d.situationInk,
    colorHover: d.situationInk,
    colorPress: d.situationInk,
    colorFocus: d.situationInk,
    colorSecondary: d.situationInk2,
    colorTertiary: d.situationInk2,
    placeholderColor: d.situationInk2,
    borderColor: d.situationLine,
    borderColorStrong: d.situationInk2,
    borderColorFocus: d.situationAccent,
    outlineColor: d.situationAccent,
    highlight: d.situationLine,
    accent: d.situationAccent,
    // The room's one primary action is amber, not the desk's blue, with a dark label.
    accentFill: d.situationActionFill,
    accentFillHover: d.situationActionFillHover,
    accentInk: d.onSituationAction,
    gold: d.situationAccent,
    goldRule: d.situationAccent,
  };
}

/** The map and spatial views: the deepest ground as the plane, so overlays and data colors read. */
function theaterOf(base: ThemeRoles): ThemeRoles {
  // On the day ground the strong rule falls under 3:1, so a control edge in the theater takes the tertiary ink, which holds on both grounds.
  return { ...base, background: base.backgroundStrong, surface: base.backgroundStrong, borderColorStrong: base.colorTertiary };
}

const baseThemes = {
  light,
  dark: darkTheme,
  light_contrast: lightContrast,
  dark_contrast: darkContrast,
  light_chrome: chromeOf(light),
  dark_chrome: chromeOf(darkTheme),
  light_contrast_chrome: chromeOf(lightContrast),
  dark_contrast_chrome: chromeOf(darkContrast),
  light_paper: paperOf(light, desk.day),
  dark_paper: paperOf(darkTheme, desk.night),
  light_contrast_paper: paperOf(lightContrast, desk.dayContrast),
  dark_contrast_paper: paperOf(darkContrast, desk.nightContrast),
  light_situation: situationOf(darkTheme, desk.day),
  dark_situation: situationOf(darkTheme, desk.night),
  light_contrast_situation: situationOf(darkContrast, desk.dayContrast),
  dark_contrast_situation: situationOf(darkContrast, desk.nightContrast),
  light_theater: theaterOf(light),
  dark_theater: theaterOf(darkTheme),
  light_contrast_theater: theaterOf(lightContrast),
  dark_contrast_theater: theaterOf(darkContrast),
} as const satisfies Record<string, ThemeRoles>;

type BaseThemeKey = keyof typeof baseThemes;
type Section = "chrome" | "paper" | "situation" | "theater";
type VisionName = Exclude<ColorVision, "standard">;
type VisionThemeKey<K extends string> = K extends `${infer Head}_${Section}` ? `${Head}_${VisionName}_${Section}` : `${K}_${VisionName}`;

const SECTIONS: readonly string[] = ["chrome", "paper", "situation", "theater"];
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

/** The page's own theme under a section: `dark_protan_chrome` is drawn as `dark_protan`. A layer that leaves its section (a sheet) takes this one. */
export function pageThemeOf(name: string): string {
  return name
    .split("_")
    .filter((part) => !SECTIONS.includes(part))
    .join("_");
}

export type ThemeKey = keyof typeof themes;

export { classification };
