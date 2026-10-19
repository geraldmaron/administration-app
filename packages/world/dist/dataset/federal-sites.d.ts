import type { FederalSite } from "../schemas/site.js";
/**
 * The fifteen executive departments, by the engine's institution id. The
 * validator holds every one of them to a sourced point, and the engine's own
 * test holds this list to its catalog's departments.
 */
export declare const CABINET_DEPARTMENT_INSTITUTIONS: readonly string[];
export declare const FEDERAL_SITES: readonly FederalSite[];
/** An institution's row, sourced or not; undefined only for an id the table does not list. */
export declare function federalSite(institution: string): FederalSite | undefined;
/** An institution's headquarters point, or undefined where its row records no location. */
export declare function federalSitePoint(institution: string): {
    readonly lat: number;
    readonly lon: number;
} | undefined;
