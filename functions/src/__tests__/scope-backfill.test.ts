import { classifyScenarioScope, type ScenarioLike } from '../tools/backfill-scenario-scope';
import { buildGenerationJobRecord } from '../shared/generation-job';

describe('scope backfill classification', () => {
  test('classifies cluster scenarios from clusterId', () => {
    const scenario: ScenarioLike = {
      id: 'scenario_cluster',
      metadata: {
        bundle: 'economy',
        clusterId: 'small_island_tourism_state',
        sourceKind: 'evergreen',
      },
    };

    expect(classifyScenarioScope(scenario)).toMatchObject({
      status: 'classified',
      scopeTier: 'cluster',
      scopeKey: 'cluster:small_island_tourism_state',
      clusterId: 'small_island_tourism_state',
    });
  });

  test('classifies regional scenarios from region tags', () => {
    const scenario: ScenarioLike = {
      id: 'scenario_regional',
      metadata: {
        bundle: 'diplomacy',
        region_tags: ['caribbean', 'north_america'],
        sourceKind: 'news',
      },
    };

    expect(classifyScenarioScope(scenario)).toMatchObject({
      status: 'classified',
      scopeTier: 'regional',
      scopeKey: 'region:caribbean',
      region_tags: ['caribbean', 'north_america'],
      sourceKind: 'news',
    });
  });

  test('classifies exclusive scenarios from explicit exclusivity metadata', () => {
    const scenario: ScenarioLike = {
      id: 'scenario_exclusive',
      metadata: {
        bundle: 'politics',
        exclusivityReason: 'constitution',
        applicable_countries: ['jp'],
      },
    };

    expect(classifyScenarioScope(scenario)).toMatchObject({
      status: 'classified',
      scopeTier: 'exclusive',
      scopeKey: 'country:jp',
      exclusivityReason: 'constitution',
      applicable_countries: ['jp'],
    });
  });

  test('marks narrow non-news country scenarios as ambiguous without exclusivity reason', () => {
    const scenario: ScenarioLike = {
      id: 'scenario_ambiguous',
      metadata: {
        bundle: 'social',
        applicable_countries: ['br'],
        sourceKind: 'evergreen',
      },
    };

    expect(classifyScenarioScope(scenario)).toMatchObject({
      status: 'ambiguous',
    });
  });

  test('classifies universal scenarios when no narrower constraints exist', () => {
    const scenario: ScenarioLike = {
      id: 'scenario_universal',
      metadata: {
        bundle: 'health',
      },
    };

    expect(classifyScenarioScope(scenario)).toMatchObject({
      status: 'classified',
      scopeTier: 'universal',
      scopeKey: 'universal',
    });
  });
});

describe('generation job record scope preservation', () => {
  test('preserves scope fields on built generation jobs', () => {
    const job = buildGenerationJobRecord({
      bundles: ['economy'],
      count: 5,
      scopeTier: 'cluster',
      scopeKey: 'cluster:small_island_tourism_state',
      clusterId: 'small_island_tourism_state',
      sourceKind: 'evergreen',
      status: 'pending',
    });

    expect(job.scopeTier).toBe('cluster');
    expect(job.scopeKey).toBe('cluster:small_island_tourism_state');
    expect(job.clusterId).toBe('small_island_tourism_state');
    expect(job.sourceKind).toBe('evergreen');
  });
});
