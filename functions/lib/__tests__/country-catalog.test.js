"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const country_catalog_1 = require("../lib/country-catalog");
describe('resolveCountryCatalog', () => {
    test('prefers canonical world_state/countries when both sources exist', () => {
        const resolved = (0, country_catalog_1.resolveCountryCatalog)({ usa: { name: 'United States' } }, { fra: { name: 'France' } });
        expect(resolved.source.kind).toBe('canonical');
        expect(Object.keys(resolved.countries)).toEqual(['usa']);
    });
    test('uses legacy fallback only when canonical source is missing', () => {
        const resolved = (0, country_catalog_1.resolveCountryCatalog)(undefined, { fra: { name: 'France' } });
        expect(resolved.source.kind).toBe('legacy-fallback');
        expect(resolved.source.usedFallback).toBe(true);
        expect(Object.keys(resolved.countries)).toEqual(['fra']);
    });
    test('targeted generation missing country ID fails before generation', () => {
        expect(() => {
            (0, country_catalog_1.assertRequestedCountryIdsAvailable)({ usa: { name: 'United States' } }, ['usa', 'fra'], 'ScenarioEngine');
        }).toThrow('[ScenarioEngine] Missing requested country IDs: fra');
    });
});
//# sourceMappingURL=country-catalog.test.js.map