import { callModelProvider, type ModelConfig } from './model-providers';
import { ALL_METRIC_IDS } from '../data/schemas/metricIds';
import { ALL_TOKENS, CANONICAL_ROLE_IDS } from './token-registry';
import type { BundleScenario, Issue } from './audit-rules';
import type { GenerationModelConfig } from '../shared/generation-contract';
import { resolvePhaseModel } from './generation-models';
import { VALID_SETTING_TARGETS } from '../types';

const CONTEXT_REPAIR_CONFIG: ModelConfig = { maxTokens: 1024, temperature: 0.1 };

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

interface MetricFix {
    option_id: string;
    effect_index: number;
    correct_metric_id: string;
}

interface TokenFix {
    /** The raw token name without braces, e.g. "trade_minister" */
    invented_token: string;
    /**
     * Either a valid replacement token name (without braces) from the whitelist,
     * OR null to signal that plain-text substitution is the right answer.
     */
    replacement_token: string | null;
    /** Plain-text fallback used when replacement_token is null. */
    replacement_text: string;
}

interface SeverityFix {
    /** 'raise-effect' → raise one effect's |value| to the threshold; 'downgrade-severity' → lower metadata.severity. */
    action: 'raise-effect' | 'downgrade-severity';
    /** When action='raise-effect': which option+effect to adjust, and the new value (signed, magnitude ≥ threshold). */
    option_id?: string;
    effect_index?: number;
    new_value?: number;
    /** When action='downgrade-severity': the replacement severity level. */
    new_severity?: 'low' | 'medium' | 'high' | 'extreme' | 'critical';
}

interface TitleFix {
    /** A concrete, 4–10 word replacement title that names the actor + stakes. No formulaic openers/closers. */
    replacement_title: string;
}

interface PolicyImplicationFix {
    option_id: string;
    implication_index: number;
    correct_target: string;
}

interface RoleIdFix {
    option_id: string;
    advisor_index: number;
    correct_role_id: string;
}

interface ContextRepairResponse {
    metric_fixes: MetricFix[];
    token_fixes: TokenFix[];
    severity_fixes: SeverityFix[];
    title_fixes: TitleFix[];
    policy_implication_fixes: PolicyImplicationFix[];
    role_id_fixes: RoleIdFix[];
}

const CONTEXT_REPAIR_SCHEMA = {
    type: 'object',
    properties: {
        metric_fixes: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    option_id: { type: 'string' },
                    effect_index: { type: 'number' },
                    correct_metric_id: { type: 'string' },
                },
                required: ['option_id', 'effect_index', 'correct_metric_id'],
            },
        },
        token_fixes: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    invented_token: { type: 'string' },
                    replacement_token: { type: ['string', 'null'] },
                    replacement_text: { type: 'string' },
                },
                required: ['invented_token', 'replacement_token', 'replacement_text'],
            },
        },
        severity_fixes: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['raise-effect', 'downgrade-severity'] },
                    option_id: { type: 'string' },
                    effect_index: { type: 'number' },
                    new_value: { type: 'number' },
                    new_severity: { type: 'string', enum: ['low', 'medium', 'high', 'extreme', 'critical'] },
                },
                required: ['action'],
            },
        },
        title_fixes: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    replacement_title: { type: 'string' },
                },
                required: ['replacement_title'],
            },
        },
        policy_implication_fixes: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    option_id: { type: 'string' },
                    implication_index: { type: 'number' },
                    correct_target: { type: 'string' },
                },
                required: ['option_id', 'implication_index', 'correct_target'],
            },
        },
        role_id_fixes: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    option_id: { type: 'string' },
                    advisor_index: { type: 'number' },
                    correct_role_id: { type: 'string' },
                },
                required: ['option_id', 'advisor_index', 'correct_role_id'],
            },
        },
    },
    required: ['metric_fixes', 'token_fixes', 'severity_fixes', 'title_fixes', 'policy_implication_fixes', 'role_id_fixes'],
};

// Severity → minimum |effect.value| required by the audit contract.
const SEVERITY_MAGNITUDE_THRESHOLD: Record<string, number> = {
    low: 1.5,
    medium: 2.0,
    high: 2.5,
    extreme: 3.5,
    critical: 5.0,
};

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

