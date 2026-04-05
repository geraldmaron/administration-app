import { combineEditorialReview, shouldSkipEditorialReview } from '../lib/editorial-review';

describe('shouldSkipEditorialReview', () => {
  test('never skips quality-critical manual runs', () => {
    const skip = shouldSkipEditorialReview({
      lowLatencyMode: false,
      mode: 'manual',
      useStandardPath: true,
      conditionalEditorialReviewEnabled: true,
      qualityCriticalManualRun: true,
      sampleKey: 'economy:manual:1',
    });

    expect(skip).toBe(false);
  });

  test('is deterministic for sampled non-manual runs', () => {
    const input = {
      lowLatencyMode: false,
      mode: 'news' as const,
      useStandardPath: true,
      conditionalEditorialReviewEnabled: true,
      qualityCriticalManualRun: false,
      sampleKey: 'economy:news:2',
    };

    const first = shouldSkipEditorialReview(input);
    const second = shouldSkipEditorialReview(input);
    expect(first).toBe(second);
  });
});

describe('combineEditorialReview', () => {
  test('fails when content quality is too soft on specificity or advisor quality', () => {
    const result = combineEditorialReview(
      {
        enabled: true,
        usable: true,
        result: {
          pass: true,
          warn: false,
          grammar: { score: 4, issues: [] },
          tone: { score: 4, issues: [] },
          coherence: { score: 4, issues: [] },
          readability: { score: 4, issues: [] },
          optionConsistency: { score: 4, issues: [] },
          advisorQuality: { score: 3, issues: [] },
          specificity: { score: 4, issues: [] },
          overallScore: 3.9,
          regenerateFields: [],
        },
      },
      {
        enabled: false,
        usable: false,
      },
    );

    expect(result.pass).toBe(false);
    expect(result.reasons).toContain('content quality failed: overall=3.90');
  });

  test('fails when narrative review has weak differentiation despite otherwise passing', () => {
    const result = combineEditorialReview(
      {
        enabled: false,
        usable: false,
      },
      {
        enabled: true,
        usable: true,
        result: {
          pass: true,
          engagement: { score: 4, reasoning: 'good' },
          strategicDepth: { score: 4, reasoning: 'good' },
          optionDifferentiation: { score: 3, reasoning: 'too similar' },
          consequenceQuality: { score: 4, reasoning: 'good' },
          replayValue: { score: 4, reasoning: 'good' },
          overallScore: 3.8,
          editorialNotes: [],
        },
      },
    );

    expect(result.pass).toBe(false);
    expect(result.reasons).toContain('narrative review failed: overall=3.80');
  });
});
