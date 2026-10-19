import type { ScenarioBriefSpec } from "./brief.js";

export function reportBriefSection(spec: ScenarioBriefSpec): readonly string[] {
  if (spec.cast !== "collectionReport") return [];
  return [
    "Issued-report binding",
    'Use cast { "pick": "collectionReport", "bind": "target" | "recipient" | "home" } and exactly one condition { "kind": "collectionReport", "targetKind": "foreign-nation" | "domestic-state", "topic": "military-readiness" | "external-intent" | "domestic-security" | "financial-pressure" | "stability", "basis"?: "pursuit" | "state-condition" | "governor-request", "condition"?: <recorded state condition kind>, "confidence"?: "low" | "moderate" | "high", "exposed"?: boolean, "shared"?: boolean }. Confidence is a minimum. Recipient binding requires shared: true; home binding requires domestic-state and a state-condition or governor-request basis. A state-condition basis also requires condition.',
    "Use only facts from the issued report: {{reportFinding}}, {{reportSource}}, {{reportGaps}}, {{reportSummary}}, {{reportConfidence}}, {{reportExposure}}, {{reportTarget}}, {{reportRecipient}} (shared only), {{reportFindingCount}}, {{reportAgeDays}}, and {{reportId}}. The report is frozen with the case; no nation statistic or guessed request becomes a finding. Put the numeric count or age token in particulars.",
    "The report is classified. No reply.press is allowed. A report share proves the recipient received it, not that it asked for help. A reply can task or close collection only through commitment.collection against the pinned report; it cannot share a report. Instrument replies execute their actual rung against the bound counterpart; target and recipient can be different nations.",
    "",
  ];
}
