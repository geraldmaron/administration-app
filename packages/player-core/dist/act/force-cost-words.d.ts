import type { ForceCostBasis } from "@admin/engine";
/**
 * The money a force act charges, with what it was priced on: what is sent,
 * the US price of each, any adjustment for the government paying or the
 * distance, the sum charged now, and the bill each week the force stays out.
 * The sum is the projection's own, so it is the figure the commit charges.
 */
export declare function forceCostBasisWords(basis: ForceCostBasis): string;
