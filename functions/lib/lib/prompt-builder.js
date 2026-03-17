"use strict";
/**
 * Centralized prompt assembly for partial regeneration flows.
 * Enforces voice rules at the prompt layer: outcome fields are THIRD-PERSON
 * journalistic; description/options/advisorFeedback are SECOND-PERSON.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.METRIC_TO_ROLE = void 0;
exports.getRolesForEffects = getRolesForEffects;
exports.buildAdvisorFeedbackPartialRegenPrompt = buildAdvisorFeedbackPartialRegenPrompt;
exports.buildOutcomeContextPartialRegenPrompt = buildOutcomeContextPartialRegenPrompt;
exports.buildOutcomeSummaryPartialRegenPrompt = buildOutcomeSummaryPartialRegenPrompt;
exports.buildOutcomeHeadlinePartialRegenPrompt = buildOutcomeHeadlinePartialRegenPrompt;
const audit_rules_1 = require("./audit-rules");
// Maps metric IDs to the cabinet role responsible for that domain.
exports.METRIC_TO_ROLE = {
    metric_economy: 'role_economy',
    metric_employment: 'role_labor',
    metric_trade: 'role_commerce',
    metric_budget: 'role_economy',
    metric_inflation: 'role_economy',
    metric_innovation: 'role_economy',
    metric_military: 'role_defense',
    metric_foreign_relations: 'role_diplomacy',
    metric_sovereignty: 'role_defense',
    metric_approval: 'role_executive',
    metric_public_order: 'role_interior',
    metric_corruption: 'role_justice',
    metric_democracy: 'role_justice',
    metric_liberty: 'role_justice',
    metric_health: 'role_health',
    metric_education: 'role_education',
    metric_energy: 'role_energy',
    metric_environment: 'role_environment',
    metric_crime: 'role_justice',
    metric_immigration: 'role_interior',
    metric_housing: 'role_transport',
    metric_infrastructure: 'role_transport',
    metric_equality: 'role_labor',
    metric_bureaucracy: 'role_interior',
};
function getRolesForEffects(effects) {
    const roles = new Set(['role_executive']);
    for (const eff of effects) {
        const role = exports.METRIC_TO_ROLE[eff.targetMetricId];
        if (role)
            roles.add(role);
    }
    return Array.from(roles);
}
function buildAdvisorFeedbackPartialRegenPrompt(scenario, option) {
    var _a;
    const effectsSummary = option.effects
        .map(e => `${e.targetMetricId}: ${e.value > 0 ? '+' : ''}${e.value} (dur ${e.duration})`)
        .join(', ');
    const requiredRoles = getRolesForEffects(option.effects).join(', ');
    return `You are writing advisor feedback for a geopolitical simulation game.

${(0, audit_rules_1.getAuditRulesPrompt)()}

## THIS TASK: ADVISOR FEEDBACK (SECOND PERSON — advisors speak TO the player)
The player (head of government) chose this option: "${option.text}"
Scenario: "${scenario.description}"
Option effects: ${effectsSummary}
Outcome headline: "${(_a = option.outcomeHeadline) !== null && _a !== void 0 ? _a : ''}"

Write substantive advisor feedback for these cabinet roles: ${requiredRoles}

Each entry MUST:
- Address the player in second person ("Your decision to...", "You have committed...")
- Reference the SPECIFIC policy action and the role's domain area
- State a causal impact — what will happen in that domain as a result
- NOT use generic phrases like "Our department supports this", "This aligns with our priorities", "This warrants monitoring"
- Be 1–2 sentences only

Return JSON:
{"advisorFeedback": [{ "roleId": "role_xxx", "stance": "support"|"oppose"|"neutral"|"concerned", "feedback": "..." }]}`;
}
function buildOutcomeContextPartialRegenPrompt(scenario, option) {
    var _a, _b;
    return `You are writing the body of a news article for a geopolitical simulation game.

${(0, audit_rules_1.getAuditRulesPrompt)()}

## THIS TASK: OUTCOME CONTEXT (THIRD PERSON JOURNALISTIC — newspaper reporter style)
The head of government chose: "${option.text}"
Outcome headline: "${(_a = option.outcomeHeadline) !== null && _a !== void 0 ? _a : ''}"
Outcome summary: "${(_b = option.outcomeSummary) !== null && _b !== void 0 ? _b : ''}"
Scenario context: "${scenario.description}"

Write a 4–6 sentence news article body (outcomeContext) in THIRD PERSON only:
- Use: "{leader_title}" or "{the_leader_title}" (e.g., "President", "Prime Minister") when referring to the head of government; avoid generic phrases like "The administration" or "the government"
- NEVER use "you", "your", "Your administration" — this is a news report, NOT addressed to the player
- Describe the immediate aftermath and downstream effects: economic signals, public reaction, international response
- Use {token} placeholders for country-specific references from the APPROVED TOKEN WHITELIST above
- Formal journalistic tone, no informal language, minimum 200 characters

Return JSON: { "outcomeContext": "..." }`;
}
function buildOutcomeSummaryPartialRegenPrompt(scenario, option) {
    var _a;
    return `You are writing a news lead for a geopolitical simulation game.

${(0, audit_rules_1.getAuditRulesPrompt)()}

## THIS TASK: OUTCOME SUMMARY (THIRD PERSON JOURNALISTIC — news lead paragraph)
The head of government chose: "${option.text}"
Outcome headline: "${(_a = option.outcomeHeadline) !== null && _a !== void 0 ? _a : ''}"

Write a 2–3 sentence outcomeSummary (news lead) in THIRD PERSON only:
- Use: "{leader_title} ordered...", "{the_leader_title} said...", "Authorities in {player_country}..." — do not use generic phrasing like "The administration announced..."
- NEVER use "you", "your", "Your administration" — this is a news report, NOT addressed to the player
- Summarize the immediate consequence of the decision
- Use {token} placeholders from the APPROVED TOKEN WHITELIST above
- Minimum 200 characters

Return JSON: { "outcomeSummary": "..." }`;
}
function buildOutcomeHeadlinePartialRegenPrompt(_scenario, option) {
    var _a;
    return `You are writing a newspaper headline for a geopolitical simulation game.

${(0, audit_rules_1.getAuditRulesPrompt)()}

## THIS TASK: OUTCOME HEADLINE (THIRD PERSON JOURNALISTIC — news headline style)
The head of government chose: "${option.text}"
Outcome summary: "${(_a = option.outcomeSummary) !== null && _a !== void 0 ? _a : ''}"

Write a single outcomeHeadline in THIRD PERSON only:
- AP/Reuters headline style: refer to the head of government (e.g., "{leader_title} imposes..." or "{the_leader_title} orders...") rather than generic "Administration" phrasing
- NEVER use "you", "your", "Your administration"
- Concise, factual, 6–12 words
- May use {token} placeholders from the APPROVED TOKEN WHITELIST above

Return JSON: { "outcomeHeadline": "..." }`;
}
//# sourceMappingURL=prompt-builder.js.map