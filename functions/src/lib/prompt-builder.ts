/**
 * Centralized prompt assembly for partial regeneration flows.
 * Enforces voice rules at the prompt layer: outcome fields are THIRD-PERSON
 * journalistic; description/options/advisorFeedback are SECOND-PERSON.
 */

import { getAuditRulesPrompt, type BundleScenario } from './audit-rules';

// Maps metric IDs to the cabinet role responsible for that domain.
export const METRIC_TO_ROLE: Record<string, string> = {
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

export function getRolesForEffects(effects: BundleScenario['options'][0]['effects']): string[] {
    const roles = new Set<string>(['role_executive']);
    for (const eff of effects) {
        const role = METRIC_TO_ROLE[eff.targetMetricId];
        if (role) roles.add(role);
    }
    return Array.from(roles);
}

export function buildAdvisorFeedbackPartialRegenPrompt(
    scenario: BundleScenario,
    option: BundleScenario['options'][0]
): string {
    const effectsSummary = option.effects
        .map(e => `${e.targetMetricId}: ${e.value > 0 ? '+' : ''}${e.value} (dur ${e.duration})`)
        .join(', ');
    const requiredRoles = getRolesForEffects(option.effects).join(', ');

    return `You are writing advisor feedback for a geopolitical simulation game.

${getAuditRulesPrompt()}

## THIS TASK: ADVISOR FEEDBACK (SECOND PERSON — advisors speak TO the player)
The player (head of government) chose this option: "${option.text}"
Scenario: "${scenario.description}"
Option effects: ${effectsSummary}
Outcome headline: "${option.outcomeHeadline ?? ''}"

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

export function buildOutcomeContextPartialRegenPrompt(
    scenario: BundleScenario,
    option: BundleScenario['options'][0]
): string {
    return `You are writing the body of a news article for a geopolitical simulation game.

${getAuditRulesPrompt()}

## THIS TASK: OUTCOME CONTEXT (THIRD PERSON JOURNALISTIC — newspaper reporter style)
The head of government chose: "${option.text}"
Outcome headline: "${option.outcomeHeadline ?? ''}"
Outcome summary: "${option.outcomeSummary ?? ''}"
Scenario context: "${scenario.description}"

Write a 4–6 sentence news article body (outcomeContext) in THIRD PERSON only:
- Use: "The administration...", "Cabinet officials...", "{leader_title}", "{player_country} authorities..."
- NEVER use "you", "your", "Your administration" — this is a news report, NOT addressed to the player
- Describe the immediate aftermath and downstream effects: economic signals, public reaction, international response
- Use {token} placeholders for country-specific references from the APPROVED TOKEN WHITELIST above
- Formal journalistic tone, no informal language, minimum 200 characters

Return JSON: { "outcomeContext": "..." }`;
}

export function buildOutcomeSummaryPartialRegenPrompt(
    scenario: BundleScenario,
    option: BundleScenario['options'][0]
): string {
    return `You are writing a news lead for a geopolitical simulation game.

${getAuditRulesPrompt()}

## THIS TASK: OUTCOME SUMMARY (THIRD PERSON JOURNALISTIC — news lead paragraph)
The head of government chose: "${option.text}"
Outcome headline: "${option.outcomeHeadline ?? ''}"

Write a 2–3 sentence outcomeSummary (news lead) in THIRD PERSON only:
- Use: "The administration announced...", "{leader_title} ordered...", "Authorities in {player_country}..."
- NEVER use "you", "your", "Your administration" — this is a news report, NOT addressed to the player
- Summarize the immediate consequence of the decision
- Use {token} placeholders from the APPROVED TOKEN WHITELIST above
- Minimum 200 characters

Return JSON: { "outcomeSummary": "..." }`;
}

export function buildOutcomeHeadlinePartialRegenPrompt(
    _scenario: BundleScenario,
    option: BundleScenario['options'][0]
): string {
    return `You are writing a newspaper headline for a geopolitical simulation game.

${getAuditRulesPrompt()}

## THIS TASK: OUTCOME HEADLINE (THIRD PERSON JOURNALISTIC — news headline style)
The head of government chose: "${option.text}"
Outcome summary: "${option.outcomeSummary ?? ''}"

Write a single outcomeHeadline in THIRD PERSON only:
- AP/Reuters headline style: "Administration Imposes Emergency Fuel Controls" or "Central Bank Raises Rates After Policy Pivot"
- NEVER use "you", "your", "Your administration"
- Concise, factual, 6–12 words
- May use {token} placeholders from the APPROVED TOKEN WHITELIST above

Return JSON: { "outcomeHeadline": "..." }`;
}
