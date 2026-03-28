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