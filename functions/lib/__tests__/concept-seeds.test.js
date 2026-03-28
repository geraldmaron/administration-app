"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const concept_seeds_1 = require("../lib/concept-seeds");
describe('concept seeds', () => {
    const seeds = [
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
        var _a;
        const selected = (0, concept_seeds_1.selectSeedConcepts)(seeds, {
            bundle: 'economy',
            scopeTier: 'regional',
            scopeKey: 'region:caribbean',
            count: 2,
        });
        expect((_a = selected[0]) === null || _a === void 0 ? void 0 : _a.concept).toBe('Exact seed');
        expect(selected.map((seed) => seed.concept)).toEqual(['Exact seed', 'Universal seed']);
    });
    test('filters inactive seeds', () => {
        const selected = (0, concept_seeds_1.selectSeedConcepts)(seeds, {
            bundle: 'economy',
            scopeTier: 'regional',
            scopeKey: 'region:caribbean',
            count: 3,
        });
        expect(selected.find((seed) => seed.concept === 'Inactive seed')).toBeUndefined();
    });
});
//# sourceMappingURL=concept-seeds.test.js.map