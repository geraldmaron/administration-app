import { callModelProvider, type ModelConfig } from './model-providers';
import { ALL_METRIC_IDS } from '../data/schemas/metricIds';
import { ALL_TOKENS } from './token-registry';
import type { BundleScenario, Issue } from './audit-rules';
import type { GenerationModelConfig } from '../shared/generation-contract';
import { resolvePhaseModel } from './generation-models';

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

interface ContextRepairResponse {
    metric_fixes: MetricFix[];
    token_fixes: TokenFix[];
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
    },
    required: ['metric_fixes', 'token_fixes'],
};

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

function buildContextRepairPrompt(
    scenario: BundleScenario,
    invalidMetrics: Array<{ optionId: string; effectIndex: number; badId: string }>,
    inventedTokens: string[],
): string {
    const validMetricList = ALL_METRIC_IDS.join(', ');
    const validTokenSample = ALL_TOKENS.slice(0, 60).join(', ') + ' …(and more)';

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

    return `You are a scenario repair assistant for a political simulation game.
Given a scenario and a list of issues, return the minimum set of corrections needed.
Do not rewrite prose. Only fix what is listed.

## Scenario
Bundle: ${scenario.metadata?.bundle ?? 'unknown'}
Title: ${scenario.title}
Description: ${scenario.description?.slice(0, 300)}

## Options and effects
${optionSummaries}
${metricSection}
${tokenSection}

Return a JSON object with "metric_fixes" and "token_fixes" arrays.
If there is nothing to fix in a category, return an empty array.`;
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

    for (const fix of response.metric_fixes) {
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

    for (const fix of response.token_fixes) {
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

    if (invalidMetricIssues.length === 0 && invalidTokenIssues.length === 0) {
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

    const prompt = buildContextRepairPrompt(scenario, invalidMetrics, inventedTokens);
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
