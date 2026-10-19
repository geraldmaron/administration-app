import type { InstallationAnchor } from "../schemas/zone.js";
export type UsBasingRow = InstallationAnchor & {
    readonly country: string;
    readonly base: string;
    readonly service: string;
    readonly personnelBand: string;
    readonly source: string;
    readonly opened: string;
};
/** The label every country-total row carries. It is a band, not an installation, and is never placed. */
export declare const BASING_COUNTRY_TOTAL = "country total, all services";
/**
 * Composite rows a save may still name, mapped to the installations they were
 * split into. A commitment opened under the old label is the same forces; the
 * labels here let a reader find them.
 */
export declare const BASING_SPLIT_FROM: Readonly<Record<string, readonly string[]>>;
export declare const US_BASING: readonly UsBasingRow[];
