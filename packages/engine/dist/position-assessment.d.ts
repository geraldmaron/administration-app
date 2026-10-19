import type { Campaign } from "./state.js";
import type { DeltaMetricKey } from "./effect-types.js";
import type { MetricCost } from "./resolution.js";
import { type Confidence } from "./assessments.js";
import { type ProjectionImpact } from "./projection.js";
/** The metrics the President spends outright; printed as figures. */
export declare const SPENT_METRICS: readonly DeltaMetricKey[];
/** The metrics the country decides; printed as bands and measured on the Record. */
export declare const ASSESSED_METRICS: readonly DeltaMetricKey[];
/** How much evidence a doubted briefing takes off the assessment's confidence. */
export declare const DOUBTED_BRIEFING_EVIDENCE = 0.25;
export type PositionAssessment = {
    readonly spent: MetricCost;
    readonly assessed: readonly ProjectionImpact[];
    readonly confidence: Confidence;
    /** One sentence naming what the assessment rests on, in the cabinet's words. */
    readonly basis: string;
    readonly asOf: Campaign["calendar"];
};
/**
 * What an authored cost comes to on this board. A debit to an assessed metric
 * lands as heavily as the administration's fragility makes it; a credit lands
 * as softly as the public's division makes it. Spent metrics pass through
 * untouched, and so does every assessed metric on a healthy, united board —
 * which is why a healthy administration reads its sticker price.
 */
export declare function realizePositionCost(campaign: Campaign, cost: MetricCost): MetricCost;
/** The spent half and the assessed half of one price. */
export declare function splitPrice(cost: MetricCost): {
    readonly spent: MetricCost;
    readonly assessed: MetricCost;
};
/**
 * The assessment a card prints and the Record freezes: the spent figures, the
 * assessed bands, how sure the room is, and why.
 *
 * Confidence is the health of the administration less what a doubted briefing
 * takes off it. On a healthy board the realized figure sits inside the band
 * the sticker price banded to, and the room says so with high confidence; the
 * more fragile the board, the wider the range a shock can land in.
 */
export declare function assessPosition(campaign: Campaign, realized: MetricCost, options?: {
    readonly briefingDoubted?: boolean;
}): PositionAssessment;
