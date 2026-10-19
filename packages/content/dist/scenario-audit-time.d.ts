import type { Passage } from "./passage-audit.js";
import type { ScenarioDef } from "./scenario.js";
import type { FindingSink } from "./scenario-audit-cohorts.js";
export type TimeFindingKind = "commit-time-flash-forward" | "commit-time-elapsed";
/**
 * The time family by name, so a test holding a pack to zero findings can leave
 * the shipped debt to the ratchet in scenario-audit-time-baseline.test.ts.
 */
export declare const TIME_FINDING_KINDS: ReadonlySet<string>;
export type TimeClaim = {
    readonly phrase: string;
    readonly shape: string;
    /** The interval the phrase claims, or undefined for a season, a month or a year's end. */
    readonly days: number | undefined;
    readonly severity: "error" | "warning";
};
/**
 * Every claim of elapsed time a piece of commit-time copy makes, in reading
 * order. Sentences and dash-set clauses are read one at a time, so a forecast
 * in one does not excuse a flash-forward in the next.
 */
export declare function timeClaimsIn(text: string): readonly TimeClaim[];
/** A scenario's copy that is on screen the moment the player commits. */
export declare function commitTimePassages(def: ScenarioDef): readonly Passage[];
export type TimeFinding = {
    readonly kind: TimeFindingKind;
    readonly severity: "error" | "warning";
    readonly label: string;
    readonly phrase: string;
    readonly message: string;
};
/** The time findings for any set of commit-time passages, shared by every family of authored copy. */
export declare function timeFindingsIn(commitTime: readonly Passage[]): readonly TimeFinding[];
export declare function auditTimeFraming(def: ScenarioDef, findings: FindingSink): void;
