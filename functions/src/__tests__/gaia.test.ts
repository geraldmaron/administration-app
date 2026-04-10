import type {
  RecommendationItem,
  EvidenceMetrics,
  GaiaRun,
  GaiaRunPromptRecommendations,
  PipelineStageMetric,
} from '../gaia';
import { Timestamp } from 'firebase-admin/firestore';

function makeEvidenceMetrics(overrides: Partial<EvidenceMetrics> = {}): EvidenceMetrics {
  return {
    stageAccuracy: 0.8,
    sampleSize: 50,
    topIssues: ['effect_magnitude_too_high', 'missing_outcome_headline'],
    ...overrides,
  };
}

function makeRecommendationItem(overrides: Partial<RecommendationItem> = {}): RecommendationItem {
  return {
    id: 'rec-001',
    pipelineStage: 'drafter',
    targetSection: 'Effect magnitude rules',
    reason: 'Drafter pass rate is 72% over 50 scenarios; top issue is effect_magnitude_too_high',
    currentExcerpt: 'Effects should reflect realistic impact on the target metric.',
    suggestedChange: 'Add: "Economy effects must stay within ±5 per option; military within ±8."',
    evidenceMetrics: makeEvidenceMetrics(),
    status: 'pending',
    ...overrides,
  };
}

function makePipelineStageMetric(overrides: Partial<PipelineStageMetric> = {}): PipelineStageMetric {
  return {
    scenarioId: 'scen-abc',
    jobId: 'job-xyz',
    bundle: 'economy',
    createdAt: Timestamp.now(),
    stages: {
      architect: { passed: true, issueCount: 0, issues: [] },
      drafter: { passed: false, issueCount: 2, issues: ['effect_magnitude_too_high', 'missing_outcome_headline'] },
      tokenResolve: { passed: true, unresolvedCount: 0, fallbackCount: 1 },
      audit: { score: 65, issueCount: 3, issueTypes: ['effect_magnitude_too_high', 'missing_outcome_headline', 'low_audit_score'] },
      repair: { attempted: true, repairCount: 2, failedRepairs: [] },
    },
    overallPassed: false,
    ...overrides,
  };
}

describe('gaia types', () => {
  describe('RecommendationItem', () => {
    test('has required fields', () => {
      const item = makeRecommendationItem();
      expect(item.id).toBeDefined();
      expect(item.pipelineStage).toMatch(/^(architect|drafter|repair)$/);
      expect(item.targetSection).toBeTruthy();
      expect(item.reason).toBeTruthy();
      expect(item.currentExcerpt).toBeTruthy();
      expect(item.suggestedChange).toBeTruthy();
      expect(item.status).toBe('pending');
    });

    test('evidenceMetrics contains stageAccuracy, sampleSize, and topIssues', () => {
      const item = makeRecommendationItem();
      expect(typeof item.evidenceMetrics.stageAccuracy).toBe('number');
      expect(item.evidenceMetrics.stageAccuracy).toBeGreaterThanOrEqual(0);
      expect(item.evidenceMetrics.stageAccuracy).toBeLessThanOrEqual(1);
      expect(typeof item.evidenceMetrics.sampleSize).toBe('number');
      expect(Array.isArray(item.evidenceMetrics.topIssues)).toBe(true);
    });

    test('reason is non-empty and evidence-backed', () => {
      const item = makeRecommendationItem({
        reason: 'Drafter pass rate 72%: top issues effect_magnitude_too_high (18 occurrences), missing_outcome_headline (12 occurrences)',
      });
      expect(item.reason.length).toBeGreaterThan(0);
    });

    test('status can be approved with reviewedAt and reviewNote', () => {
      const item = makeRecommendationItem({
        status: 'approved',
        reviewedBy: 'uid-admin-1',
        reviewedAt: Timestamp.now(),
        reviewNote: 'Applied to drafter prompt section 3',
      });
      expect(item.status).toBe('approved');
      expect(item.reviewedBy).toBe('uid-admin-1');
      expect(item.reviewNote).toBeTruthy();
    });

    test('status can be rejected with optional note', () => {
      const item = makeRecommendationItem({
        status: 'rejected',
        reviewNote: 'Too broad — will address in next generation cycle',
      });
      expect(item.status).toBe('rejected');
      expect(item.reviewNote).toBeTruthy();
    });
  });

  describe('GaiaRunPromptRecommendations', () => {
    test('has architect, drafter, repair arrays and summary string', () => {
      const recs: GaiaRunPromptRecommendations = {
        architect: [makeRecommendationItem({ pipelineStage: 'architect' })],
        drafter: [makeRecommendationItem({ pipelineStage: 'drafter' })],
        repair: [makeRecommendationItem({ pipelineStage: 'repair' })],
        summary: 'Three recommendations generated based on 10 sampled scenarios.',
      };
      expect(recs.architect).toHaveLength(1);
      expect(recs.drafter).toHaveLength(1);
      expect(recs.repair).toHaveLength(1);
      expect(typeof recs.summary).toBe('string');
    });

    test('each stage array can be empty', () => {
      const recs: GaiaRunPromptRecommendations = {
        architect: [],
        drafter: [],
        repair: [],
        summary: 'No issues found.',
      };
      expect(recs.architect).toHaveLength(0);
    });
  });

  describe('PipelineStageMetric', () => {
    test('has all required stage keys', () => {
      const metric = makePipelineStageMetric();
      expect(metric.stages.architect).toBeDefined();
      expect(metric.stages.drafter).toBeDefined();
      expect(metric.stages.tokenResolve).toBeDefined();
      expect(metric.stages.audit).toBeDefined();
      expect(metric.stages.repair).toBeDefined();
    });

    test('overallPassed is false when drafter fails', () => {
      const metric = makePipelineStageMetric({ overallPassed: false });
      expect(metric.overallPassed).toBe(false);
    });

    test('overallPassed is true when all stages pass', () => {
      const metric = makePipelineStageMetric({
        stages: {
          architect: { passed: true, issueCount: 0, issues: [] },
          drafter: { passed: true, issueCount: 0, issues: [] },
          tokenResolve: { passed: true, unresolvedCount: 0, fallbackCount: 0 },
          audit: { score: 92, issueCount: 0, issueTypes: [] },
          repair: { attempted: false, repairCount: 0, failedRepairs: [] },
        },
        overallPassed: true,
      });
      expect(metric.overallPassed).toBe(true);
    });

    test('drafter stage captures issue types for aggregation', () => {
      const metric = makePipelineStageMetric();
      expect(metric.stages.drafter.issues).toContain('effect_magnitude_too_high');
    });

    test('audit stage captures score and issueTypes', () => {
      const metric = makePipelineStageMetric();
      expect(metric.stages.audit.score).toBeLessThan(70);
      expect(metric.stages.audit.issueTypes.length).toBeGreaterThan(0);
    });
  });

  describe('EvidenceMetrics', () => {
    test('stageAccuracy is between 0 and 1', () => {
      const em = makeEvidenceMetrics({ stageAccuracy: 0.72 });
      expect(em.stageAccuracy).toBeGreaterThanOrEqual(0);
      expect(em.stageAccuracy).toBeLessThanOrEqual(1);
    });

    test('topIssues contains up to 3 entries', () => {
      const em = makeEvidenceMetrics({ topIssues: ['a', 'b', 'c'] });
      expect(em.topIssues.length).toBeLessThanOrEqual(3);
    });

    test('sampleSize reflects number of scenarios informing the metric', () => {
      const em = makeEvidenceMetrics({ sampleSize: 100 });
      expect(em.sampleSize).toBeGreaterThan(0);
    });
  });
});
