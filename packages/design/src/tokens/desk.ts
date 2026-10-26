// The desk: the universal player's color, type and shape (2026-10-24 design
// system, "The Desk at Night"). The President works on one lit plane in a dark
// room; the room's light says what the desk is asking of them.
//
// Four themes: Night (the design center), Day, and an AAA contrast variant of
// each, so contrast composes with the player's light or dark choice instead of
// replacing it. Each theme is one flat set of roles; the zones a screen nests
// (paper, situation, theater, chrome) re-map those roles in packages/ui.
//
// Three anchors keep one job each: signal (blue) for selection and the primary
// action, brass (gold) for presidential authority and a draft's new value,
// alarm (red) for force and the irreversible. Status is state, never category,
// and success is teal so it never leans on red against green.
//
// The legacy DOM player still draws from color.ts and tokens.css; nothing in
// the universal player reads them for its themes.

export type DeskRoles = {
  /** The room behind everything; the shell's backdrop and the attention light's canvas. Never holds text directly except the page title area. */
  readonly ground: string;
  /** The lit work plane: a Pane's surface, the Inspector, the Drafts tray. Body text sits here. */
  readonly plane: string;
  /** A row, card or field lifted off the plane. */
  readonly raised: string;
  /** Hover and pressed state of anything on `raised`. */
  readonly raisedHover: string;
  /** Popovers, Peek, the command palette and sheets: the top layer. */
  readonly overlay: string;
  /** The command bar and dock: translucent over the ground so the attention light reads through. Text on it is checked against `plane`. */
  readonly glass: string;
  /** A selected row or card's fill; always with a 2px `signal` edge or ring too. */
  readonly selected: string;
  /** A control while pressed. */
  readonly pressed: string;
  /** Hairline between rows. Decoration only: losing it loses nothing. */
  readonly line: string;
  /** A boundary that carries meaning: a field's edge, a control, a table frame. 3:1 on plane and raised. */
  readonly lineStrong: string;
  /** The 1px top light that lifts a plane off the ground instead of a border. */
  readonly highlight: string;
  /** Primary text and figures on ground, plane, raised and overlay. */
  readonly ink: string;
  /** Secondary text: a figure's name, supporting lines. On plane, raised, overlay. */
  readonly ink2: string;
  /** Notes and sources under a value; timestamps. On plane and raised. Never a name. */
  readonly ink3: string;
  /** A disabled control's label only; its reason is set in `ink2`. */
  readonly inkDisabled: string;
  /** Selection, links, the primary action and 'you' in a chart. Text and marks on plane and raised. */
  readonly signal: string;
  /** Primary button and selected segment fill; carries `onSignal`. */
  readonly signalFill: string;
  /** Hover of `signalFill`. */
  readonly signalFillHover: string;
  /** Text and icons on `signalFill`. */
  readonly onSignal: string;
  /** Selected row and focus-within tint. Never behind small text alone; the selection also carries a 2px `signal` edge. */
  readonly signalWash: string;
  /** Presidential authority: the seal, signing, the current stage, 'you are here'. Text and marks on plane and raised. */
  readonly brass: string;
  /** The Sign control and a sealed stamp; carries `onBrass`. */
  readonly brassFill: string;
  /** Text and icons on `brassFill`. */
  readonly onBrass: string;
  /** Force, destruction, irreversibility, a failed save. Text and marks on plane and raised. */
  readonly alarm: string;
  /** A destructive or force-authorizing button; carries `onAlarm`. */
  readonly alarmFill: string;
  /** Hover of `alarmFill`. */
  readonly alarmFillHover: string;
  /** Text on `alarmFill`. */
  readonly onAlarm: string;
  /** The focus ring: 2px solid, 2px offset, on every interactive element. 3:1 on ground, plane and raised. */
  readonly focus: string;
  /** Informational state ink, on plane and on `infoWash`. */
  readonly info: string;
  /** Fill behind an info tag. */
  readonly infoWash: string;
  /** Success, gain, ahead. Teal, off the red-green axis, so it differs from `danger` in hue and lightness. On plane and `successWash`. */
  readonly success: string;
  /** Fill behind a success tag. */
  readonly successWash: string;
  /** Watch state, a clock running short. On plane and `warningWash`. */
  readonly warning: string;
  /** Fill behind a warning tag. */
  readonly warningWash: string;
  /** Failure, loss, behind. On plane and `dangerWash`. */
  readonly danger: string;
  /** Fill behind a danger tag. */
  readonly dangerWash: string;
  /** Draft, pending, unknown: neutral; told apart by its word and dashed edge. */
  readonly pending: string;
  /** Fill behind a pending tag; a draft's row. */
  readonly pendingWash: string;
  /** No ambient light: nothing is waiting. */
  readonly attentionClear: string;
  /** Ambient light while matters wait and time still runs. Ground only, never behind text. */
  readonly attentionWaiting: string;
  /** Ambient light while a matter holds the clock. Ground only. */
  readonly attentionHeld: string;
  /** The attention pip and its word, clear. */
  readonly attentionClearPip: string;
  /** The attention pip and its word, waiting. */
  readonly attentionWaitingPip: string;
  /** The attention pip and its word, held. Always paired with the reason. */
  readonly attentionHeldPip: string;
  /** An issued document's stock. Dimmed at night so it does not glare. */
  readonly paper: string;
  /** Text on `paper`. */
  readonly paperInk: string;
  /** Secondary text on `paper`: dateline, attribution. */
  readonly paperInk2: string;
  /** Hairline rules on paper. */
  readonly paperRule: string;
  /** A signature line or field on paper; 3:1. */
  readonly paperRuleStrong: string;
  /** The situation room's ground. Same in every theme: the room is always dark. */
  readonly situationGround: string;
  /** A pane in the situation zone. */
  readonly situationPlane: string;
  /** Text on `situationPlane`. */
  readonly situationInk: string;
  /** Secondary text on `situationPlane`. */
  readonly situationInk2: string;
  /** The watch-floor amber: the situation zone's signal, on `situationPlane`. */
  readonly situationAccent: string;
  /** Hairlines in the situation zone. */
  readonly situationLine: string;
  /** The situation zone's primary action: the watch-floor amber as a fill; carries `onSituationAction`. */
  readonly situationActionFill: string;
  /** Hover of `situationActionFill`. */
  readonly situationActionFillHover: string;
  /** Text and icons on `situationActionFill`: dark, because white does not hold on amber. */
  readonly onSituationAction: string;
  /** Democratic seats and lean. */
  readonly partyDem: string;
  /** Republican seats and lean. */
  readonly partyRep: string;
  /** Independent seats. */
  readonly partyInd: string;
};

