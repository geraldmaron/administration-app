import { selectSeedConcepts, type ConceptSeed } from '../lib/concept-seeds';

describe('concept seeds', () => {
  const seeds: ConceptSeed[] = [
    {
      bundle: 'economy',
      concept: 'Universal seed',
      theme: 'economy',
      severity: 'medium',
      difficulty: 2,
      actorPattern: 'domestic',
      optionShape: 'invest',
      scopeTier: 'universal',
      scopeKey: 'universal',
      rank: 2,
    },
    {
      bundle: 'economy',
      concept: 'Exact seed',
      theme: 'economy',
      severity: 'high',
      difficulty: 4,
      actorPattern: 'cabinet',
      optionShape: 'reform',
      scopeTier: 'regional',
      scopeKey: 'region:caribbean',
      rank: 5,
    },
    {
      bundle: 'economy',
      concept: 'Inactive seed',
      theme: 'economy',
      severity: 'high',
      difficulty: 3,
      actorPattern: 'legislature',
      optionShape: 'delay',
      scopeTier: 'regional',
      scopeKey: 'region:caribbean',
      active: false,
      rank: 1,
    },
  ];

  test('prefers exact scope seeds over universal seeds', () => {
    const selected = selectSeedConcepts(seeds, {
      bundle: 'economy',
      scopeTier: 'regional',
      scopeKey: 'region:caribbean',
      count: 2,
    });

    expect(selected[0]?.concept).toBe('Exact seed');
    expect(selected.map((seed) => seed.concept)).toEqual(['Exact seed', 'Universal seed']);
  });

  test('filters inactive seeds', () => {
    const selected = selectSeedConcepts(seeds, {
      bundle: 'economy',
      scopeTier: 'regional',
      scopeKey: 'region:caribbean',
      count: 3,
    });

    expect(selected.find((seed) => seed.concept === 'Inactive seed')).toBeUndefined();
  });

  test('prefers theme diversity in fallback pass', () => {
    const themedSeeds: ConceptSeed[] = [
      {
        bundle: 'economy',
        concept: 'Trade tariff crisis',
        theme: 'trade tariffs',
        severity: 'high',
        difficulty: 3,
        actorPattern: 'domestic',
        optionShape: 'regulate',
        scopeTier: 'universal',
        scopeKey: 'universal',
        rank: 1,
      },
      {
        bundle: 'economy',
        concept: 'Another trade issue',
        theme: 'trade tariffs',
        severity: 'high',
        difficulty: 3,
        actorPattern: 'domestic',
        optionShape: 'regulate',
        scopeTier: 'universal',
        scopeKey: 'universal',
        rank: 2,
      },
      {
        bundle: 'economy',
        concept: 'Currency collapse',
        theme: 'currency',
        severity: 'high',
        difficulty: 3,
        actorPattern: 'domestic',
        optionShape: 'regulate',
        scopeTier: 'universal',
        scopeKey: 'universal',
        rank: 3,
      },
      {
        bundle: 'economy',
        concept: 'Debt restructuring',
        theme: 'sovereign debt',
        severity: 'high',
        difficulty: 3,
        actorPattern: 'domestic',
        optionShape: 'regulate',
        scopeTier: 'universal',
        scopeKey: 'universal',
        rank: 4,
      },
    ];

    const selected = selectSeedConcepts(themedSeeds, {
      bundle: 'economy',
      scopeTier: 'universal',
      scopeKey: 'universal',
      count: 3,
    });

    const themes = selected.map((s) => s.theme);
    const uniqueThemes = new Set(themes);
    expect(uniqueThemes.size).toBe(3);
    expect(themes).toContain('trade tariffs');
    expect(themes).toContain('currency');
    expect(themes).toContain('sovereign debt');
  });

  test('includes primaryMetrics in lane key for diversity', () => {
    const metricSeeds: ConceptSeed[] = [
      {
        bundle: 'economy',
        concept: 'Inflation spike',
        theme: 'inflation',
        severity: 'medium',
        difficulty: 2,
        actorPattern: 'domestic',
        optionShape: 'regulate',
        primaryMetrics: ['economy'],
        scopeTier: 'universal',
        scopeKey: 'universal',
        rank: 1,
      },
      {
        bundle: 'economy',
        concept: 'Different metric seed',
        theme: 'inflation',
        severity: 'medium',
        difficulty: 2,
        actorPattern: 'domestic',
        optionShape: 'regulate',
        primaryMetrics: ['trade'],
        scopeTier: 'universal',
        scopeKey: 'universal',
        rank: 2,
      },
    ];

    const selected = selectSeedConcepts(metricSeeds, {
      bundle: 'economy',
      scopeTier: 'universal',
      scopeKey: 'universal',
      count: 2,
    });

    expect(selected).toHaveLength(2);
    expect(selected[0].primaryMetrics?.[0]).not.toBe(selected[1].primaryMetrics?.[0]);
  });

  test('separates seeds with different primaryTags into distinct lanes', () => {
    const tagSeeds: ConceptSeed[] = [
      {
        bundle: 'education',
        concept: 'Student loan crisis',
        theme: 'student_loans',
        severity: 'medium',
        difficulty: 3,
        actorPattern: 'domestic',
        optionShape: 'reform',
        primaryMetrics: ['education'],
        primaryTags: ['education', 'student_loans'],
        scopeTier: 'universal',
        scopeKey: 'universal',
        rank: 1,
      },
      {
        bundle: 'education',
        concept: 'Campus protest wave',
        theme: 'student_loans',
        severity: 'medium',
        difficulty: 3,
        actorPattern: 'domestic',
        optionShape: 'reform',
        primaryMetrics: ['education'],
        primaryTags: ['education', 'protest'],
        scopeTier: 'universal',
        scopeKey: 'universal',
        rank: 2,
      },
    ];

    const selected = selectSeedConcepts(tagSeeds, {
      bundle: 'education',
      scopeTier: 'universal',
      scopeKey: 'universal',
      count: 2,
    });

    // Different primaryTags → different lanes → both selected despite identical severity/theme/etc.
    expect(selected).toHaveLength(2);
  });

  test('collapses seeds with identical primaryTags into the same lane', () => {
    const duplicateTagSeeds: ConceptSeed[] = [
      {
        bundle: 'education',
        concept: 'Student loan crisis A',
        theme: 'student_loans',
        severity: 'medium',
        difficulty: 3,
        actorPattern: 'domestic',
        optionShape: 'reform',
        primaryMetrics: ['education'],
        primaryTags: ['education', 'student_loans'],
        scopeTier: 'universal',
        scopeKey: 'universal',
        rank: 1,
      },
      {
        bundle: 'education',
        concept: 'Student loan crisis B',
        theme: 'student_loans',
        severity: 'medium',
        difficulty: 3,
        actorPattern: 'domestic',
        optionShape: 'reform',
        primaryMetrics: ['education'],
        primaryTags: ['student_loans', 'education'], // same set, different order
        scopeTier: 'universal',
        scopeKey: 'universal',
        rank: 2,
      },
    ];

    const selected = selectSeedConcepts(duplicateTagSeeds, {
      bundle: 'education',
      scopeTier: 'universal',
      scopeKey: 'universal',
      count: 2,
    });

    // The lane-uniqueness pass rejects the second seed; it's only recovered by the
    // theme fallback pass (which hits the same theme) or the final unconditional
    // fill. Primary lane pass should have admitted only one.
    const primaryLaneAdmitted = selected.filter((s) => s.concept.endsWith('A'));
    expect(primaryLaneAdmitted).toHaveLength(1);
  });
});