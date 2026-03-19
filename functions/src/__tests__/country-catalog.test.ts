import {
    assertRequestedCountryIdsAvailable,
    resolveCountryCatalog,
} from '../lib/country-catalog';

describe('resolveCountryCatalog', () => {
    test('loads from the firestore countries collection', () => {
        const resolved = resolveCountryCatalog({ usa: { name: 'United States' } });

        expect(resolved.source.kind).toBe('firestore');
        expect(resolved.source.path).toBe('countries');
        expect(Object.keys(resolved.countries)).toEqual(['usa']);
    });

    test('throws when the firestore countries collection is empty', () => {
        expect(() => resolveCountryCatalog({})).toThrow(
            '[CountryCatalog] No country catalog found. Expected non-empty countries collection.'
        );
    });

    test('targeted generation missing country ID fails before generation', () => {
        expect(() => {
            assertRequestedCountryIdsAvailable(
                { usa: { name: 'United States' } },
                ['usa', 'fra'],
                'ScenarioEngine'
            );
        }).toThrow('[ScenarioEngine] Missing requested country IDs: fra');
    });
});