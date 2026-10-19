import type { UnifiedCommandState } from "./combatant-commands.js";
import type { IntelligenceState } from "./intelligence.js";
import type { Assessment } from "./assessments.js";
import type { FindingsState } from "./findings.js";
import type { WarPowersReportState } from "./war-powers-report.js";
export type SecurityState = {
    readonly unifiedCommand: UnifiedCommandState;
    readonly intelligence: IntelligenceState;
    /** Finished products, newest last. Append-only: a superseded judgment is the record of what was believed. */
    readonly assessments: readonly Assessment[];
    readonly strikeSiteAssessments?: Readonly<Record<string, import("./strike-assessment.js").CivilianSiteAssessment>>;
    readonly covert: FindingsState;
    readonly warPowers: WarPowersReportState;
};
export declare function foundingSecurity(): SecurityState;