function buildContextRepairPrompt(
    scenario: BundleScenario,
    invalidMetrics: Array<{ optionId: string; effectIndex: number; badId: string }>,
    inventedTokens: string[],
    severityIssues: Array<{ severity: string; threshold: number; maxObservedMagnitude: number }>,
    titleIssues: Array<{ currentTitle: string; reason: string }>,
    invalidPolicyTargets: Array<{ optionId: string; implicationIndex: number; badTarget: string }>,
    invalidRoleIds: Array<{ optionId: string; advisorIndex: number; badRoleId: string }>,
): string {
    const validMetricList = ALL_METRIC_IDS.join(', ');
    const validTokenSample = ALL_TOKENS.slice(0, 60).join(', ') + ' …(and more)';
    const validRoleList = Array.from(CANONICAL_ROLE_IDS).join(', ');
    const validSettingTargetList = VALID_SETTING_TARGETS.join(', ');

    const optionSummaries = scenario.options.map(o => {
        const effectLines = (o.effects || []).map((e, i) =>
            `  effect[${i}]: targetMetricId="${e.targetMetricId}" value=${e.value}`
        ).join('\n');
        return `Option ${o.id} — "${o.text?.slice(0, 120)}"\n${effectLines}`;
    }).join('\n\n');

    const metricSection = invalidMetrics.length === 0 ? '' : `
## Invalid metric IDs to fix
For each entry below, choose the single best metric from the valid list that fits the scenario context.
${invalidMetrics.map(m => `- option "${m.optionId}", effect[${m.effectIndex}]: "${m.badId}"`).join('\n')}

Valid metrics: ${validMetricList}`;

    const tokenSection = inventedTokens.length === 0 ? '' : `
## Invented tokens to fix
These tokens appear in the scenario text but are NOT in the approved whitelist.
For each, either:
  a) provide a valid replacement_token from the whitelist that fits the context, OR
  b) set replacement_token to null and provide a short replacement_text phrase (plain English, no braces)
${inventedTokens.map(t => `- {${t}}`).join('\n')}

Sample valid tokens: ${validTokenSample}`;

    const severitySection = severityIssues.length === 0 ? '' : `
## Severity ↔ effect-magnitude mismatch
metadata.severity is "${severityIssues[0].severity}" but no effect has |value| ≥ ${severityIssues[0].threshold} (largest observed magnitude = ${severityIssues[0].maxObservedMagnitude.toFixed(2)}).
Choose ONE of:
  a) action="raise-effect" — pick an option_id and effect_index and set new_value so |new_value| ≥ ${severityIssues[0].threshold} (keep the sign matching the effect's intent). Prefer the effect whose metric is most directly hit by this scenario.
  b) action="downgrade-severity" — set new_severity to one step lower (critical→high, extreme→high, high→medium, medium→low). Only choose this when raising any effect would exaggerate the premise.
Severity thresholds: low≥1.5, medium≥2.0, high≥2.5, extreme≥3.5, critical≥5.0.`;

    const titleSection = titleIssues.length === 0 ? '' : `
## Formulaic / malformed title
Current title: "${titleIssues[0].currentTitle}"
Issue: ${titleIssues[0].reason}
Rewrite as 4–10 words, no tokens, no colons/parentheses. FORBIDDEN openers: "Managing", "Balancing", "Handling", "Navigating". FORBIDDEN trailing words: "Crisis", "Response", "Response Options", "Debate", "Decision", "Dilemma", "Challenge", "Conflict".
Good examples: "Drought Emergency Hits Southern Provinces", "Leaked Memo Implicates Finance Minister", "Power Grid Fails During Heatwave".`;

    const policyTargetSection = invalidPolicyTargets.length === 0 ? '' : `
## Invalid policyImplication.target values
${invalidPolicyTargets.map(p => `- option "${p.optionId}", implication[${p.implicationIndex}]: "${p.badTarget}"`).join('\n')}
Valid targets: ${validSettingTargetList}
Choose the single best replacement that matches the option's intent.`;

    const roleIdSection = invalidRoleIds.length === 0 ? '' : `
## Invalid advisor roleIds
${invalidRoleIds.map(r => `- option "${r.optionId}", advisorFeedback[${r.advisorIndex}]: "${r.badRoleId}"`).join('\n')}
Valid roleIds (13 canonical): ${validRoleList}
Choose the role whose portfolio best maps to the bad id (e.g. role_finance→role_economy, role_foreign_affairs→role_diplomacy, role_security→role_defense, role_innovation→role_commerce).`;

    return `You are a scenario repair assistant for a political simulation game.
Given a scenario and a list of issues, return the minimum set of corrections needed.
Do not rewrite prose. Only fix what is listed.

## Scenario
Bundle: ${scenario.metadata?.bundle ?? 'unknown'}
Title: ${scenario.title}
Description: ${scenario.description?.slice(0, 300)}
Severity: ${scenario.metadata?.severity ?? 'unset'}

## Options and effects
${optionSummaries}
${metricSection}
${tokenSection}
${severitySection}
${titleSection}
${policyTargetSection}
${roleIdSection}

Return a JSON object with all six arrays: "metric_fixes", "token_fixes", "severity_fixes", "title_fixes", "policy_implication_fixes", "role_id_fixes".
If there is nothing to fix in a category, return an empty array for that category.`;
}

