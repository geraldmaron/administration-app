import { computeScenarioContentHash } from '../bundle-exporter';

const BASE_SCENARIO: Record<string, unknown> = {
  id: 'scenario_001',
  title: 'Trade Dispute Escalates',
  description: 'The cabinet faces a critical trade decision.',
  options: [
    {
      id: 'a',
      text: 'Negotiate',
      effects: [{ targetMetricId: 'economy', value: 1, duration: 3, probability: 1 }],
      outcomeHeadline: 'Talks resume',
      outcomeSummary: 'Negotiators return to the table.',
      outcomeContext: 'Markets respond cautiously.',
    },
  ],
  applicability: { requires: {}, metricGates: [] },
  metadata: {
    bundle: 'economy',
    severity: 'medium',
    generationProvenance: {
      jobId: 'job_abc',
      executionTarget: 'standard',
      modelUsed: 'gpt-4o',
      generatedAt: '2025-01-01T00:00:00Z',
    },
    auditMetadata: {
      score: 90,
      issues: [],
      lastAudited: '2025-01-02T00:00:00Z',
    },
    acceptanceMetadata: {
      policyVersion: '1.0',
      acceptedAt: '2025-01-03T00:00:00Z',
    },
  },
  createdAt: { _seconds: 1700000000 },
  updatedAt: { _seconds: 1700001000 },
};

describe('computeScenarioContentHash', () => {
  it('returns a 64-char hex string', () => {
    const hash = computeScenarioContentHash(BASE_SCENARIO);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is stable across identical inputs', () => {
    const a = computeScenarioContentHash(BASE_SCENARIO);
    const b = computeScenarioContentHash(structuredClone(BASE_SCENARIO));
    expect(a).toBe(b);
  });

  it('changes when narrative content changes', () => {
    const modified = structuredClone(BASE_SCENARIO) as Record<string, unknown>;
    (modified as any).title = 'Completely Different Title';
    expect(computeScenarioContentHash(modified)).not.toBe(computeScenarioContentHash(BASE_SCENARIO));
  });

  it('is unaffected by updatedAt changes', () => {
    const stamped = structuredClone(BASE_SCENARIO) as Record<string, unknown>;
    (stamped as any).updatedAt = { _seconds: 9999999999 };
    expect(computeScenarioContentHash(stamped)).toBe(computeScenarioContentHash(BASE_SCENARIO));
  });

  it('is unaffected by createdAt changes', () => {
    const stamped = structuredClone(BASE_SCENARIO) as Record<string, unknown>;
    (stamped as any).createdAt = { _seconds: 1 };
    expect(computeScenarioContentHash(stamped)).toBe(computeScenarioContentHash(BASE_SCENARIO));
  });

  it('is unaffected by generatedAt changes inside generationProvenance', () => {
    const stamped = structuredClone(BASE_SCENARIO) as Record<string, unknown>;
    ((stamped as any).metadata as any).generationProvenance.generatedAt = '2099-01-01T00:00:00Z';
    expect(computeScenarioContentHash(stamped)).toBe(computeScenarioContentHash(BASE_SCENARIO));
  });

  it('is unaffected by lastAudited changes inside auditMetadata', () => {
    const stamped = structuredClone(BASE_SCENARIO) as Record<string, unknown>;
    ((stamped as any).metadata as any).auditMetadata.lastAudited = '2099-01-01T00:00:00Z';
    expect(computeScenarioContentHash(stamped)).toBe(computeScenarioContentHash(BASE_SCENARIO));
  });

  it('is unaffected by acceptedAt changes inside acceptanceMetadata', () => {
    const stamped = structuredClone(BASE_SCENARIO) as Record<string, unknown>;
    ((stamped as any).metadata as any).acceptanceMetadata.acceptedAt = '2099-01-01T00:00:00Z';
    expect(computeScenarioContentHash(stamped)).toBe(computeScenarioContentHash(BASE_SCENARIO));
  });

  it('changes when audit score changes — score is stable content', () => {
    const modified = structuredClone(BASE_SCENARIO) as Record<string, unknown>;
    ((modified as any).metadata as any).auditMetadata.score = 50;
    expect(computeScenarioContentHash(modified)).not.toBe(computeScenarioContentHash(BASE_SCENARIO));
  });

  it('is deterministic regardless of object key insertion order', () => {
    const shuffled: Record<string, unknown> = {
      options: BASE_SCENARIO['options'],
      id: BASE_SCENARIO['id'],
      applicability: BASE_SCENARIO['applicability'],
      metadata: BASE_SCENARIO['metadata'],
      description: BASE_SCENARIO['description'],
      title: BASE_SCENARIO['title'],
      createdAt: BASE_SCENARIO['createdAt'],
      updatedAt: BASE_SCENARIO['updatedAt'],
    };
    expect(computeScenarioContentHash(shuffled)).toBe(computeScenarioContentHash(BASE_SCENARIO));
  });
});
