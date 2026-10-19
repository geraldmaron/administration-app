import type { EffectPacket } from "@admin/engine";
import type { MetricStance } from "../format/figures.js";
import type { ChoiceOutcome } from "../choice/choice-outcome.js";
/**
 * The one number a cell is said from, where the producer holds it, so a screen
 * can draw it instead of reading the lines. `share` and `scale` are 0..1; a
 * `signed` value is a change in the same units as its subject; an `amount`
 * names its unit (money in USD millions). `from` is where it stood before the
 * act, for a figure that moves.
 */
export type ActFigure = {
    readonly kind: "share" | "amount" | "scale" | "signed";
    readonly value: number;
    readonly from?: number;
    readonly unit?: string;
    readonly stance?: MetricStance;
};
export type ActCell = {
    readonly lines: readonly string[];
    readonly stance?: MetricStance;
    readonly figure?: ActFigure;
};
export type ActColumn = {
    readonly id: string;
    readonly label: string;
    /** The one named verb that authorizes this option. */
    readonly verb: string;
    /** The engine's reason this option cannot be authorized today. */
    readonly refusal?: string;
    /** One line of what authorizing it will do, for the review above the verb. */
    readonly review: string;
    readonly cells: Readonly<Record<string, ActCell>>;
    /** The option drawn as one row of the results list, where the producer holds its numbers. */
    readonly outcome?: ChoiceOutcome;
};
export type ActRow = {
    readonly key: string;
    readonly label: string;
};
export type ActComparison = {
    readonly rows: readonly ActRow[];
    readonly columns: readonly ActColumn[];
    /** What happens on its own if nothing is approved, where that has a clock. */
    readonly waiting?: string;
};
export declare const actCell: (lines: string | readonly string[], stance?: MetricStance, figure?: ActFigure) => ActCell;
/** What a packet sets Congress's disposition to, where it writes one. */
export declare function congressAfter(packet: EffectPacket): number | undefined;
/** "From 56% to 59%", or "No change", for the room's disposition. */
export declare function dispositionMove(before: number, after: number | undefined): ActCell;