// ---------------------------------------------------------------------------
// Patch applicator
// ---------------------------------------------------------------------------

function applyContextRepairPatches(
    scenario: BundleScenario,
    response: ContextRepairResponse,
    validMetricIds: Set<string>,
    isValidToken: (t: string) => boolean,
): { applied: number; log: string[] } {
    const log: string[] = [];
    let applied = 0;

    for (const fix of response.metric_fixes ?? []) {
        if (!validMetricIds.has(fix.correct_metric_id)) {
            log.push(`[skip] metric fix for ${fix.option_id}[${fix.effect_index}]: "${fix.correct_metric_id}" not valid`);
            continue;
        }
        const opt = scenario.options.find(o => o.id === fix.option_id);
        const eff = opt?.effects?.[fix.effect_index];
        if (!eff) {
            log.push(`[skip] metric fix: ${fix.option_id}[${fix.effect_index}] not found`);
            continue;
        }
        const old = eff.targetMetricId;
        eff.targetMetricId = fix.correct_metric_id;
        log.push(`metric: ${fix.option_id}[${fix.effect_index}] ${old} → ${fix.correct_metric_id}`);
        applied++;
    }

    for (const fix of response.token_fixes ?? []) {
        const marker = `{${fix.invented_token}}`;

        let replacement: string;
        if (fix.replacement_token && isValidToken(fix.replacement_token)) {
            replacement = `{${fix.replacement_token}}`;
            log.push(`token: {${fix.invented_token}} → {${fix.replacement_token}} (valid token)`);
        } else {
            replacement = fix.replacement_text || fix.invented_token.replace(/_/g, ' ');
            log.push(`token: {${fix.invented_token}} → "${replacement}" (plain text)`);
        }

        const replaceInField = (text: string | undefined): string | undefined =>
            text?.split(marker).join(replacement);

        scenario.title = replaceInField(scenario.title) ?? scenario.title;
        scenario.description = replaceInField(scenario.description) ?? scenario.description;
        for (const opt of scenario.options) {
            opt.text = replaceInField(opt.text) ?? opt.text;
            if (opt.label) opt.label = replaceInField(opt.label) ?? opt.label;
            if (opt.outcomeHeadline) opt.outcomeHeadline = replaceInField(opt.outcomeHeadline);
            if (opt.outcomeSummary) opt.outcomeSummary = replaceInField(opt.outcomeSummary);
            if (opt.outcomeContext) opt.outcomeContext = replaceInField(opt.outcomeContext);
            for (const advisor of ((opt as any).advisorFeedback ?? [])) {
                if (advisor.feedback) advisor.feedback = replaceInField(advisor.feedback) ?? advisor.feedback;
            }
        }
        applied++;
    }

    for (const fix of response.severity_fixes ?? []) {
        if (fix.action === 'raise-effect') {
            if (!fix.option_id || typeof fix.effect_index !== 'number' || typeof fix.new_value !== 'number') {
                log.push(`[skip] severity raise-effect missing fields`);
                continue;
            }
            const opt = scenario.options.find(o => o.id === fix.option_id);
            const eff = opt?.effects?.[fix.effect_index];
            if (!eff) {
                log.push(`[skip] severity raise-effect: ${fix.option_id}[${fix.effect_index}] not found`);
                continue;
            }
            const currentSeverity = scenario.metadata?.severity as string | undefined;
            const threshold = currentSeverity ? SEVERITY_MAGNITUDE_THRESHOLD[currentSeverity] : undefined;
            if (threshold !== undefined && Math.abs(fix.new_value) < threshold) {
                log.push(`[skip] severity raise-effect: |${fix.new_value}| < threshold ${threshold} for severity=${currentSeverity}`);
                continue;
            }
            if (Math.abs(fix.new_value) > 7.0) {
                log.push(`[skip] severity raise-effect: |${fix.new_value}| > 7.0 clamp`);
                continue;
            }
            const oldValue = eff.value;
            eff.value = fix.new_value;
            log.push(`severity: ${fix.option_id}[${fix.effect_index}] value ${oldValue} → ${fix.new_value}`);
            applied++;
        } else if (fix.action === 'downgrade-severity') {
            if (!fix.new_severity) {
                log.push(`[skip] severity downgrade missing new_severity`);
                continue;
            }
            if (!scenario.metadata) scenario.metadata = {} as any;
            const oldSeverity = (scenario.metadata as any).severity;
            (scenario.metadata as any).severity = fix.new_severity;
            log.push(`severity: ${oldSeverity} → ${fix.new_severity}`);
            applied++;
        }
    }

    for (const fix of response.title_fixes ?? []) {
        const replacement = fix.replacement_title?.trim();
        if (!replacement) {
            log.push(`[skip] title fix empty`);
            continue;
        }
        const wordCount = replacement.split(/\s+/).filter(Boolean).length;
        if (wordCount < 4 || wordCount > 10) {
            log.push(`[skip] title fix word-count ${wordCount} outside 4–10: "${replacement}"`);
            continue;
        }
        if (/\{[a-z_]+\}/i.test(replacement)) {
            log.push(`[skip] title fix contains token: "${replacement}"`);
            continue;
        }
        if (
            /\b(response(\s+options)?|crisis|crises|challenge|conflict|dilemma|debate|decision|dispute|standoff|transition)\s*$/i.test(replacement) ||
            /^(managing|balancing|handling|navigating|addressing)\s+/i.test(replacement)
        ) {
            log.push(`[skip] title fix still formulaic: "${replacement}"`);
            continue;
        }
        const oldTitle = scenario.title;
        scenario.title = replacement;
        log.push(`title: "${oldTitle}" → "${replacement}"`);
        applied++;
    }

    for (const fix of response.policy_implication_fixes ?? []) {
        if (!VALID_SETTING_TARGETS.includes(fix.correct_target as any)) {
            log.push(`[skip] policy-target fix for ${fix.option_id}[${fix.implication_index}]: "${fix.correct_target}" not valid`);
            continue;
        }
        const opt = scenario.options.find(o => o.id === fix.option_id);
        const impl = opt?.policyImplications?.[fix.implication_index];
        if (!impl) {
            log.push(`[skip] policy-target fix: ${fix.option_id}[${fix.implication_index}] not found`);
            continue;
        }
        const oldTarget = impl.target;
        impl.target = fix.correct_target;
        log.push(`policy-target: ${fix.option_id}[${fix.implication_index}] ${oldTarget} → ${fix.correct_target}`);
        applied++;
    }

    for (const fix of response.role_id_fixes ?? []) {
        if (!CANONICAL_ROLE_IDS.has(fix.correct_role_id)) {
            log.push(`[skip] role-id fix for ${fix.option_id}[${fix.advisor_index}]: "${fix.correct_role_id}" not canonical`);
            continue;
        }
        const opt = scenario.options.find(o => o.id === fix.option_id);
        const advisor = (opt as any)?.advisorFeedback?.[fix.advisor_index];
        if (!advisor) {
            log.push(`[skip] role-id fix: ${fix.option_id}[${fix.advisor_index}] not found`);
            continue;
        }
        const oldRoleId = advisor.roleId;
        advisor.roleId = fix.correct_role_id;
        log.push(`role-id: ${fix.option_id}[${fix.advisor_index}] ${oldRoleId} → ${fix.correct_role_id}`);
        applied++;
    }

    return { applied, log };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export interface ContextRepairResult {
    applied: boolean;
    log: string[];
}

export async function contextRepair(
    scenario: BundleScenario,
    issues: Issue[],
    validMetricIds: Set<string>,
    isValidToken: (t: string) => boolean,
    modelConfig?: GenerationModelConfig,
): Promise<ContextRepairResult> {
    const invalidMetricIssues = issues.filter(i => i.rule === 'invalid-metric-id');
    const invalidTokenIssues = issues.filter(i => i.rule === 'invalid-token');
    const severityIssueEntries = issues.filter(i => i.rule === 'severity-effect-mismatch');
    const titleIssueEntries = issues.filter(i => i.rule === 'formulaic-title' || i.rule === 'title-too-short' || i.rule === 'title-too-long');
    const policyTargetIssueEntries = issues.filter(i => i.rule === 'invalid-policy-target');
    const roleIdIssueEntries = issues.filter(i => i.rule === 'invalid-role-id');

    if (
        invalidMetricIssues.length === 0 &&
        invalidTokenIssues.length === 0 &&
        severityIssueEntries.length === 0 &&
        titleIssueEntries.length === 0 &&
        policyTargetIssueEntries.length === 0 &&
        roleIdIssueEntries.length === 0
    ) {
        return { applied: false, log: [] };
    }

    const invalidMetrics: Array<{ optionId: string; effectIndex: number; badId: string }> = [];
    for (const issue of invalidMetricIssues) {
        // target format: "options[N]/effects[M]"
        const match = issue.target.match(/options\[(\d+)\]\/effects\[(\d+)\]/) ??
                      issue.target.match(/opt_[a-z]+\/effects\[(\d+)\]/);
        if (match) {
            const optIndex = parseInt(match[1], 10);
            const effIndex = parseInt(match[2] ?? match[1], 10);
            const opt = scenario.options[optIndex] ?? scenario.options.find((o, i) => issue.target.includes(o.id));
            const eff = opt?.effects?.[effIndex];
            if (opt && eff) {
                invalidMetrics.push({ optionId: opt.id, effectIndex: effIndex, badId: eff.targetMetricId });
            }
        } else {
            // Fallback: extract from message "metric_X is invalid"
            const badId = issue.message.match(/"([^"]+)" is invalid/)?.[1];
            if (badId) {
                for (const opt of scenario.options) {
                    (opt.effects || []).forEach((eff, i) => {
                        if (eff.targetMetricId === badId && !invalidMetrics.some(m => m.optionId === opt.id && m.effectIndex === i)) {
                            invalidMetrics.push({ optionId: opt.id, effectIndex: i, badId });
                        }
                    });
                }
            }
        }
    }

    const inventedTokens = invalidTokenIssues
        .map(i => i.message.match(/\{([a-z_]+)\}/)?.[1])
        .filter((t): t is string => !!t);

    const severityIssues: Array<{ severity: string; threshold: number; maxObservedMagnitude: number }> = [];
    if (severityIssueEntries.length > 0) {
        const severity = (scenario.metadata as any)?.severity as string | undefined;
        if (severity && SEVERITY_MAGNITUDE_THRESHOLD[severity] !== undefined) {
            const threshold = SEVERITY_MAGNITUDE_THRESHOLD[severity];
            const allEffects = scenario.options.flatMap(o => o.effects ?? []);
            const maxObservedMagnitude = allEffects.reduce((max, e) => {
                const v = Number(e?.value);
                return Number.isFinite(v) && Math.abs(v) > max ? Math.abs(v) : max;
            }, 0);
            severityIssues.push({ severity, threshold, maxObservedMagnitude });
        }
    }

    const titleIssues: Array<{ currentTitle: string; reason: string }> = titleIssueEntries.length > 0
        ? [{ currentTitle: scenario.title ?? '', reason: titleIssueEntries[0].message }]
        : [];

    const invalidPolicyTargets: Array<{ optionId: string; implicationIndex: number; badTarget: string }> = [];
    for (const issue of policyTargetIssueEntries) {
        const optIdMatch = issue.message.match(/Option\s+([A-Za-z0-9_]+)/);
        const optionId = optIdMatch?.[1];
        const opt = optionId ? scenario.options.find(o => o.id === optionId) : undefined;
        if (!opt?.policyImplications) continue;
        opt.policyImplications.forEach((impl: any, implicationIndex: number) => {
            if (!VALID_SETTING_TARGETS.includes(impl?.target)) {
                if (!invalidPolicyTargets.some(p => p.optionId === opt.id && p.implicationIndex === implicationIndex)) {
                    invalidPolicyTargets.push({ optionId: opt.id, implicationIndex, badTarget: impl?.target ?? '(missing)' });
                }
            }
        });
    }

    const invalidRoleIds: Array<{ optionId: string; advisorIndex: number; badRoleId: string }> = [];
    if (roleIdIssueEntries.length > 0) {
        for (const opt of scenario.options) {
            const advisors = (opt as any).advisorFeedback ?? [];
            advisors.forEach((advisor: any, advisorIndex: number) => {
                if (advisor?.roleId && !CANONICAL_ROLE_IDS.has(advisor.roleId)) {
                    invalidRoleIds.push({ optionId: opt.id, advisorIndex, badRoleId: advisor.roleId });
                }
            });
        }
    }

    const prompt = buildContextRepairPrompt(
        scenario,
        invalidMetrics,
        inventedTokens,
        severityIssues,
        titleIssues,
        invalidPolicyTargets,
        invalidRoleIds,
    );
    const model = resolvePhaseModel(modelConfig, 'repair');
    const result = await callModelProvider<ContextRepairResponse>(
        CONTEXT_REPAIR_CONFIG,
        prompt,
        CONTEXT_REPAIR_SCHEMA,
        model,
    );

    if (!result.data) {
        return { applied: false, log: [`context-repair LLM call failed: ${result.error}`] };
    }

    const { applied, log } = applyContextRepairPatches(scenario, result.data, validMetricIds, isValidToken);
    return { applied: applied > 0, log };
}
