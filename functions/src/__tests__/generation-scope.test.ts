import { inferDefaultSourceKind, normalizeGenerationScopeInput } from '../lib/generation-scope';

describe('generation scope normalization', () => {
    test('defaults manual jobs to universal evergreen scope', () => {
        const result = normalizeGenerationScopeInput({ mode: 'manual' });

        expect(result.ok).toBe(true);
        expect(result.value).toEqual({
            scopeTier: 'universal',
            scopeKey: 'universal',
            sourceKind: 'evergreen',
            regions: [],
            applicable_countries: undefined,
            clusterId: undefined,
            exclusivityReason: undefined,
        });
    });

    test('normalizes regional jobs and trims duplicate regions', () => {
        const result = normalizeGenerationScopeInput({
            mode: 'manual',
            scopeTier: 'regional',
            regions: ['caribbean', ' caribbean ', 'middle_east'],
        });

        expect(result.ok).toBe(true);
        expect(result.value?.scopeKey).toBe('region:caribbean');
        expect(result.value?.regions).toEqual(['caribbean', 'middle_east']);
    });

    test('requires exclusivity reason and countries for exclusive jobs', () => {
        const missingReason = normalizeGenerationScopeInput({
            mode: 'manual',
            scopeTier: 'exclusive',
            applicable_countries: ['jp'],
        });
        const missingCountries = normalizeGenerationScopeInput({
            mode: 'manual',
            scopeTier: 'exclusive',
            exclusivityReason: 'constitution',
        });

        expect(missingReason.ok).toBe(false);
        expect(missingReason.error).toContain('exclusivityReason');
        expect(missingCountries.ok).toBe(false);
        expect(missingCountries.error).toContain('applicable_countries');
    });

    test('deduplicates and trims applicable countries for exclusive jobs', () => {
        const result = normalizeGenerationScopeInput({
            mode: 'manual',
            scopeTier: 'exclusive',
            exclusivityReason: 'constitution',
            applicable_countries: ['jp', ' jp ', ''],
            scopeKey: 'country:jp',
        });

        expect(result.ok).toBe(true);
        expect(result.value?.applicable_countries).toEqual(['jp']);
    });

    test('defaults news jobs to news source kind', () => {
        expect(inferDefaultSourceKind('news')).toBe('news');
        expect(inferDefaultSourceKind('manual')).toBe('evergreen');
    });

    test('normalizes cluster jobs with canonical cluster scope key', () => {
        const result = normalizeGenerationScopeInput({
            mode: 'manual',
            scopeTier: 'cluster',
            clusterId: ' eu_nato ',
            sourceKind: 'evergreen',
        });

        expect(result.ok).toBe(true);
        expect(result.value).toMatchObject({
            scopeTier: 'cluster',
            scopeKey: 'cluster:eu_nato',
            clusterId: 'eu_nato',
            sourceKind: 'evergreen',
        });
    });
});
