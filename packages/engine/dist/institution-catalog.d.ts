import type { InstitutionDef, InstitutionId } from "./institutions.js";
/**
 * Per-office seat staggering for every fixed-term board in the catalog, keyed
 * by the office id `nomination.ts`'s seat calendar reads. Not a field on
 * `OfficeDef` itself: the office shape is shared with every at-will and
 * PAS office in the government, and a stagger table only a fixed-term board
 * ever populates belongs beside the data that needs it, not on every office
 * that never will.
 */
export declare const SEAT_TERM_START_DAYS: Readonly<Record<string, readonly number[]>>;
/** The nine seat institution ids, in seniority order — index 0 is the Chief Justice's. */
export declare const SCOTUS_SEAT_INSTITUTION_IDS: readonly string[];
/**
 * The Office of the Vice President. It sits under the Presidency with no
 * cabinet role behind it: the Vice President is elected on the ticket, so the
 * office has no department and no seat at the break rolls. A vacancy is filled
 * by a nomination both houses confirm, never from the career bench.
 */
export declare const VICE_PRESIDENCY_INSTITUTION_ID: InstitutionId;
export declare const INSTITUTION_CATALOG: readonly InstitutionDef[];
