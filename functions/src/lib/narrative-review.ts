/**
 * Narrative Review Module
 *
 * LLM-powered editorial review for generated scenarios. Evaluates narrative
 * quality dimensions beyond mechanical grammar/tone — engagement, strategic
 * depth, option differentiation, consequence realism, replay value, and
 * political realism.
 *
 * Runs as a pipeline step after audit + content quality gate.
 * Model: configurable (defaults to the phase model for narrativeReview).
 */

import { callModelProvider, getPhaseModels } from './model-providers';
import type { BundleScenario } from './audit-rules';

export interface NarrativeQualityDimension {
  score: 1 | 2 | 3 | 4 | 5;
  reasoning: string;
}

export interface NarrativeReviewResult {
  pass: boolean;
  engagement: NarrativeQualityDimension;
  strategicDepth: NarrativeQualityDimension;
  optionDifferentiation: NarrativeQualityDimension;
  consequenceQuality: NarrativeQualityDimension;
  replayValue: NarrativeQualityDimension;
  politicalRealism: NarrativeQualityDimension;
  overallScore: number;
  editorialNotes: string[];
}

interface NarrativeReviewLLMResponse {
  engagement: { score: number; reasoning: string };
  strategic_depth: { score: number; reasoning: string };
  option_differentiation: { score: number; reasoning: string };
  consequence_quality: { score: number; reasoning: string };
  replay_value: { score: number; reasoning: string };
  political_realism: { score: number; reasoning: string };
  editorial_notes: string[];
}

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
    political_realism: {
      type: 'object',
      properties: {
        score: { type: 'integer', minimum: 1, maximum: 5, description: '1=options are things no real government would do or consequences don\'t follow from the described actions, 5=all options are plausible state actions grounded in how ministries, courts, and cabinets actually operate' },
        reasoning: { type: 'string', description: 'Are the options things a real government could implement through normal institutional channels? Do the metric consequences follow logically from the mechanisms described in the option text?' },
      },
      required: ['score', 'reasoning'],
    },
    editorial_notes: {
      type: 'array',
      items: { type: 'string' },
      description: 'Specific actionable suggestions to improve the scenario narrative quality. Empty array if none.',
    },
  },
  required: ['engagement', 'strategic_depth', 'option_differentiation', 'consequence_quality', 'replay_value', 'political_realism', 'editorial_notes'],
};

function buildNarrativeReviewPrompt(scenario: BundleScenario): string {
  const optionSummaries = scenario.options.map(opt => {
    const effects = (opt.effects || [])
      .map((e: any) => `${e.targetMetricId} ${e.value > 0 ? '+' : ''}${e.value}`)
      .join(', ');

    return `Option "${opt.id}" — Label: ${opt.label ?? '(none)'}
  Text: ${opt.text}
  Headline: ${opt.outcomeHeadline ?? ''}
  Summary: ${opt.outcomeSummary ?? ''}
  Effects: ${effects || '(none)'}`;
  }).join('\n\n');

  return `You are a senior game designer and narrative director reviewing scenario content for The Administration — a political simulation game where players run a government.

Players face scenarios and choose from 3 options, each with real metric consequences. Good scenarios create genuine dilemmas where reasonable players disagree on the best path.

Evaluate this scenario on six narrative quality dimensions. Content uses {token} placeholders that resolve to country-specific values at runtime — treat these as proper nouns.

WHAT MAKES A GREAT SCENARIO:
- The dilemma is SPECIFIC (not "economy is struggling" but "a major employer is threatening to relocate unless given tax breaks that would gut the education budget")
- Options represent genuinely different PHILOSOPHIES, not just mild/moderate/extreme of one approach
- Outcomes have SECOND-ORDER EFFECTS that players didn't fully anticipate
- Reasonable players with different values (liberty vs security, growth vs equality) would genuinely disagree
- The scenario teaches something about real governance tradeoffs
- Institutionally grounded: options represent things real ministries, courts, and cabinets actually do — procurement decisions, emergency decrees, coalition negotiations, regulatory actions, criminal investigations

WHAT MAKES A BAD SCENARIO:
- Generic: could apply to any country at any time without specificity
- One option is obviously correct or obviously terrible
- Options are just "do nothing / do a little / do a lot"
- Outcomes are vague platitudes instead of concrete consequences
- No emotional stakes — the player doesn't care what happens
- Unrealistic: options include things governments cannot actually do (resolve a crisis with a speech alone, pass major legislation overnight without any political cost) or metric consequences that don't follow from the mechanism described in the option text

Scenario:
Title: ${scenario.title}
Description: ${scenario.description}
Bundle: ${scenario.metadata?.bundle ?? 'unknown'}
Severity: ${scenario.metadata?.severity ?? 'unknown'}

${optionSummaries}

Score each dimension 1-5 and explain your reasoning. List specific editorial suggestions.`;
}

