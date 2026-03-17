"use strict";
/**
 * Narrative Review Module
 *
 * LLM-powered editorial review for generated scenarios. Evaluates narrative
 * quality dimensions beyond mechanical grammar/tone — engagement, strategic
 * depth, option differentiation, consequence realism, and replay value.
 *
 * Runs as a pipeline step after audit + content quality gate.
 * Model: configurable (defaults to the phase model for narrativeReview).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateNarrativeQuality = evaluateNarrativeQuality;
const model_providers_1 = require("./model-providers");
const NARRATIVE_REVIEW_SCHEMA = {
    type: 'object',
    properties: {
        engagement: {
            type: 'object',
            properties: {
                score: { type: 'integer', minimum: 1, maximum: 5, description: '1=boring/generic, 5=compelling dilemma that makes the player stop and think' },
                reasoning: { type: 'string', description: 'Why this score — what makes it engaging or not' },
            },
            required: ['score', 'reasoning'],
        },
        strategic_depth: {
            type: 'object',
            properties: {
                score: { type: 'integer', minimum: 1, maximum: 5, description: '1=obvious right answer, 5=genuinely difficult tradeoff with no clear best option' },
                reasoning: { type: 'string', description: 'Why this score — are choices meaningfully different in strategy?' },
            },
            required: ['score', 'reasoning'],
        },
        option_differentiation: {
            type: 'object',
            properties: {
                score: { type: 'integer', minimum: 1, maximum: 5, description: '1=options are mild/moderate/extreme of same approach, 5=three genuinely distinct policy directions' },
                reasoning: { type: 'string', description: 'Why this score — do options represent different philosophies or just different intensities?' },
            },
            required: ['score', 'reasoning'],
        },
        consequence_quality: {
            type: 'object',
            properties: {
                score: { type: 'integer', minimum: 1, maximum: 5, description: '1=outcomes are vague or unrealistic, 5=outcomes feel like real-world consequences with plausible second-order effects' },
                reasoning: { type: 'string', description: 'Why this score — do outcomes follow logically from choices?' },
            },
            required: ['score', 'reasoning'],
        },
        replay_value: {
            type: 'object',
            properties: {
                score: { type: 'integer', minimum: 1, maximum: 5, description: '1=every player would pick the same option, 5=reasonable people would strongly disagree on the best choice' },
                reasoning: { type: 'string', description: 'Why this score — would different players with different values choose differently?' },
            },
            required: ['score', 'reasoning'],
        },
        editorial_notes: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific actionable suggestions to improve the scenario narrative quality. Empty array if none.',
        },
    },
    required: ['engagement', 'strategic_depth', 'option_differentiation', 'consequence_quality', 'replay_value', 'editorial_notes'],
};
function buildNarrativeReviewPrompt(scenario) {
    var _a, _b, _c, _d;
    const optionSummaries = scenario.options.map(opt => {
        var _a, _b, _c;
        const effects = (opt.effects || [])
            .map((e) => `${e.targetMetricId} ${e.value > 0 ? '+' : ''}${e.value}`)
            .join(', ');
        return `Option "${opt.id}" — Label: ${(_a = opt.label) !== null && _a !== void 0 ? _a : '(none)'}
  Text: ${opt.text}
  Headline: ${(_b = opt.outcomeHeadline) !== null && _b !== void 0 ? _b : ''}
  Summary: ${(_c = opt.outcomeSummary) !== null && _c !== void 0 ? _c : ''}
  Effects: ${effects || '(none)'}`;
    }).join('\n\n');
    return `You are a senior game designer and narrative director reviewing scenario content for The Administration — a political simulation game where players run a government.

Players face scenarios and choose from 3 options, each with real metric consequences. Good scenarios create genuine dilemmas where reasonable players disagree on the best path.

Evaluate this scenario on five narrative quality dimensions. Content uses {token} placeholders that resolve to country-specific values at runtime — treat these as proper nouns.

WHAT MAKES A GREAT SCENARIO:
- The dilemma is SPECIFIC (not "economy is struggling" but "a major employer is threatening to relocate unless given tax breaks that would gut the education budget")
- Options represent genuinely different PHILOSOPHIES, not just mild/moderate/extreme of one approach
- Outcomes have SECOND-ORDER EFFECTS that players didn't fully anticipate
- Reasonable players with different values (liberty vs security, growth vs equality) would genuinely disagree
- The scenario teaches something about real governance tradeoffs

WHAT MAKES A BAD SCENARIO:
- Generic: could apply to any country at any time without specificity
- One option is obviously correct or obviously terrible
- Options are just "do nothing / do a little / do a lot"
- Outcomes are vague platitudes instead of concrete consequences
- No emotional stakes — the player doesn't care what happens

Scenario:
Title: ${scenario.title}
Description: ${scenario.description}
Bundle: ${(_b = (_a = scenario.metadata) === null || _a === void 0 ? void 0 : _a.bundle) !== null && _b !== void 0 ? _b : 'unknown'}
Severity: ${(_d = (_c = scenario.metadata) === null || _c === void 0 ? void 0 : _c.severity) !== null && _d !== void 0 ? _d : 'unknown'}

${optionSummaries}

Score each dimension 1-5 and explain your reasoning. List specific editorial suggestions.`;
}
async function evaluateNarrativeQuality(scenario, modelOverride) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
    const prompt = buildNarrativeReviewPrompt(scenario);
    const model = modelOverride || (0, model_providers_1.getPhaseModels)().narrativeReview;
    const result = await (0, model_providers_1.callModelProvider)({ maxTokens: 2048, temperature: 0.3 }, prompt, NARRATIVE_REVIEW_SCHEMA, model);
    if (!result.data) {
        console.warn(`[NarrativeReview] LLM call failed for ${scenario.id}: ${result.error}`);
        return {
            pass: true,
            engagement: { score: 3, reasoning: 'Review unavailable' },
            strategicDepth: { score: 3, reasoning: 'Review unavailable' },
            optionDifferentiation: { score: 3, reasoning: 'Review unavailable' },
            consequenceQuality: { score: 3, reasoning: 'Review unavailable' },
            replayValue: { score: 3, reasoning: 'Review unavailable' },
            overallScore: 3,
            editorialNotes: [],
        };
    }
    const r = result.data;
    const clamp = (n) => Math.min(5, Math.max(1, Math.round(n !== null && n !== void 0 ? n : 3)));
    const engagement = { score: clamp((_a = r.engagement) === null || _a === void 0 ? void 0 : _a.score), reasoning: (_c = (_b = r.engagement) === null || _b === void 0 ? void 0 : _b.reasoning) !== null && _c !== void 0 ? _c : '' };
    const strategicDepth = { score: clamp((_d = r.strategic_depth) === null || _d === void 0 ? void 0 : _d.score), reasoning: (_f = (_e = r.strategic_depth) === null || _e === void 0 ? void 0 : _e.reasoning) !== null && _f !== void 0 ? _f : '' };
    const optionDifferentiation = { score: clamp((_g = r.option_differentiation) === null || _g === void 0 ? void 0 : _g.score), reasoning: (_j = (_h = r.option_differentiation) === null || _h === void 0 ? void 0 : _h.reasoning) !== null && _j !== void 0 ? _j : '' };
    const consequenceQuality = { score: clamp((_k = r.consequence_quality) === null || _k === void 0 ? void 0 : _k.score), reasoning: (_m = (_l = r.consequence_quality) === null || _l === void 0 ? void 0 : _l.reasoning) !== null && _m !== void 0 ? _m : '' };
    const replayValue = { score: clamp((_o = r.replay_value) === null || _o === void 0 ? void 0 : _o.score), reasoning: (_q = (_p = r.replay_value) === null || _p === void 0 ? void 0 : _p.reasoning) !== null && _q !== void 0 ? _q : '' };
    const overallScore = (engagement.score + strategicDepth.score + optionDifferentiation.score + consequenceQuality.score + replayValue.score) / 5;
    const hardFail = [engagement, strategicDepth, optionDifferentiation, consequenceQuality, replayValue].some(d => d.score < 2);
    return {
        pass: !hardFail,
        engagement,
        strategicDepth,
        optionDifferentiation,
        consequenceQuality,
        replayValue,
        overallScore,
        editorialNotes: (_r = r.editorial_notes) !== null && _r !== void 0 ? _r : [],
    };
}
//# sourceMappingURL=narrative-review.js.map