const night: DeskRoles = {
  ground: "#07090D",
  plane: "#0E1218",
  raised: "#151A22",
  raisedHover: "#1C2330",
  overlay: "#1A2029",
  glass: "#0E1218D9",
  selected: "#7AA2FF1F",
  pressed: "#232C3A",
  line: "#232B37",
  lineStrong: "#5A667A",
  highlight: "#FFFFFF14",
  ink: "#EEF1F6",
  ink2: "#A7B0BF",
  ink3: "#8892A4",
  inkDisabled: "#5B6475",
  signal: "#7AA2FF",
  signalFill: "#3A66E8",
  signalFillHover: "#2F57CF",
  onSignal: "#FFFFFF",
  signalWash: "#7AA2FF1F",
  brass: "#E2B562",
  brassFill: "#D4A24A",
  onBrass: "#17110A",
  alarm: "#FF7A7A",
  alarmFill: "#D23434",
  alarmFillHover: "#B82A2A",
  onAlarm: "#FFFFFF",
  focus: "#9CC0FF",
  info: "#7AA2FF",
  infoWash: "#16254A",
  success: "#4FD1B8",
  successWash: "#0F2C29",
  warning: "#F2B84B",
  warningWash: "#33270F",
  danger: "#FF7A7A",
  dangerWash: "#3A1719",
  pending: "#A7B0BF",
  pendingWash: "#1C2330",
  attentionClear: "#00000000",
  attentionWaiting: "#2F6BFF29",
  attentionHeld: "#F2A93B33",
  attentionClearPip: "#8892A4",
  attentionWaitingPip: "#7AA2FF",
  attentionHeldPip: "#F2B84B",
  paper: "#ECE6D8",
  paperInk: "#1A1814",
  paperInk2: "#594F40",
  paperRule: "#CFC5B0",
  paperRuleStrong: "#7D7262",
  situationGround: "#030303",
  situationPlane: "#0D0C0A",
  situationInk: "#F2E7CF",
  situationInk2: "#B8AB8F",
  situationAccent: "#FFB547",
  situationLine: "#2A2620",
  situationActionFill: "#FFB547",
  situationActionFillHover: "#FFC56E",
  onSituationAction: "#1A1206",
  partyDem: "#5AA9F5",
  partyRep: "#F0625C",
  partyInd: "#B9B2A3",
};

