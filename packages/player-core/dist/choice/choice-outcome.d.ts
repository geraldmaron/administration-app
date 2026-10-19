import type { MetricSet, ProjectionImpact } from "@admin/engine";
import type { ActFigure } from "../congress/act-comparison.js";
import type { ChoiceMove } from "../policy/choice-table.js";
/** What is paid the moment the act is authorized. `figure` is the money, in USD millions, where money is paid. */
export type ChoiceCost = {
    readonly text: string;
    readonly figure?: ActFigure;
    readonly borrowing?: {
        readonly text: string;
        readonly amount: number;
    };
};
/** The chance it goes well, where the act has one: a 0..1 share, the likelihood word and the forecast's confidence. */
export type ChoiceOdds = {
    readonly share: number;
    readonly word: string;
    readonly confidence?: string;
};
/**
 * One reading an option moves. `value` (the move's own field) is the likely
 * move; `ifWell` and `ifBadly` bound it where the act can land either way.
 * Every value is in `unit`: "pts" for a 0..1 reading said in points, "band"
 * for a move the engine only gives as a magnitude (±1 slight, ±2 moderate,
 * ±3 major), so a band never reads as a precise amount.
 */
export type ChoiceEffect = ChoiceMove & {
    readonly metric: string;
    readonly label: string;
    readonly unit: "pts" | "band";
    readonly ifWell?: number;
    readonly ifBadly?: number;
};
export type ChoiceDetail = {
    readonly label: string;
    readonly text: string;
};
export type ChoiceOutcome = {
    readonly cost: ChoiceCost;
    readonly odds?: ChoiceOdds;
    readonly effects: readonly ChoiceEffect[];
    /** The worst case in one line: the readings that fall if it goes badly, or the consequence in words where it has no number. */
    readonly worstCase?: string;
    readonly details: readonly ChoiceDetail[];
};
export declare const COST_FREE: ChoiceCost;
/** The money an act spends now, as the cost column says it. A positive amount is money coming in. */
export declare function moneyCost(amount: number): ChoiceCost;
/** The player metrics by the short names a narrow column fits. */
export declare const METRIC_SHORT: Readonly<Record<keyof MetricSet, string>>;
/**
 * A move on a 0..1 reading, said in points. `well` and `badly` are the
 * fractions it moves by in each case, and `chance` the odds it goes well; the
 * likely move is their chance-weighted mean. Without a chance the move is
 * certain. `betterHigher` false flips the tone for a reading that is worse up.
 */
export declare function pointsEffect(metric: string, label: string, move: {
    readonly well: number;
    readonly badly?: number;
    readonly chance?: number;
}, betterHigher?: boolean): ChoiceEffect;
/** A move the engine gives only as a band, on the ±3 band scale. `favorable` undefined is a reading with no stance of its own. */
export declare function bandEffect(metric: string, label: string, impact: ProjectionImpact, favorable: boolean | undefined): ChoiceEffect;
/** The readings that fall if it goes badly, in one line: "Press corps −10, Standing −2.7". Undefined where nothing falls. */
export declare function worstCaseOf(effects: readonly ChoiceEffect[]): string | undefined;
