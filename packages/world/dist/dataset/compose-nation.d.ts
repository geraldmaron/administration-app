import type { z } from "zod";
import { NationInput, type NationStats } from "../schemas/nation.js";
/** Where one country's baked figures came from. */
export type NationFigureProvenance = {
    /** The year most of this country's sourced figures describe. */
    readonly vintage: number;
    /** Sourced figures describing an earlier year than `vintage`, by stat path. */
    readonly older: Readonly<Record<string, number>>;
    /**
     * Sourced stat paths no source states for this country, each filled from a
     * prior the bake derived: a continental median of the same ratio, or a fit
     * of sourced figures against each other. The judgment readings every baked
     * row fits from the authored roster are listed once, in `JUDGED_READINGS`.
     */
    readonly priors: readonly string[];
    /** Stat paths whose sourced figure lay outside the range the game models, held at that range's edge. */
    readonly clamped: readonly string[];
};
export type NationFigures = {
    readonly stats: NationStats;
    readonly provenance: NationFigureProvenance;
};
type Overlay<T> = T extends readonly unknown[] ? T : T extends object ? {
    readonly [K in keyof T]?: Overlay<T[K]>;
} : T;
/**
 * A record as it is authored: everything a person decides, and any figure the
 * author chooses to state over the baked one. `sectors` is optional because it
 * follows from the figures; a record states it only to override the mix the
 * leading exports and the energy mix imply.
 */
export type NationDraft = Omit<z.input<typeof NationInput>, "stats" | "sectors"> & {
    readonly stats?: Overlay<NationStats>;
    readonly sectors?: z.input<typeof NationInput>["sectors"];
};
/**
 * One record from its authored layer and its baked figures.
 *
 * Throws when a record has no figures and does not state its own: that is a
 * country missing from the seed, and a record assembled without numbers would
 * otherwise fail far from the cause, as a schema error about a field nobody wrote.
 */
export declare function composeNation(draft: NationDraft, figures: NationFigures | undefined): NationInput;
export {};
