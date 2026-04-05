import type { ContentQualityResult } from './content-quality';
import type { NarrativeReviewResult } from './narrative-review';

export interface EditorialReviewResult {
  pass: boolean;
  usable: boolean;
  overallScore: number;
  regenerateFields: ContentQualityResult['regenerateFields'];
  editorialNotes: string[];
  contentQuality?: ContentQualityResult;
  narrativeReview?: NarrativeReviewResult;
  reasons: string[];
}

export interface EditorialReviewSkipDecisionInput {
  lowLatencyMode: boolean;
  mode: 'manual' | 'news' | 'blitz';
  useStandardPath: boolean;
  conditionalEditorialReviewEnabled: boolean;
  qualityCriticalManualRun: boolean;
  sampleKey: string;
}

function deterministicRatio(sampleKey: string): number {
  let hash = 2166136261;
  for (let i = 0; i < sampleKey.length; i++) {
    hash ^= sampleKey.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 1000) / 1000;
}

export function shouldSkipEditorialReview(input: EditorialReviewSkipDecisionInput): boolean {
  if (input.lowLatencyMode) return true;
  if (!input.useStandardPath || !input.conditionalEditorialReviewEnabled) return false;
  if (input.qualityCriticalManualRun || input.mode === 'manual') return false;
  return deterministicRatio(input.sampleKey) >= 0.1;
}

export function combineEditorialReview(
  contentQualityGate: { enabled: boolean; usable: boolean; result?: ContentQualityResult | null; error?: string },
  narrativeReviewGate: { enabled: boolean; usable: boolean; result?: NarrativeReviewResult | null; error?: string },
): EditorialReviewResult {
  const content = contentQualityGate.result ?? undefined;
  const narrative = narrativeReviewGate.result ?? undefined;
  const usable = (!contentQualityGate.enabled || contentQualityGate.usable) && (!narrativeReviewGate.enabled || narrativeReviewGate.usable);
  const reasons: string[] = [];

  if (
    contentQualityGate.enabled &&
    content &&
    (
      content.pass !== true ||
      content.overallScore < 3.7 ||
      content.readability.score < 4 ||
      content.advisorQuality.score < 4 ||
      content.specificity.score < 4
    )
  ) {
    reasons.push(`content quality failed: overall=${content.overallScore.toFixed(2)}`);
  }
  if (narrativeReviewGate.enabled && narrative) {
    if (
      narrative.overallScore < 3.7 ||
      narrative.optionDifferentiation.score < 4 ||
      narrative.consequenceQuality.score < 4 ||
      narrative.replayValue.score < 4
    ) {
      reasons.push(`narrative review failed: overall=${narrative.overallScore.toFixed(2)}`);
    }
  }

  const scores = [content?.overallScore, narrative?.overallScore].filter((value): value is number => typeof value === 'number');
  const overallScore = scores.length > 0 ? scores.reduce((sum, value) => sum + value, 0) / scores.length : 3;

  return {
    pass: reasons.length === 0,
    usable,
    overallScore,
    regenerateFields: content?.regenerateFields ?? [],
    editorialNotes: narrative?.editorialNotes ?? [],
    ...(content ? { contentQuality: content } : {}),
    ...(narrative ? { narrativeReview: narrative } : {}),
    reasons,
  };
}
