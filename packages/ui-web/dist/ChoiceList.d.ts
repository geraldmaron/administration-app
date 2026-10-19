import type { ReactNode } from "react";
import { type IconBadgeTone, type IconName } from "./Icon";
import type { MovementValence } from "./Movement";
export type ChoiceTone = "favorable" | "neutral" | "caution" | "adverse";
/** One reading an option moves. `value` is the likely move in `unit`; `ifWell` and `ifBadly` bound it where it can land either way. */
export type ChoiceEffectView = {
    readonly metric: string;
    readonly label: string;
    readonly value: number;
    readonly text: string;
    readonly tone: ChoiceTone;
    /** "pts", or "band" for a move on the ±3 magnitude scale. */
    readonly unit: string;
    readonly ifWell?: number;
    readonly ifBadly?: number;
};
export type ChoiceOutcomeView = {
    readonly cost: {
        readonly text: string;
        readonly figure?: {
            readonly value: number;
        };
        readonly borrowing?: {
            readonly text: string;
            readonly amount: number;
        };
    };
    readonly odds?: {
        readonly share: number;
        readonly word: string;
        readonly confidence?: string;
    };
    readonly effects: readonly ChoiceEffectView[];
    readonly worstCase?: string;
    readonly baseline?: boolean;
    /** Everything else, for the opened row. A screen may draw a line (a face, a meter) where a producer gave words. */
    readonly details: readonly {
        readonly label: string;
        readonly text: ReactNode;
        readonly icon?: IconName;
    }[];
};
export type ChoiceDetailLine = {
    readonly label: string;
    readonly icon?: IconName;
    readonly value: ReactNode;
};
export type ChoiceItem = {
    readonly id: string;
    readonly label: string;
    readonly icon?: IconName;
    readonly accent?: IconBadgeTone;
    /** A mark that leads the name in place of the icon: a person's face. */
    readonly mark?: ReactNode;
    readonly baseline?: boolean;
    readonly recommended?: boolean;
    /** Why it cannot be authorized today; it can still be read and picked to read. */
    readonly unavailable?: string;
    /** Set where the reason is said once above the list for every option it locks. */
    readonly lockShared?: boolean;
    readonly outcome?: ChoiceOutcomeView;
    /** For an option drawn without an outcome: its cost, odds and worst case as the screen drew them. */
    readonly cost?: ReactNode;
    readonly odds?: ReactNode;
    /** The producer's question for a lifted odds cell, which may be success or a counterpart's willingness. */
    readonly oddsLabel?: string;
    readonly worst?: ReactNode;
    /** One line under the name: what the option is, in its own words. */
    readonly lead?: ReactNode;
    /** A strip of judgments, drawn only where there is no outcome to draw. */
    readonly verdict?: readonly {
        readonly text: string;
        readonly valence: MovementValence;
        readonly icon?: IconName;
    }[];
    /** Everything else, shown once the option is picked. */
    readonly detail?: readonly ChoiceDetailLine[];
};
/**
 * A forward projection laid into the list by the screen that owns the choice:
 * a control over the list to run it, one cell per option id drawn under that
 * option's moves, and the picked option's opened detail. Nodes, not numbers,
 * so this package draws the slot without knowing how a projection is made.
 */
export type ChoiceProjection = {
    readonly control: ReactNode;
    readonly perItem: Readonly<Record<string, ReactNode>>;
    readonly detail?: ReactNode;
    /** Told which option was authorized, before the act is sent: the screen files the forecast it was shown. */
    readonly onAuthorize?: (id: string) => void;
};
export type ChoiceListProps = {
    /** The id of the heading that names the choice. */
    readonly labeledBy: string;
    /** The radio group's name and the prefix of every id inside it. */
    readonly name: string;
    readonly items: readonly ChoiceItem[];
    readonly selected: string;
    readonly onSelect: (id: string) => void;
    readonly projection?: ChoiceProjection;
    /** Authorization follows the comparison, before expanded evidence. */
    readonly footer?: ReactNode;
};
export type ChoiceAxis = {
    readonly unit: string;
    readonly lo: number;
    readonly hi: number;
    readonly ticks: readonly {
        readonly at: number;
        readonly label: string;
    }[];
};
/**
 * The one axis every move in `unit` is drawn on, sized to the likely moves so
 * a move of a point reads as a bar and not a speck. A good or bad case past
 * the end is clipped there and marked; its figure is in the worst-case line.
 * Where moves go both ways the axis is even about zero, so a rise and a fall
 * of the same size draw the same length.
 */
export declare function choiceAxis(effects: readonly ChoiceEffectView[], unit: string): ChoiceAxis;
/**
 * The options as a results list: doing nothing on top as the reference, each
 * option one row whose whole width is its radio (arrow keys move the pick),
 * the picked row open to everything else. The price, the odds, the moves and
 * the worst case never fold away.
 */
export declare function ChoiceList({ labeledBy, name, items, selected, onSelect, projection, footer }: ChoiceListProps): import("react").JSX.Element;
