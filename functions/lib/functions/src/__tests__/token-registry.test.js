"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const token_registry_1 = require("../lib/token-registry");
describe('normalizeTokenAliases', () => {
    test('normalizes hallucinated ministry and culture tokens to valid role tokens', () => {
        const text = 'You direct {the_culture_ministry} while {culture_role} briefs {the_ministry_of_interior}.';
        expect((0, token_registry_1.normalizeTokenAliases)(text)).toBe('You direct {the_interior_role} while {interior_role} briefs {the_interior_role}.');
    });
    test('normalizes invalid economy and metric placeholders to plain language', () => {
        const text = '{the_economy} remains fragile while {metric_public_order} and {the_approval} continue to deteriorate.';
        expect((0, token_registry_1.normalizeTokenAliases)(text)).toBe('the economy remains fragile while public order and public approval continue to deteriorate.');
    });
    test('rewrites unsupported legislature speaker placeholders to supported narrative text', () => {
        const text = '{the_legislature_speaker} warned that {legislature_speaker} could delay the vote.';
        expect((0, token_registry_1.normalizeTokenAliases)(text)).toBe('the speaker of {the_legislature} warned that speaker of {the_legislature} could delay the vote.');
    });
    test('rewrites metric placeholders in narrative text to plain language labels', () => {
        const text = '{metric_infrastructure} spending fell while {metric_foreign_relations} deteriorated and {metric_sovereignty} became a campaign issue.';
        expect((0, token_registry_1.normalizeTokenAliases)(text)).toBe('infrastructure spending fell while foreign relations deteriorated and sovereignty became a campaign issue.');
    });
});
//# sourceMappingURL=token-registry.test.js.map