const day: DeskRoles = {
  ground: "#E8EBF0",
  plane: "#FFFFFF",
  raised: "#F4F6F9",
  raisedHover: "#EAEEF4",
  overlay: "#FFFFFF",
  glass: "#FFFFFFDB",
  selected: "#2453E014",
  pressed: "#E1E7F0",
  line: "#E0E4EB",
  lineStrong: "#848FA1",
  highlight: "#FFFFFF",
  ink: "#0C1016",
  ink2: "#465062",
  ink3: "#5B6577",
  inkDisabled: "#9AA2B0",
  signal: "#1F4FD8",
  signalFill: "#2453E0",
  signalFillHover: "#1B43BD",
  onSignal: "#FFFFFF",
  signalWash: "#2453E014",
  brass: "#84601C",
  brassFill: "#C99A45",
  onBrass: "#17110A",
  alarm: "#C02A2A",
  alarmFill: "#C02A2A",
  alarmFillHover: "#A32222",
  onAlarm: "#FFFFFF",
  focus: "#1F4FD8",
  info: "#1F4FD8",
  infoWash: "#E8EEFF",
  success: "#0B7361",
  successWash: "#E3F5F1",
  warning: "#875400",
  warningWash: "#FFF3DC",
  danger: "#C02A2A",
  dangerWash: "#FDEAEA",
  pending: "#465062",
  pendingWash: "#EEF1F5",
  attentionClear: "#00000000",
  attentionWaiting: "#2F6BFF1A",
  attentionHeld: "#F2A93B29",
  attentionClearPip: "#5B6577",
  attentionWaitingPip: "#1F4FD8",
  attentionHeldPip: "#875400",
  paper: "#F7F3EA",
  paperInk: "#1A1814",
  paperInk2: "#5E5446",
  paperRule: "#DDD3BF",
  paperRuleStrong: "#8A7F6C",
  situationGround: "#030303",
  situationPlane: "#0D0C0A",
  situationInk: "#F2E7CF",
  situationInk2: "#B8AB8F",
  situationAccent: "#FFB547",
  situationLine: "#2A2620",
  situationActionFill: "#FFB547",
  situationActionFillHover: "#FFC56E",
  onSituationAction: "#1A1206",
  partyDem: "#1F6FB5",
  partyRep: "#C0352B",
  partyInd: "#6F6A5E",
};

const nightContrast: DeskRoles = {
  ground: "#000000",
  plane: "#000000",
  raised: "#0A0A0A",
  raisedHover: "#1A1A1A",
  overlay: "#000000",
  glass: "#000000",
  selected: "#9CC0FF33",
  pressed: "#333333",
  line: "#5C5C5C",
  lineStrong: "#FFFFFF",
  highlight: "#FFFFFF00",
  ink: "#FFFFFF",
  ink2: "#F0F0F0",
  ink3: "#E0E0E0",
  inkDisabled: "#9A9A9A",
  signal: "#9CC0FF",
  signalFill: "#9CC0FF",
  signalFillHover: "#C4DBFF",
  onSignal: "#000000",
  signalWash: "#9CC0FF33",
  brass: "#FFD27A",
  brassFill: "#FFD27A",
  onBrass: "#000000",
  alarm: "#FF9C9C",
  alarmFill: "#FF9C9C",
  alarmFillHover: "#FFC4C4",
  onAlarm: "#000000",
  focus: "#FFFF00",
  info: "#9CC0FF",
  infoWash: "#000000",
  success: "#7DFFE6",
  successWash: "#000000",
  warning: "#FFD27A",
  warningWash: "#000000",
  danger: "#FF9C9C",
  dangerWash: "#000000",
  pending: "#F0F0F0",
  pendingWash: "#000000",
  attentionClear: "#00000000",
  attentionWaiting: "#00000000",
  attentionHeld: "#00000000",
  attentionClearPip: "#E0E0E0",
  attentionWaitingPip: "#9CC0FF",
  attentionHeldPip: "#FFD27A",
  paper: "#FFFFFF",
  paperInk: "#000000",
  paperInk2: "#000000",
  paperRule: "#000000",
  paperRuleStrong: "#000000",
  situationGround: "#000000",
  situationPlane: "#000000",
  situationInk: "#FFFFFF",
  situationInk2: "#F0F0F0",
  situationAccent: "#FFD27A",
  situationLine: "#FFFFFF",
  situationActionFill: "#FFD27A",
  situationActionFillHover: "#FFE0A3",
  onSituationAction: "#000000",
  partyDem: "#8CC8FF",
  partyRep: "#FF9C96",
  partyInd: "#E0DCCF",
};

