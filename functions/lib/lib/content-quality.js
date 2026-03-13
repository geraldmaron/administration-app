"use strict";
/**
 * Content Quality Gate
 *
 * LLM-powered quality evaluation for generated scenarios. Used as a secondary
 * pass after deterministic audit-rules validation. Scores grammar, tone,
 * coherence, and cross-option consistency. Scenarios scoring below threshold
 * are flagged for partial regeneration rather than halting the pipeline.
 *
 * Model: gpt-4o-mini (fast, low-cost, sufficient for editorial evaluation)
 * Threshold: any dimension < 3 = FAIL; average < 3.5 = WARN
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateContentQuality = evaluateContentQuality;
exports.evaluateBatchQuality = evaluateBatchQuality;
const model_providers_1 = require("./model-providers");
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
    },
    required: ['grammar', 'tone', 'coherence', 'readability', 'option_consistency', 'advisor_quality'],
};
// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------
function buildQualityPrompt(scenario) {
    var _a, _b;
    const optionSummaries = scenario.options.map(opt => {
        var _a, _b, _c, _d, _e;
        const advisorSnippets = ((_a = opt.advisorFeedback) !== null && _a !== void 0 ? _a : [])
            .slice(0, 3)
            .map((fb) => `  [${fb.roleId}/${fb.stance}] ${fb.feedback}`)
            .join('\n');
        return `
Option "${opt.id}" — Label: ${(_b = opt.label) !== null && _b !== void 0 ? _b : '(none)'}
  Text: ${opt.text}
  Headline: ${(_c = opt.outcomeHeadline) !== null && _c !== void 0 ? _c : ''}
  Summary: ${(_d = opt.outcomeSummary) !== null && _d !== void 0 ? _d : ''}
  Context (first 300 chars): ${((_e = opt.outcomeContext) !== null && _e !== void 0 ? _e : '').slice(0, 300)}
  Advisor feedback sample:
${advisorSnippets || '  (none)'}`;
    }).join('\n\n');
    return `You are an editorial quality reviewer for a production mobile game called The Administration — a US-style geopolitical simulation.

Evaluate the following scenario on five dimensions. All content uses placeholder tokens in {curly_braces} that resolve to country-specific values at runtime — treat these as proper nouns when evaluating grammar.

**Scoring scale:** 1=poor, 2=below standard, 3=acceptable, 4=good, 5=excellent

**Standards for this game:**
- Writing style: polished presidential-briefing tone, formal US English, no informal language
- Grammar: properly punctuated, no double spaces, no sentence fragments, no run-ons over ~40 words
- Coherence: cause → consequence chain should be traceable, outcomes should logically follow from the chosen option
- Readability: plain language for lay players, avoid policy jargon, keep sentences concise and direct
- Option consistency: all three options should address the same central scenario (different approaches, not unrelated topics)
- Advisor feedback: must be role-specific and actionable — generic phrases like "Our department supports this" score 1-2

**Scenario:**
Title: ${scenario.title}
Description: ${scenario.description}
Bundle: ${(_b = (_a = scenario.metadata) === null || _a === void 0 ? void 0 : _a.bundle) !== null && _b !== void 0 ? _b : 'unknown'}

${optionSummaries}

Evaluate and return scores + specific issues found. If no issues exist for a dimension, return an empty array.`;
}
// ---------------------------------------------------------------------------
// Main evaluation function
// ---------------------------------------------------------------------------
async function evaluateContentQuality(scenario) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
    const prompt = buildQualityPrompt(scenario);
    const result = await (0, model_providers_1.callModelProvider)({ maxTokens: 2048, temperature: 0.2 }, prompt, QUALITY_SCHEMA, 'gpt-4o-mini');
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
            overallScore: 3,
            regenerateFields: [],
        };
    }
    const r = result.data;
    const clamp = (n) => Math.min(5, Math.max(1, Math.round(n !== null && n !== void 0 ? n : 3)));
    const grammar = { score: clamp((_a = r.grammar) === null || _a === void 0 ? void 0 : _a.score), issues: (_c = (_b = r.grammar) === null || _b === void 0 ? void 0 : _b.issues) !== null && _c !== void 0 ? _c : [] };
    const tone = { score: clamp((_d = r.tone) === null || _d === void 0 ? void 0 : _d.score), issues: (_f = (_e = r.tone) === null || _e === void 0 ? void 0 : _e.issues) !== null && _f !== void 0 ? _f : [] };
    const coherence = { score: clamp((_g = r.coherence) === null || _g === void 0 ? void 0 : _g.score), issues: (_j = (_h = r.coherence) === null || _h === void 0 ? void 0 : _h.issues) !== null && _j !== void 0 ? _j : [] };
    const readability = { score: clamp((_k = r.readability) === null || _k === void 0 ? void 0 : _k.score), issues: (_m = (_l = r.readability) === null || _l === void 0 ? void 0 : _l.issues) !== null && _m !== void 0 ? _m : [] };
    const optionConsistency = { score: clamp((_o = r.option_consistency) === null || _o === void 0 ? void 0 : _o.score), issues: (_q = (_p = r.option_consistency) === null || _p === void 0 ? void 0 : _p.issues) !== null && _q !== void 0 ? _q : [] };
    const advisorQuality = { score: clamp((_r = r.advisor_quality) === null || _r === void 0 ? void 0 : _r.score), issues: (_t = (_s = r.advisor_quality) === null || _s === void 0 ? void 0 : _s.issues) !== null && _t !== void 0 ? _t : [] };
    const overallScore = (grammar.score + tone.score + coherence.score + readability.score + optionConsistency.score + advisorQuality.score) / 6;
    // Hard fail: any dimension below 3
    const hardFail = [grammar, tone, coherence, readability, optionConsistency, advisorQuality].some(d => d.score < 3);
    // Soft warn: average below 3.5
    const softWarn = overallScore < 3.5;
    // Determine which fields to regenerate based on what scored poorly
    const regenerateFields = [];
    if (grammar.score < 3 || coherence.score < 3 || readability.score < 3 || optionConsistency.score < 3) {
        regenerateFields.push('full');
    }
    else {
        if (advisorQuality.score < 3)
            regenerateFields.push('advisorFeedback');
        if (coherence.score < 3)
            regenerateFields.push('outcomeContext');
        if (tone.score < 3)
            regenerateFields.push('outcomeSummary');
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
        overallScore,
        regenerateFields,
    };
}
async function evaluateBatchQuality(scenarios, concurrency = 3) {
    const reports = [];
    for (let i = 0; i < scenarios.length; i += concurrency) {
        const batch = scenarios.slice(i, i + concurrency);
        const batchResults = await Promise.all(batch.map(async (s) => ({
            scenarioId: s.id,
            result: await evaluateContentQuality(s),
        })));
        reports.push(...batchResults);
    }
    return reports;
}
//# sourceMappingURL=content-quality.js.map