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
export declare const DESK_THEMES: readonly ["night", "day", "nightContrast", "dayContrast"];
export type DeskThemeId = (typeof DESK_THEMES)[number];
export declare const desk: Readonly<Record<DeskThemeId, DeskRoles>>;
/** Whether a theme is held to AAA (7:1 text) rather than AA. */
export declare function isContrastTheme(id: DeskThemeId): boolean;
/** The attention light's three states: nothing waits, matters wait while time runs, a matter holds the clock. */
export declare const ATTENTION: readonly ["clear", "waiting", "held"];
export type Attention = (typeof ATTENTION)[number];
/**
 * Type, in rem of a 16px root so the player's text size scales every step.
 * Geist carries the interface with tabular figures; Newsreader is ceremony,
 * voice and paper; Geist Mono is readouts (the clock, codes a player copies).
 */
export declare const deskType: {
    readonly family: {
        readonly sans: "Geist";
        readonly serif: "Newsreader";
        readonly mono: "Geist Mono";
    };
    readonly weight: {
        readonly regular: 400;
        readonly medium: 500;
        readonly semibold: 600;
        readonly bold: 700;
    };
    /** [size, line height] in rem, and the weight, per style. */
    readonly style: {
        readonly kicker: {
            readonly size: 0.75;
            readonly leading: 1;
            readonly weight: 600;
            readonly tracking: 0.08;
        };
        readonly caption: {
            readonly size: 0.75;
            readonly leading: 1;
            readonly weight: 400;
            readonly tracking: 0;
        };
        readonly label: {
            readonly size: 0.8125;
            readonly leading: 1.125;
            readonly weight: 500;
            readonly tracking: 0;
        };
        readonly body: {
            readonly size: 0.9375;
            readonly leading: 1.375;
            readonly weight: 400;
            readonly tracking: 0;
        };
        readonly title: {
            readonly size: 1.0625;
            readonly leading: 1.5;
            readonly weight: 600;
            readonly tracking: 0;
        };
        readonly heading: {
            readonly size: 1.25;
            readonly leading: 1.625;
            readonly weight: 600;
            readonly tracking: -0.01;
        };
        readonly pageTitle: {
            readonly size: 1.75;
            readonly leading: 2.125;
            readonly weight: 600;
            readonly tracking: -0.015;
        };
        readonly figure: {
            readonly size: 1.625;
            readonly leading: 1.875;
            readonly weight: 500;
            readonly tracking: -0.01;
        };
        readonly figureXl: {
            readonly size: 2.75;
            readonly leading: 2.75;
            readonly weight: 500;
            readonly tracking: -0.02;
        };
        readonly headline: {
            readonly size: 1.875;
            readonly leading: 2.25;
            readonly weight: 500;
            readonly tracking: -0.01;
        };
        readonly voice: {
            readonly size: 1.1875;
            readonly leading: 1.75;
            readonly weight: 400;
            readonly tracking: 0;
        };
        readonly hero: {
            readonly size: 3.75;
            readonly leading: 4;
            readonly weight: 500;
            readonly tracking: -0.02;
        };
        readonly document: {
            readonly size: 1.125;
            readonly leading: 1.75;
            readonly weight: 400;
            readonly tracking: 0;
        };
        readonly clock: {
            readonly size: 0.9375;
            readonly leading: 1.25;
            readonly weight: 500;
            readonly tracking: 0.02;
        };
        readonly code: {
            readonly size: 0.75;
            readonly leading: 1;
            readonly weight: 500;
            readonly tracking: 0.04;
        };
    };
};
/** Corners: tags and fields, controls and readings, panes and cards, sheets and trays. */
export declare const deskRadius: {
    readonly xs: 6;
    readonly sm: 10;
    readonly md: 16;
    readonly lg: 24;
    readonly pill: 999;
};
/** Depth is light, not borders: a shadow per lift, per scheme. */
export declare const deskShadow: {
    readonly night: {
        readonly lift1: "rgba(0, 0, 0, 0.40)";
        readonly lift2: "rgba(0, 0, 0, 0.65)";
        readonly lift3: "rgba(0, 0, 0, 0.80)";
    };
    readonly day: {
        readonly lift1: "rgba(12, 16, 22, 0.10)";
        readonly lift2: "rgba(12, 16, 22, 0.20)";
        readonly lift3: "rgba(12, 16, 22, 0.30)";
    };
};
