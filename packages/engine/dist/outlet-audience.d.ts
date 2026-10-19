import { type CohortId } from "@admin/world";
import type { Campaign } from "./state.js";
import { type PressOutlet } from "./press-outlets.js";
export type AudienceCohort = {
    readonly cohort: CohortId;
    readonly name: string;
    /**
     * How over-represented the cohort is in this desk's audience, as a multiple
     * of its share of the country: 1 reads it exactly as often as anyone does.
     */
    readonly index: number;
};
export type OutletAudience = {
    /** The desk's weekly reach, as authored. */
    readonly reach: number;
    /** The cohorts most over-represented in its audience, most over-represented first. */
    readonly leans: readonly AudienceCohort[];
};
/**
 * The desk's audience, read off the country's cohort shares. The index is how
 * strongly a cohort is drawn to the desk over how strongly the country as a
 * whole is, weighting every cohort by its share of the country, so a large
 * cohort and a small one compare on one scale.
 */
export declare function outletAudience(campaign: Campaign, outlet: PressOutlet): OutletAudience;
