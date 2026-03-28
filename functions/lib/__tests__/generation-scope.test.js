"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const generation_scope_1 = require("../lib/generation-scope");
describe('generation scope normalization', () => {
    test('defaults manual jobs to universal evergreen scope', () => {
        const result = (0, generation_scope_1.normalizeGenerationScopeInput)({ mode: 'manual' });
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
        var _a, _b;
        const result = (0, generation_scope_1.normalizeGenerationScopeInput)({
            mode: 'manual',
            scopeTier: 'regional',
            regions: ['caribbean', ' caribbean ', 'middle_east'],
        });
        expect(result.ok).toBe(true);
        expect((_a = result.value) === null || _a === void 0 ? void 0 : _a.scopeKey).toBe('region:caribbean');
        expect((_b = result.value) === null || _b === void 0 ? void 0 : _b.regions).toEqual(['caribbean', 'middle_east']);
    });
    test('requires exclusivity reason and countries for exclusive jobs', () => {
        const missingReason = (0, generation_scope_1.normalizeGenerationScopeInput)({
            mode: 'manual',
            scopeTier: 'exclusive',
            applicable_countries: ['jp'],
        });
        const missingCountries = (0, generation_scope_1.normalizeGenerationScopeInput)({
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
        var _a;
        const result = (0, generation_scope_1.normalizeGenerationScopeInput)({
            mode: 'manual',
            scopeTier: 'exclusive',
            exclusivityReason: 'constitution',
            applicable_countries: ['jp', ' jp ', ''],
            scopeKey: 'country:jp',
        });
        expect(result.ok).toBe(true);
        expect((_a = result.value) === null || _a === void 0 ? void 0 : _a.applicable_countries).toEqual(['jp']);
    });
    test('defaults news jobs to news source kind', () => {
        expect((0, generation_scope_1.inferDefaultSourceKind)('news')).toBe('news');
        expect((0, generation_scope_1.inferDefaultSourceKind)('manual')).toBe('evergreen');
    });
});
//# sourceMappingURL=generation-scope.test.js.map