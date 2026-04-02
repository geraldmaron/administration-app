import { normalizeTokenAliases, fuzzyCanonicalizeToken } from '../lib/token-registry';

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

    test('fuzzy-resolves unique-stem tokens via normalizeTokenAliases', () => {
        // {agriculture} is the stem of only one valid token: agriculture_role
        const text = '{the_agriculture} backed the subsidy proposal.';
        expect(normalizeTokenAliases(text)).toBe('{the_agriculture_role} backed the subsidy proposal.');
    });

    test('leaves ambiguous stems unresolved', () => {
        // {ruling} could be ruling_party, ruling_party_leader, ruling_party_ideology — no unique match
        const text = '{the_ruling} bloc passed the budget.';
        expect(normalizeTokenAliases(text)).toBe('{the_ruling} bloc passed the budget.');
    });
});

describe('fuzzyCanonicalizeToken', () => {
    test('resolves _minister suffix to _role', () => {
        expect(fuzzyCanonicalizeToken('transport_minister')).toBe('transport_role');
        expect(fuzzyCanonicalizeToken('energy_minister')).toBe('energy_role');
        expect(fuzzyCanonicalizeToken('education_secretary')).toBe('education_role');
    });

    test('resolves unique prefix stems', () => {
        expect(fuzzyCanonicalizeToken('agriculture')).toBe('agriculture_role');
        expect(fuzzyCanonicalizeToken('environment')).toBe('environment_role');
    });

    test('returns null for ambiguous stems with multiple prefix matches', () => {
        // ruling_party, ruling_party_leader, ruling_party_ideology all start with ruling_
        expect(fuzzyCanonicalizeToken('ruling')).toBeNull();
    });

    test('returns null for completely unknown tokens', () => {
        expect(fuzzyCanonicalizeToken('nonexistent_xyz')).toBeNull();
    });
});