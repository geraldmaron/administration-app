import type { NationId } from "@admin/world";
import type { CovertFinding } from "./findings.js";
import type { Campaign } from "./state.js";

/** A board with a written finding standing on the target, for tests that exercise a covert rung and not the finding gate. */
export function withStandingFinding(campaign: Campaign, target: NationId): Campaign {
  const finding: CovertFinding = {
    id: `finding:${target}:test`,
    objective: "Test authority for covert action.",
    target,
    signedDay: 0,
    signedDate: campaign.calendar,
    state: "written",
    notification: "full-committees",
    notifiedDay: 0,
    activities: 0,
  };
  const covert = campaign.security.covert;
  return { ...campaign, security: { ...campaign.security, covert: { ...covert, findings: [...covert.findings, finding] } } };
}
