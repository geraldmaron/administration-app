import { normalizeScenarioTextFields, repairTextIntegrity, type BundleScenario } from '../lib/audit-rules';

function makeScenario(description: string, overrides: Partial<BundleScenario> = {}): BundleScenario {
    return {
        id: 'scenario_text_quality',
        title: 'budget budget warning',
        description,
        options: [
            {
                id: 'option_a',
                text: '{The_Player_Country} faces a significant a significant budget shock.',
                effects: [],
                outcomeHeadline: '{leader_title} announces emergency measures',
                outcomeSummary: '{the_player_country} faces market panic. {the_player_country} faces market panic.',
                outcomeContext: 'markets react. {the_player_country} braces for austerity.',
                advisorFeedback: [
                    {
                        roleId: 'finance_role',
                        stance: 'support',
                        feedback: '{the_player_country} faces pressure. {the_player_country} faces pressure.'
                    }
                ]
            }
        ],
        ...overrides,
    };
}

describe('normalizeScenarioTextFields', () => {
    test('normalizes token casing, capitalization, and duplicated phrases', () => {
        const scenario = makeScenario('the market panic panic spreads. {the_player_country} faces a significant a significant deficit.');

        const result = normalizeScenarioTextFields(scenario);

        expect(result.fixed).toBe(true);
        expect(scenario.title).toBe('Budget warning');
        expect(scenario.description).toBe('The market panic spreads. {the_player_country} faces a significant deficit.');
        expect(scenario.options[0].text).toBe('{the_player_country} faces a significant budget shock.');
        expect(scenario.options[0].outcomeHeadline).toBe('{leader_title} announces emergency measures');
        expect(scenario.options[0].outcomeSummary).toBe('{the_player_country} faces market panic.');
        expect(scenario.options[0].outcomeContext).toBe('Markets react. {the_player_country} braces for austerity.');
        expect(scenario.options[0].advisorFeedback?.[0].feedback).toBe('{the_player_country} faces pressure.');
    });

    test('collapses immediately repeated sentences without removing distinct follow-up text', () => {
        const scenario = makeScenario('Crisis spreads. Crisis spreads. Markets freeze.');

        normalizeScenarioTextFields(scenario);

        expect(scenario.description).toBe('Crisis spreads. Markets freeze.');
    });

    test('collapses non-adjacent repeated sentences', () => {
        const scenario = makeScenario('Markets are reacting to the latest fiscal announcement. Investors have pulled back significantly. Markets are reacting to the latest fiscal announcement.');

        normalizeScenarioTextFields(scenario);

        expect(scenario.description).toBe('Markets are reacting to the latest fiscal announcement. Investors have pulled back significantly.');
    });
});

describe('normalizeScenarioTextFields — phrase rules', () => {
    test('replaces prime minister with {leader_title} in description and options', () => {
        const scenario = makeScenario(
            'The prime minister announced a new budget. Cabinet officials agreed.',
            {
                options: [{
                    id: 'option_a',
                    text: 'Ask the prime minister to reconsider.',
                    effects: [],
                    outcomeHeadline: 'Premier endorses the plan',
                    outcomeSummary: 'The head of government signs the order.',
                    outcomeContext: 'Premier supports the measure.',
                }]
            }
        );

        const result = normalizeScenarioTextFields(scenario);

        expect(result.fixed).toBe(true);
        expect(scenario.description).toContain('{leader_title}');
        expect(scenario.description).not.toMatch(/\bprime\s+minister\b/i);
        expect(scenario.options[0].text).toContain('{leader_title}');
        expect(scenario.options[0].text).not.toMatch(/\bprime\s+minister\b/i);
        expect(scenario.options[0].outcomeHeadline).toContain('{leader_title}');
        expect(scenario.options[0].outcomeSummary).toContain('{leader_title}');
        expect(scenario.options[0].outcomeContext).toContain('{leader_title}');
    });

    test('replaces premier and chancellor in prose fields', () => {
        const scenario = makeScenario('The premier met with the chancellor to discuss trade policy.');

        normalizeScenarioTextFields(scenario);

        expect(scenario.description).not.toMatch(/\bpremier\b/i);
        expect(scenario.description).not.toMatch(/\bchancellor\b/i);
        expect(scenario.description).toMatch(/\{leader_title\}/);
    });

    test('does not replace "Chancellor of the Exchequer" — maps to finance_role instead', () => {
        const scenario = makeScenario('The Chancellor of the Exchequer presented the budget.');

        normalizeScenarioTextFields(scenario);

        expect(scenario.description).not.toMatch(/chancellor of the exchequer/i);
        expect(scenario.description).toContain('{finance_role}');
    });

    test('replaces hardcoded ministry names with role tokens', () => {
        const scenario = makeScenario('The Finance Ministry released projections. The Defense Ministry responded.');

        normalizeScenarioTextFields(scenario);

        expect(scenario.description).not.toMatch(/Finance Ministry/i);
        expect(scenario.description).not.toMatch(/Defense Ministry/i);
        expect(scenario.description).toMatch(/\{finance_role\}/);
        expect(scenario.description).toMatch(/\{defense_role\}/);
    });

    test('does not modify scenario title (tokens are banned in titles)', () => {
        const scenario = makeScenario('Budget crisis hits the economy.', {
            title: 'Prime Minister Approves Budget'
        });

        normalizeScenarioTextFields(scenario);

        expect(scenario.title).toBe('Prime Minister Approves Budget');
    });
});

describe('repairTextIntegrity', () => {
    test('removes repeated words and dangling endings', () => {
        expect(repairTextIntegrity('The cabinet cabinet moves to.')).toBe('The cabinet moves.');
        expect(repairTextIntegrity('Markets are ready for')).toBe('Markets are ready');
    });

    test('collapses repeated punctuation without stripping valid text', () => {
        expect(repairTextIntegrity('Emergency response initiated!!')).toBe('Emergency response initiated!');
    });
});