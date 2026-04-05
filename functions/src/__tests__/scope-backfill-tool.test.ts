import {
  buildScopeBackfillUpdate,
  classifyScenarioScopeMetadata,
  planScopeBackfillForScenario,
} from '../tools/backfill-scenario-scope';

describe('scope backfill tool', () => {
  test('classifies regional scenarios from region_tags metadata', () => {
    const classification = classifyScenarioScopeMetadata({
      sourceKind: 'evergreen',
      region_tags: ['Caribbean', ' caribbean '],
    });

    expect(classification.status).toBe('classified');
    expect(classification.scope).toEqual({
      scopeTier: 'regional',
      scopeKey: 'region:caribbean',
      sourceKind: 'evergreen',
      regions: ['caribbean'],
    });
  });

  test('classifies explicit exclusivity as exclusive scope', () => {
    const classification = classifyScenarioScopeMetadata({
      sourceKind: 'evergreen',
      exclusivityReason: 'constitution',
      applicable_countries: ['JP'],
    });

    expect(classification.status).toBe('classified');
    expect(classification.scope?.scopeTier).toBe('exclusive');
    expect(classification.scope?.scopeKey).toBe('country:jp');
    expect(classification.scope?.applicable_countries).toEqual(['jp']);
    expect(classification.scope?.exclusivityReason).toBe('constitution');
  });

  test('keeps news country-limited metadata universal when exclusivity is absent', () => {
    const classification = classifyScenarioScopeMetadata({
      sourceKind: 'news',
      applicable_countries: ['US', 'CA'],
    });

    expect(classification.status).toBe('classified');
    expect(classification.scope?.scopeTier).toBe('universal');
    expect(classification.scope?.scopeKey).toBe('universal');
    expect(classification.scope?.sourceKind).toBe('news');
    expect(classification.scope?.applicable_countries).toEqual(['ca', 'us']);
  });

  test('marks non-news country constrained scenarios without exclusivity as ambiguous', () => {
    const classification = classifyScenarioScopeMetadata({
      sourceKind: 'evergreen',
      applicable_countries: ['us'],
    });

    expect(classification.status).toBe('ambiguous');
    expect(classification.reasons[0]).toContain('applicable_countries present without exclusivityReason');
  });

  test('creates a backfill patch only when metadata differs', () => {
    const plan = planScopeBackfillForScenario('scenario_1', {
      sourceKind: 'news',
      applicable_countries: ['US'],
    });

    expect(plan.action).toBe('backfill');
    expect(plan.updates).toMatchObject({
      'metadata.scopeTier': 'universal',
      'metadata.scopeKey': 'universal',
      'metadata.sourceKind': 'news',
      'metadata.applicable_countries': ['us'],
    });

    const unchanged = buildScopeBackfillUpdate(
      {
        sourceKind: 'news',
        scopeTier: 'universal',
        scopeKey: 'universal',
        applicable_countries: ['us'],
      },
      {
        scopeTier: 'universal',
        scopeKey: 'universal',
        sourceKind: 'news',
        regions: [],
        applicable_countries: ['us'],
      }
    );

    expect(unchanged).toBeNull();
  });
});
