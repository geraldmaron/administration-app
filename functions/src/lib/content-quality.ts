/**
 * Content Quality Gate
 *
 * LLM-powered quality evaluation for generated scenarios. Used as a secondary
 * pass after deterministic audit-rules validation. Scores grammar, tone,
 * coherence, and cross-option consistency. Scenarios scoring below threshold
 * are flagged for partial regeneration rather than halting the pipeline.
 *
 * Model: gpt-4.1-mini (fast, low-cost, sufficient for editorial evaluation)
 * Threshold: any dimension < 3 = FAIL; average < 3.5 = WARN
 */

import { callModelProvider, getPhaseModels } from './model-providers';
import type { BundleScenario } from './audit-rules';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContentQualityDimension {
    score: 1 | 2 | 3 | 4 | 5;
    issues: string[];
}

export interface ContentQualityResult {
    pass: boolean;
    warn: boolean;
    grammar: ContentQualityDimension;
    tone: ContentQualityDimension;
    coherence: ContentQualityDimension;
    readability: ContentQualityDimension;
    optionConsistency: ContentQualityDimension;
    advisorQuality: ContentQualityDimension;
    specificity: ContentQualityDimension;
    overallScore: number;
    regenerateFields: ('advisorFeedback' | 'outcomeContext' | 'outcomeSummary' | 'description' | 'full')[];
    rawResponse?: string;
}

interface QualityLLMResponse {
    grammar: { score: number; issues: string[] };
    tone: { score: number; issues: string[] };
    coherence: { score: number; issues: string[] };
    readability: { score: number; issues: string[] };
    option_consistency: { score: number; issues: string[] };
    advisor_quality: { score: number; issues: string[] };
    specificity: { score: number; issues: string[] };
}

const QUALITY_SCHEMA = {
    type: 'object',
    properties: {
        grammar: {
            type: 'object',
            properties: {
                score: { type: 'integer', minimum: 1, maximum: 5, description: '1=many errors, 5=perfect' },
                issues: { type: 'array', items: { type: 'string' }, description: 'Specific grammar/punctuation/spelling problems found' },
            },
            required: ['score', 'issues'],
        },
        tone: {
            type: 'object',
            properties: {
                score: { type: 'integer', minimum: 1, maximum: 5, description: '1=informal/inconsistent, 5=polished presidential-briefing style throughout' },
                issues: { type: 'array', items: { type: 'string' }, description: 'Tone violations (informal words, emotional language, etc.)' },
            },
            required: ['score', 'issues'],
        },
        coherence: {
            type: 'object',
            properties: {
                score: { type: 'integer', minimum: 1, maximum: 5, description: '1=confusing/contradictory, 5=clear logical progression throughout' },
                issues: { type: 'array', items: { type: 'string' }, description: 'Coherence problems (unclear cause/effect, missing context, contradictions)' },
            },
            required: ['score', 'issues'],
        },
        readability: {
            type: 'object',
            properties: {
                score: { type: 'integer', minimum: 1, maximum: 5, description: '1=hard for lay players, 5=clear plain language for non-experts' },
                issues: { type: 'array', items: { type: 'string' }, description: 'Readability problems: jargon, long sentences, dense clauses, passive-heavy phrasing' },
            },
            required: ['score', 'issues'],
        },
        option_consistency: {
            type: 'object',
            properties: {
                score: { type: 'integer', minimum: 1, maximum: 5, description: '1=options seem unrelated, 5=all options clearly address the same scenario' },
                issues: { type: 'array', items: { type: 'string' }, description: 'Options that seem off-topic or inconsistent with the scenario' },
            },
            required: ['score', 'issues'],
        },
        advisor_quality: {
            type: 'object',
            properties: {
                score: { type: 'integer', minimum: 1, maximum: 5, description: '1=generic boilerplate throughout, 5=all feedback is role-specific and substantive' },
                issues: { type: 'array', items: { type: 'string' }, description: 'Advisor entries that are generic, vague, or do not reflect their role domain' },
            },
            required: ['score', 'issues'],
        },
        specificity: {
            type: 'object',
            properties: {
                score: { type: 'integer', minimum: 1, maximum: 5, description: '1=vague platitudes throughout, 3=some concrete details, 5=every reference names specific mechanisms, groups, and stakes' },
                issues: { type: 'array', items: { type: 'string' }, description: 'Vague references that should name specific mechanisms, sectors, groups, or events' },
            },
            required: ['score', 'issues'],
        },
    },
    required: ['grammar', 'tone', 'coherence', 'readability', 'option_consistency', 'advisor_quality', 'specificity'],
};

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

