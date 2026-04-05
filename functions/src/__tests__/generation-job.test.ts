import { buildGenerationJobRecord } from '../shared/generation-job';

describe('generation job record', () => {
  test('preserves explicit scope fields when building job records', () => {
    const record = buildGenerationJobRecord({
      bundles: ['economy'],
      count: 2,
      mode: 'manual',
      scopeTier: 'exclusive',
      scopeKey: 'country:jp',
      sourceKind: 'evergreen',
      exclusivityReason: 'constitution',
      applicable_countries: ['jp'],
      status: 'pending',
    });

    expect(record.scopeTier).toBe('exclusive');
    expect(record.scopeKey).toBe('country:jp');
    expect(record.sourceKind).toBe('evergreen');
    expect(record.exclusivityReason).toBe('constitution');
    expect(record.applicable_countries).toEqual(['jp']);
  });

  test('keeps region and normalized scope metadata side-by-side', () => {
    const record = buildGenerationJobRecord({
      bundles: ['military'],
      count: 1,
      mode: 'news',
      region: 'middle_east',
      regions: ['middle_east'],
      scopeTier: 'regional',
      scopeKey: 'region:middle_east',
      sourceKind: 'news',
      status: 'pending',
    });

    expect(record.region).toBe('middle_east');
    expect(record.regions).toEqual(['middle_east']);
    expect(record.scopeTier).toBe('regional');
    expect(record.scopeKey).toBe('region:middle_east');
    expect(record.sourceKind).toBe('news');
  });
});
