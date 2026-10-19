import { openCases } from "./cases.js";
export function automationPreview(campaign, rule) {
    if (!rule.enabled || rule.maxUrgency !== "soft")
        return [];
    return openCases(campaign)
        .filter((item) => item.urgency !== "hard" &&
        rule.kinds.includes(item.kind) &&
        item.allowedDispositions.includes(rule.disposition.kind))
        .map((item) => item.id);
}
/** The same case effect a manual disposition would write, and only for confirmed ids. */
export function confirmedAutomationEffects(campaign, rule, confirmed) {
    const allowed = new Set(automationPreview(campaign, rule));
    return confirmed
        .filter((id) => allowed.has(id))
        .map((id) => ({
        kind: "case",
        actor: "player",
        transition: { id, disposition: rule.disposition, narration: `Rule: ${rule.name}.` },
    }));
}
