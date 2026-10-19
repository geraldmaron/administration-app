import type { Effect } from "./effect-types.js";
import { type PolicyStatPath } from "./policy-stats.js";
import { type Campaign } from "./state.js";
/** What absolute stat effects actually deliver, including clipping at the signing or rulemaking boundary. */
export declare function realizedOrderContribution(campaign: Campaign, movements: Partial<Record<PolicyStatPath, number>>): Partial<Record<PolicyStatPath, number>>;
/**
 * An order's movements as they land on the country, with its share of the debt
 * booked as the President's own borrowing rather than written as a level: the
 * money an order borrows is borrowed by the President's choice, so its interest
 * is charged to the President's authority like a program's is. The share is of
 * output at today's prices, because the stock it lands on is kept in them.
 */
export declare function orderLandingEffects(campaign: Campaign, movements: Partial<Record<PolicyStatPath, number>>, ownerId?: string): readonly Effect[];
/** Legacy delta adapter, excluding borrowed debt; live court remedies use recorded contribution lineage. */
export declare function negatedStatEffects(campaign: Campaign, effects: Partial<Record<PolicyStatPath, number>>): readonly Effect[];
