// Player rules for soft cases. A hard case never matches, and nothing is
// applied until the caller names the ids it previewed.
import type { CaseAutomationRule, CaseEffect } from "./case-types.js";
import { openCases } from "./cases.js";
import type { Campaign } from "./state.js";

export function automationPreview(campaign: Campaign, rule: CaseAutomationRule): readonly string[] {
  if (!rule.enabled || rule.maxUrgency !== "soft") return [];
  return openCases(campaign)
    .filter(
      (item) =>
        item.urgency !== "hard" &&
        rule.kinds.includes(item.kind) &&
        item.allowedDispositions.includes(rule.disposition.kind),
    )
    .map((item) => item.id);
}

/** The same case effect a manual disposition would write, and only for confirmed ids. */
export function confirmedAutomationEffects(
  campaign: Campaign,
  rule: CaseAutomationRule,
  confirmed: readonly string[],
): readonly CaseEffect[] {
  const allowed = new Set(automationPreview(campaign, rule));
  return confirmed
    .filter((id) => allowed.has(id))
    .map((id) => ({
      kind: "case",
      actor: "player",
      transition: { id, disposition: rule.disposition, narration: `Rule: ${rule.name}.` },
    }));
}
