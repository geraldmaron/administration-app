import { normalizeTokenAliases } from '../lib/token-registry';

describe('normalizeTokenAliases', () => {
    test('normalizes hallucinated ministry and culture tokens to valid role tokens', () => {
        const text = 'You direct {the_culture_ministry} while {culture_role} briefs {the_ministry_of_interior}.';
        expect(normalizeTokenAliases(text)).toBe('You direct {the_interior_role} while {interior_role} briefs {the_interior_role}.');
    });

    test('normalizes invalid economy and metric placeholders to plain language', () => {
        const text = '{the_economy} remains fragile while {metric_public_order} and {the_approval} continue to deteriorate.';
        expect(normalizeTokenAliases(text)).toBe('the economy remains fragile while public order and public approval continue to deteriorate.');
    });

    test('rewrites unsupported legislature speaker placeholders to supported narrative text', () => {
        const text = '{the_legislature_speaker} warned that {legislature_speaker} could delay the vote.';
        expect(normalizeTokenAliases(text)).toBe('the speaker of {the_legislature} warned that speaker of {the_legislature} could delay the vote.');
    });

    test('rewrites metric placeholders in narrative text to plain language labels', () => {
        const text = '{metric_infrastructure} spending fell while {metric_foreign_relations} deteriorated and {metric_sovereignty} became a campaign issue.';
        expect(normalizeTokenAliases(text)).toBe('infrastructure spending fell while foreign relations deteriorated and sovereignty became a campaign issue.');
    });

    test('normalizes {the_opposition} and {opposition} to opposition_party tokens', () => {
        const text = '{the_opposition} challenged the vote while {opposition} lawmakers staged a walkout.';
        expect(normalizeTokenAliases(text)).toBe('{the_opposition_party} challenged the vote while {opposition_party} lawmakers staged a walkout.');
    });

    test('fuzzy-resolves _minister suffix tokens to _role equivalents via normalizeTokenAliases', () => {
        const text = '{the_transport_minister} delayed the bill while {education_secretary} objected.';
        expect(normalizeTokenAliases(text)).toBe('{the_transport_role} delayed the bill while {education_role} objected.');
    });

    test('leaves unresolvable tokens unchanged', () => {
        const text = '{the_ruling} bloc passed the budget.';
        expect(normalizeTokenAliases(text)).toBe('{the_ruling} bloc passed the budget.');
    });

    test('normalizes judiciary and court aliases to judicial_role', () => {
        const text = '{the_judiciary} ruled while {judiciary_body} convened.';
        expect(normalizeTokenAliases(text)).toBe('{the_judicial_role} ruled while {judicial_role} convened.');
    });

    test('normalizes security and police aliases', () => {
        const text = '{police} deployed while {security_forces} secured the area.';
        expect(normalizeTokenAliases(text)).toBe('{police_force} deployed while {police_force} secured the area.');
    });
});