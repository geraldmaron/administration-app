import { type ReactNode } from "react";
import { type ButtonKind } from "./Button";
import { type ChoiceOutcomeView, type ChoiceProjection } from "./ChoiceList";
import { type IconBadgeTone, type IconName } from "./Icon";
import type { MovementValence } from "./Movement";
/** One headline judgment about an option, read before its rows: its price, its net moves, its odds. */
export type CompareVerdict = {
    readonly text: string;
    readonly valence: MovementValence;
    readonly icon?: IconName;
};
export type CompareOption = {
    readonly id: string;
    readonly label: string;
    /** The option's character at a glance: force red, accord blue, principle gold, waiting plain. */
    readonly icon?: IconName;
    readonly accent?: IconBadgeTone;
    /** A mark that leads the name in place of the emblem: a person's face. */
    readonly mark?: ReactNode;
    /** Said where a screen or model recommends this option; the baseline is flagged "Default" without it. */
    readonly recommended?: boolean;
    /** A strip of judgments under the name, each a word with its good or bad cue. */
    readonly verdict?: readonly CompareVerdict[];
    /** A do-nothing or wait column, where a comparison carries one; at most one option is the baseline. */
    readonly baseline?: boolean;
    /** Why this option cannot be authorized today; it can still be read and compared. */
    readonly unavailable?: string;
    /**
     * The option's price, odds, moves and worst case as numbers, drawn in the
     * list's columns on one shared axis. An option with an outcome reads its
     * opened detail from the outcome and not from `rows`.
     */
    readonly outcome?: ChoiceOutcomeView;
};
export type CompareRow = {
    readonly label: string;
    /** A glyph set before the label, decorative: the label alone names the row. */
    readonly mark?: ReactNode;
    /**
     * `lead` is the option's own voice (what you would say, what the act is),
     * set under its name in larger type; every other row is a reading.
     */
    readonly kind?: "lead" | "reading";
    /** The row's glyph, set before its name in every card. */
    readonly icon?: IconName;
    /** One cell per option id, on the same terms, so the options are read across. */
    readonly cells: Readonly<Record<string, ReactNode>>;
};
export type CompareAuthorizeProps = {
    readonly title: string;
    readonly options: readonly CompareOption[];
    readonly rows: readonly CompareRow[];
    /** Absent until the player picks a row, where the comparison has no baseline to start on. */
    readonly selected: string | undefined;
    readonly onSelect: (id: string) => void;
    /** The one named verb: "Enable God Mode", "Sign the order". */
    readonly verb: string;
    readonly onAuthorize: () => void;
    /** `danger` for an irreversible or forceful act. */
    readonly tone?: Extract<ButtonKind, "commit" | "danger">;
    /** What authorizing will do, in one line, shown above the verb. */
    readonly review?: ReactNode;
    /**
     * What the baseline means when it is picked, or what waiting costs while
     * nothing is picked; absent, the line says nothing changes.
     */
    readonly baselineReview?: ReactNode;
    readonly busy?: boolean;
    /**
     * Docks the verb in the work surface's foot, below the scrolling body, so on
     * a phone it stays in the thumb's reach wherever the player has scrolled and
     * never covers a column. Outside a surface the verb stays in place.
     */
    readonly docked?: boolean;
    /** Set under the table: what folded away, a source line. */
    readonly footnote?: ReactNode;
    /** A forward projection of the options, laid into the list by the screen that can run one. */
    readonly projection?: ChoiceProjection;
};
/** The baseline column where there is one, or a thrown error when two options both claim to do nothing. */
export declare function baselineOf(options: readonly CompareOption[]): CompareOption | undefined;
/**
 * Every consequential act: the options side by side, one picked, what it
 * will do in a line, and one named verb. The verb stays off while nothing or
 * the baseline is picked, because doing nothing needs no signature.
 */
export declare function CompareAuthorize({ title, options, rows, selected, onSelect, verb, onAuthorize, tone, review, baselineReview, busy, docked, footnote, projection }: CompareAuthorizeProps): import("react").JSX.Element;