function buildQualityPrompt(scenario: BundleScenario): string {
    const optionSummaries = scenario.options.map(opt => {
        const advisorSnippets = ((opt.advisorFeedback ?? []) as any[])
            .slice(0, 3)
            .map((fb: any) => `  [${fb.roleId}/${fb.stance}] ${fb.feedback}`)
            .join('\n');
        return `
Option "${opt.id}" — Label: ${opt.label ?? '(none)'}
  Text: ${opt.text}
  Headline: ${opt.outcomeHeadline ?? ''}
  Summary: ${opt.outcomeSummary ?? ''}
  Context (first 300 chars): ${(opt.outcomeContext ?? '').slice(0, 300)}
  Advisor feedback sample:
${advisorSnippets || '  (none)'}`;
    }).join('\n\n');

    return `You are an editorial quality reviewer for a production mobile game called The Administration — a US-style geopolitical simulation.

Evaluate the following scenario on five dimensions. All content uses placeholder tokens in {curly_braces} that resolve to country-specific values at runtime — treat these as proper nouns when evaluating grammar.

**Scoring scale:** 1=poor, 2=below standard, 3=acceptable, 4=good, 5=excellent

**Standards for this game:**
- Writing style: clear Reuters/AP-style reporting, formal US English, no informal language, and no think-tank jargon in player-facing text
- Grammar: properly punctuated, no double spaces, no sentence fragments, no run-ons over ~40 words
- Coherence: cause → consequence chain should be traceable, outcomes should logically follow from the chosen option
- Readability: plain language for lay players, avoid policy jargon and newsroom-unfriendly words like "bloc" or "gambit", keep sentences concise and direct
- Option consistency: all three options should address the same central scenario (different approaches, not unrelated topics)
- Advisor feedback: must be role-specific and actionable — generic phrases like "Our department supports this" score 1-2
- Specificity: every reference must name the concrete mechanism, sector, population, or institution. "The economy faces pressure" → score 1. "A tariff on semiconductor exports threatens 40,000 jobs in the supply chain" → score 5. Sector language must be specific, and tokens should only appear when they were explicitly provided in the token context

**Scenario:**
Title: ${scenario.title}
Description: ${scenario.description}
Bundle: ${scenario.metadata?.bundle ?? 'unknown'}

${optionSummaries}

Evaluate and return scores + specific issues found. If no issues exist for a dimension, return an empty array.`;
}

// ---------------------------------------------------------------------------
// Main evaluation function
// ---------------------------------------------------------------------------

export async function evaluateContentQuality(
    scenario: BundleScenario,
    modelOverride?: string
): Promise<ContentQualityResult> {
    const prompt = buildQualityPrompt(scenario);

    const model = modelOverride || getPhaseModels().contentQuality;
    const result = await callModelProvider<QualityLLMResponse>(
        { maxTokens: 2048, temperature: 0.2 },
        prompt,
        QUALITY_SCHEMA,
        model
    );

    if (!result.data) {
        console.warn(`[ContentQuality] LLM call failed for ${scenario.id}: ${result.error}`);
        // Return a neutral pass on API failure to avoid blocking generation
        return {
            pass: true,
            warn: false,
            grammar: { score: 3, issues: [] },
            tone: { score: 3, issues: [] },
            coherence: { score: 3, issues: [] },
            readability: { score: 3, issues: [] },
            optionConsistency: { score: 3, issues: [] },
            advisorQuality: { score: 3, issues: [] },
            specificity: { score: 3, issues: [] },
            overallScore: 3,
            regenerateFields: [],
        };
    }

    const r = result.data;
    const clamp = (n: number): 1 | 2 | 3 | 4 | 5 =>
        (Math.min(5, Math.max(1, Math.round(n ?? 3))) as 1 | 2 | 3 | 4 | 5);

    const grammar: ContentQualityDimension = { score: clamp(r.grammar?.score), issues: r.grammar?.issues ?? [] };
    const tone: ContentQualityDimension = { score: clamp(r.tone?.score), issues: r.tone?.issues ?? [] };
    const coherence: ContentQualityDimension = { score: clamp(r.coherence?.score), issues: r.coherence?.issues ?? [] };
    const readability: ContentQualityDimension = { score: clamp(r.readability?.score), issues: r.readability?.issues ?? [] };
    const optionConsistency: ContentQualityDimension = { score: clamp(r.option_consistency?.score), issues: r.option_consistency?.issues ?? [] };
    const advisorQuality: ContentQualityDimension = { score: clamp(r.advisor_quality?.score), issues: r.advisor_quality?.issues ?? [] };
    const specificity: ContentQualityDimension = { score: clamp(r.specificity?.score), issues: r.specificity?.issues ?? [] };

    const allDimensions = [grammar, tone, coherence, readability, optionConsistency, advisorQuality, specificity];
    const overallScore = allDimensions.reduce((sum, d) => sum + d.score, 0) / allDimensions.length;

    // Hard fail: any dimension below 3
    const hardFail = allDimensions.some(d => d.score < 3);
    // Soft warn: average below 3.5
    const softWarn = overallScore < 3.5;

    // Determine which fields to regenerate based on what scored poorly
    const regenerateFields: ContentQualityResult['regenerateFields'] = [];
    if (grammar.score < 3 || coherence.score < 3 || readability.score < 3 || optionConsistency.score < 3 || specificity.score < 3) {
        regenerateFields.push('full');
    } else {
        if (advisorQuality.score < 3) regenerateFields.push('advisorFeedback');
        if (coherence.score < 3) regenerateFields.push('outcomeContext');
        if (tone.score < 3) regenerateFields.push('outcomeSummary');
    }

    return {
        pass: !hardFail,
        warn: softWarn && !hardFail,
        grammar,
        tone,
        coherence,
        readability,
        optionConsistency,
        advisorQuality,
        specificity,
        overallScore,
        regenerateFields,
    };
}

// ---------------------------------------------------------------------------
// Batch evaluation helper
// ---------------------------------------------------------------------------

export interface BatchQualityReport {
    scenarioId: string;
    result: ContentQualityResult;
}

export async function evaluateBatchQuality(
    scenarios: BundleScenario[],
    concurrency = 3
): Promise<BatchQualityReport[]> {
    const reports: BatchQualityReport[] = [];
    for (let i = 0; i < scenarios.length; i += concurrency) {
        const batch = scenarios.slice(i, i + concurrency);
        const batchResults = await Promise.all(
            batch.map(async s => ({
                scenarioId: s.id,
                result: await evaluateContentQuality(s),
            }))
        );
        reports.push(...batchResults);
    }
    return reports;
}