export async function evaluateNarrativeQuality(
  scenario: BundleScenario,
  modelOverride?: string
): Promise<NarrativeReviewResult> {
  const prompt = buildNarrativeReviewPrompt(scenario);
  const model = modelOverride || getPhaseModels().narrativeReview;

  const result = await callModelProvider<NarrativeReviewLLMResponse>(
    { maxTokens: 2048, temperature: 0.3 },
    prompt,
    NARRATIVE_REVIEW_SCHEMA,
    model
  );

  if (!result.data) {
    console.warn(`[NarrativeReview] LLM call failed for ${scenario.id}: ${result.error}`);
    return {
      pass: true,
      engagement: { score: 3, reasoning: 'Review unavailable' },
      strategicDepth: { score: 3, reasoning: 'Review unavailable' },
      optionDifferentiation: { score: 3, reasoning: 'Review unavailable' },
      consequenceQuality: { score: 3, reasoning: 'Review unavailable' },
      replayValue: { score: 3, reasoning: 'Review unavailable' },
      politicalRealism: { score: 3, reasoning: 'Review unavailable' },
      overallScore: 3,
      editorialNotes: [],
    };
  }

  const r = result.data;
  const clamp = (n: number): 1 | 2 | 3 | 4 | 5 =>
    Math.min(5, Math.max(1, Math.round(n ?? 3))) as 1 | 2 | 3 | 4 | 5;

  const engagement: NarrativeQualityDimension = { score: clamp(r.engagement?.score), reasoning: r.engagement?.reasoning ?? '' };
  const strategicDepth: NarrativeQualityDimension = { score: clamp(r.strategic_depth?.score), reasoning: r.strategic_depth?.reasoning ?? '' };
  const optionDifferentiation: NarrativeQualityDimension = { score: clamp(r.option_differentiation?.score), reasoning: r.option_differentiation?.reasoning ?? '' };
  const consequenceQuality: NarrativeQualityDimension = { score: clamp(r.consequence_quality?.score), reasoning: r.consequence_quality?.reasoning ?? '' };
  const replayValue: NarrativeQualityDimension = { score: clamp(r.replay_value?.score), reasoning: r.replay_value?.reasoning ?? '' };
  const politicalRealism: NarrativeQualityDimension = { score: clamp(r.political_realism?.score), reasoning: r.political_realism?.reasoning ?? '' };

  const allDimensions = [engagement, strategicDepth, optionDifferentiation, consequenceQuality, replayValue, politicalRealism];
  const overallScore = allDimensions.reduce((sum, d) => sum + d.score, 0) / allDimensions.length;

  const hardFail = allDimensions.some(d => d.score < 2) || overallScore < 2.5;

  return {
    pass: !hardFail,
    engagement,
    strategicDepth,
    optionDifferentiation,
    consequenceQuality,
    replayValue,
    politicalRealism,
    overallScore,
    editorialNotes: r.editorial_notes ?? [],
  };
}
