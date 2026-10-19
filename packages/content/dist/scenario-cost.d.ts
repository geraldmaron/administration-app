export { COST_JITTER, costMultiplier } from "@admin/engine";
import { type Nation } from "@admin/world";
import type { FinancialScale, ScenarioImpact } from "./impact.js";
import type { ScenarioSeverity } from "./scenario-labels.js";
type PricedScale = Exclude<FinancialScale, "none">;
/** An anchor's money in the world's dollars, carried forward by the consumer price index. */
export declare function anchorInWorldDollars(anchor: string): number;
/**
 * How far a price lands from its center. Planning values, set against the
 * record that public projects overrun far more often than they come in under
 * (Flyvbjerg, Holm and Buhl, 2002; see the sources file): the median lands a
 * little over the center, the tail reaches well past it, and a band carries
 * more spread than a reply that stated its own arithmetic.
 */
export type CostPricing = {
    /** The week's severity. Absent prices at "serious", the middle of the corpus. */
    readonly severity?: ScenarioSeverity;
    /** The draw key: a campaign's seed with the occurrence it prices. Absent prices at the center, unjittered. */
    readonly key?: string;
};
/**
 * The money a reply's declared impact borrows, USD millions at today's prices,
 * or nothing when it declares no money.
 *
 * Another government pays the American anchor scaled by its output against the
 * United States', since a hurricane supplemental is a different sum in a smaller
 * economy. `costOfLiving` carries the founding's dollars to today's, so a
 * program answered in year four is priced at year four's prices.
 */
export declare function financialCost(impact: ScenarioImpact, nation: Nation, pricing?: CostPricing): number | undefined;
/**
 * A reply's own authored obligation, drawn around what the writer typed.
 *
 * The figure in a reply's `cost` is a writer's round number. The obligation it
 * stands for is not round: it lands near that figure, a little over more often
 * than under, at cents of a million. Absent a key, the figure is returned as
 * written.
 */
export declare function jitterTreasury(amount: number, key: string | undefined): number;
/** The center a basis or band prices at for the United States, unjittered. Exported for the audit. */
export declare function financialCenterForUs(impact: ScenarioImpact, severity: ScenarioSeverity): number | undefined;
/** The band's own center at a severity, for the audit's comparison against a stated basis. */
export declare function bandCenterForUs(scale: PricedScale, severity: ScenarioSeverity): number;
/** The estimate carries its accounting boundary into the frozen option and eventual receipt. */
export declare function financialEstimate(impact: ScenarioImpact, key: string): import("@admin/engine").ScenarioEstimate;
