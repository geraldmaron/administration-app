import type { UnifiedCommandState } from "./combatant-commands.js";
import type { IntelligenceState } from "./intelligence.js";
import type { Assessment } from "./assessments.js";
import type { FindingsState } from "./findings.js";
import type { WarPowersReportState } from "./war-powers-report.js";
import { foundingUnifiedCommand } from "./combatant-commands.js";
import { foundingIntelligence } from "./intelligence.js";
import { foundingFindings } from "./findings.js";
import { foundingWarPowersReports } from "./war-powers-report.js";

// The national security half of the government, gathered into one field on the
// campaign rather than five.
//
// One field because these five are one subject: an assessment is written by
// elements whose health is institutional, a finding authorizes an act the
// covert ladder takes, a combatant command executes an order the report to
// Congress describes, and a president under pressure reaches for all of them in
// the same week. Five top-level keys would have made the save look like five
// unrelated features shipped at different times, which is what they would then
// have become.

export type SecurityState = {
  readonly unifiedCommand: UnifiedCommandState;
  readonly intelligence: IntelligenceState;
  /** Finished products, newest last. Append-only: a superseded judgment is the record of what was believed. */
  readonly assessments: readonly Assessment[];
  readonly strikeSiteAssessments?: Readonly<Record<string, import("./strike-assessment.js").CivilianSiteAssessment>>;
  readonly covert: FindingsState;
  readonly warPowers: WarPowersReportState;
};

export function foundingSecurity(): SecurityState {
  return {
    unifiedCommand: foundingUnifiedCommand(),
    intelligence: foundingIntelligence(),
    assessments: [],
    covert: foundingFindings(),
    warPowers: foundingWarPowersReports(),
  };
}