const dayContrast: DeskRoles = {
  ground: "#FFFFFF",
  plane: "#FFFFFF",
  raised: "#FFFFFF",
  raisedHover: "#E6E6E6",
  overlay: "#FFFFFF",
  glass: "#FFFFFF",
  selected: "#0033CC1F",
  pressed: "#CCCCCC",
  line: "#595959",
  lineStrong: "#000000",
  highlight: "#FFFFFF00",
  ink: "#000000",
  ink2: "#1A1A1A",
  ink3: "#262626",
  inkDisabled: "#595959",
  signal: "#0033CC",
  signalFill: "#0033CC",
  signalFillHover: "#00248F",
  onSignal: "#FFFFFF",
  signalWash: "#0033CC1F",
  brass: "#5C3D00",
  brassFill: "#5C3D00",
  onBrass: "#FFFFFF",
  alarm: "#A00000",
  alarmFill: "#A00000",
  alarmFillHover: "#7A0000",
  onAlarm: "#FFFFFF",
  focus: "#0033CC",
  info: "#0033CC",
  infoWash: "#FFFFFF",
  success: "#00573F",
  successWash: "#FFFFFF",
  warning: "#5C3D00",
  warningWash: "#FFFFFF",
  danger: "#A00000",
  dangerWash: "#FFFFFF",
  pending: "#1A1A1A",
  pendingWash: "#FFFFFF",
  attentionClear: "#00000000",
  attentionWaiting: "#00000000",
  attentionHeld: "#00000000",
  attentionClearPip: "#262626",
  attentionWaitingPip: "#0033CC",
  attentionHeldPip: "#5C3D00",
  paper: "#F7F3EA",
  paperInk: "#1A1814",
  paperInk2: "#000000",
  paperRule: "#DDD3BF",
  paperRuleStrong: "#000000",
  situationGround: "#000000",
  situationPlane: "#000000",
  situationInk: "#FFFFFF",
  situationInk2: "#F0F0F0",
  situationAccent: "#FFD27A",
  situationLine: "#FFFFFF",
  situationActionFill: "#FFD27A",
  situationActionFillHover: "#FFE0A3",
  onSituationAction: "#000000",
  partyDem: "#0B4F8A",
  partyRep: "#9C1F17",
  partyInd: "#3F3B33",
};

export const DESK_THEMES = ["night", "day", "nightContrast", "dayContrast"] as const;
export type DeskThemeId = (typeof DESK_THEMES)[number];

export const desk: Readonly<Record<DeskThemeId, DeskRoles>> = { night, day, nightContrast, dayContrast };

/** Whether a theme is held to AAA (7:1 text) rather than AA. */
export function isContrastTheme(id: DeskThemeId): boolean {
  return id === "nightContrast" || id === "dayContrast";
}

/** The attention light's three states: nothing waits, matters wait while time runs, a matter holds the clock. */
export const ATTENTION = ["clear", "waiting", "held"] as const;
export type Attention = (typeof ATTENTION)[number];

/**
 * Type, in rem of a 16px root so the player's text size scales every step.
 * Geist carries the interface with tabular figures; Newsreader is ceremony,
 * voice and paper; Geist Mono is readouts (the clock, codes a player copies).
 */
export const deskType = {
  family: { sans: "Geist", serif: "Newsreader", mono: "Geist Mono" },
  weight: { regular: 400, medium: 500, semibold: 600, bold: 700 },
  /** [size, line height] in rem, and the weight, per style. */
  style: {
    kicker: { size: 0.75, leading: 1, weight: 600, tracking: 0.08 },
    caption: { size: 0.75, leading: 1, weight: 400, tracking: 0 },
    label: { size: 0.8125, leading: 1.125, weight: 500, tracking: 0 },
    body: { size: 0.9375, leading: 1.375, weight: 400, tracking: 0 },
    title: { size: 1.0625, leading: 1.5, weight: 600, tracking: 0 },
    heading: { size: 1.25, leading: 1.625, weight: 600, tracking: -0.01 },
    pageTitle: { size: 1.75, leading: 2.125, weight: 600, tracking: -0.015 },
    figure: { size: 1.625, leading: 1.875, weight: 500, tracking: -0.01 },
    figureXl: { size: 2.75, leading: 2.75, weight: 500, tracking: -0.02 },
    headline: { size: 1.875, leading: 2.25, weight: 500, tracking: -0.01 },
    voice: { size: 1.1875, leading: 1.75, weight: 400, tracking: 0 },
    hero: { size: 3.75, leading: 4, weight: 500, tracking: -0.02 },
    document: { size: 1.125, leading: 1.75, weight: 400, tracking: 0 },
    clock: { size: 0.9375, leading: 1.25, weight: 500, tracking: 0.02 },
    code: { size: 0.75, leading: 1, weight: 500, tracking: 0.04 },
  },
} as const;

/** Corners: tags and fields, controls and readings, panes and cards, sheets and trays. */
export const deskRadius = { xs: 6, sm: 10, md: 16, lg: 24, pill: 999 } as const;

/** Depth is light, not borders: a shadow per lift, per scheme. */
export const deskShadow = {
  night: { lift1: "rgba(0, 0, 0, 0.40)", lift2: "rgba(0, 0, 0, 0.65)", lift3: "rgba(0, 0, 0, 0.80)" },
  day: { lift1: "rgba(12, 16, 22, 0.10)", lift2: "rgba(12, 16, 22, 0.20)", lift3: "rgba(12, 16, 22, 0.30)" },
} as const;
