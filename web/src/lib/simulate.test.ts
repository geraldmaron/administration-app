import { describe, expect, it } from 'vitest';
import { buildSimulationTokenContext, normalizeCountryDoc, simulateScenarioLibrary, type CountryDoc, type SimScenarioDoc } from './simulate';

const unitedStates: CountryDoc = {
  id: 'united_states',
  name: 'United States',
  region: 'north_america',
  leaderTitle: 'President',
  tokens: {
    legislature: 'Congress',
    ruling_party: 'Unity Party',
  },
  geopoliticalProfile: {
    neighbors: [{ countryId: 'mexico', type: 'neutral', strength: 0.7, sharedBorder: true }],
    allies: [{ countryId: 'canada', type: 'formal_ally', strength: 0.9, sharedBorder: true }],
    adversaries: [{ countryId: 'russia', type: 'rival', strength: 0.95, sharedBorder: false }],
    tags: ['nato', 'western'],
    governmentCategory: 'presidential',
    regimeStability: 0.8,
  },
  gameplayProfile: {
    startingMetrics: {
      metric_economy: 65,
      metric_approval: 52,
    },
  },
};

const countriesById: Record<string, CountryDoc> = {
  united_states: unitedStates,
  canada: { id: 'canada', name: 'Canada', region: 'north_america' },
  mexico: { id: 'mexico', name: 'Mexico', region: 'north_america' },
  russia: { id: 'russia', name: 'Russia', region: 'eurasia' },
};

describe('buildSimulationTokenContext', () => {
  it('resolves geopolitical relationship tokens to country names with definite articles', () => {
    const context = buildSimulationTokenContext(unitedStates, countriesById);

    expect(context.player_country).toBe('United States');
    expect(context.the_player_country).toBe('the United States');
    expect(context.ally).toBe('Canada');
    expect(context.the_ally).toBe('Canada');
    expect(context.rival).toBe('Russia');
    expect(context.the_rival).toBe('Russia');
  });
});

describe('simulateScenarioLibrary', () => {
  it('normalizes live Firestore country shapes before validating scenarios', () => {
    const rawUnitedStates: CountryDoc = {
      id: 'us',
      name: 'United States',
      region: 'North America',
      tokens: {
        leader_title: 'President',
        legislature: 'Congress',
      },
      geopolitical: {
        neighbors: [{ countryId: 'mx', type: 'neutral', strength: 10, sharedBorder: true }],
        allies: [{ countryId: 'ca', type: 'formal_ally', strength: 75, sharedBorder: true }],
        adversaries: [{ countryId: 'ru', type: 'adversary', strength: -75, sharedBorder: false }],
        tags: ['nato', 'g7'],
        governmentCategory: 'liberal_democracy',
        regimeStability: 74,
      },
      gameplay: {
        starting_metrics: {
          metric_economy: 88,
        },
      },
    };

    const normalizedCountry = normalizeCountryDoc(rawUnitedStates);
    const result = simulateScenarioLibrary([
      {
        id: 'foreign_crisis',
        title: '{the_ally} asks {the_player_country} to respond to {the_adversary}.',
        description: '{the_adversary} threatens a critical shipping lane while {the_ally} asks for support.',
        options: [
          { id: 'a', text: 'You mobilize naval escorts.', effects: [], outcomeHeadline: 'One', outcomeSummary: 'Two', outcomeContext: 'Three' },
          { id: 'b', text: 'You demand sanctions coordination.', effects: [], outcomeHeadline: 'One', outcomeSummary: 'Two', outcomeContext: 'Three' },
          { id: 'c', text: 'You open a backchannel.', effects: [], outcomeHeadline: 'One', outcomeSummary: 'Two', outcomeContext: 'Three' },
        ],
        metadata: { bundle: 'diplomacy' },
      },
    ], normalizedCountry, {
      us: normalizedCountry,
      ca: { id: 'ca', name: 'Canada', region: 'North America' },
      mx: { id: 'mx', name: 'Mexico', region: 'North America' },
      ru: { id: 'ru', name: 'Russia', region: 'Eurasia' },
    }, normalizedCountry.gameplayProfile?.startingMetrics ?? {});

    expect(result.eligible).toHaveLength(1);
    expect(result.eligible[0].title).toContain('Canada');
    expect(result.eligible[0].title).toContain('Russia');
  });

  it('returns eligible scenarios with resolved outcome fields and diagnostics', () => {
    const scenarios: SimScenarioDoc[] = [{
      id: 'trade_standoff',
      title: '{the_player_country} faces a tariff standoff',
      description: '{the_adversary} threatens new duties unless {the_player_country} retreats.',
      options: [
        {
          id: 'option_a',
          text: 'You threaten countermeasures against {the_adversary}.',
          label: 'Counter',
          effects: [{ targetMetricId: 'metric_trade', value: -2, duration: 3, probability: 1 }],
          advisorFeedback: [{ roleId: 'role_diplomacy', stance: 'oppose', feedback: '{the_adversary} may retaliate if you escalate.' }],
          outcomeHeadline: '{leader_title} rejects tariff pressure',
          outcomeSummary: '{the_player_country} signals it will not accept unilateral concessions.',
          outcomeContext: '{the_ally} privately urges restraint while exporters brace for disruption.',
        },
        {
          id: 'option_b',
          text: 'You offer a limited suspension while negotiators keep talking.',
          effects: [{ targetMetricId: 'metric_trade', value: 1, duration: 2, probability: 1 }],
          outcomeHeadline: '{leader_title} offers a temporary pause',
          outcomeSummary: 'Negotiators receive a short window to de-escalate the tariff dispute.',
          outcomeContext: '{the_ally} welcomes the pause and exporters reassess shipping plans.',
        },
        {
          id: 'option_c',
          text: 'You hold the line and wait for private business pressure to change the calculus.',
          effects: [{ targetMetricId: 'metric_approval', value: -1, duration: 2, probability: 1 }],
          outcomeHeadline: '{leader_title} delays a public response',
          outcomeSummary: 'The administration slows public escalation while industry lobbies both capitals.',
          outcomeContext: 'Markets stay tense as officials wait to see whether commercial pressure reshapes the dispute.',
        },
      ],
      conditions: [{ metricId: 'metric_economy', min: 40 }],
      metadata: {
        bundle: 'diplomacy',
        requiredGeopoliticalTags: ['western'],
      },
    }];

    const result = simulateScenarioLibrary(scenarios, unitedStates, countriesById, { metric_economy: 65 });

    expect(result.eligible).toHaveLength(1);
  expect(result.filtered).toHaveLength(0);

    const eligibleScenario = result.eligible[0];
    expect(eligibleScenario.title).toBe('The United States faces a tariff standoff');
    expect(eligibleScenario.options[0].outcomeSummary).toContain('The United States');
    expect(eligibleScenario.options[0].outcomeContext).toContain('Canada');
    expect(eligibleScenario.diagnostics.conditionChecks[0].passed).toBe(true);
    expect(eligibleScenario.diagnostics.validationChecks.some((check) => check.kind === 'required-tags' && check.passed)).toBe(true);
    expect(eligibleScenario.diagnostics.tokenUsages.some((usage) => usage.token === 'the_adversary')).toBe(true);
  });

  it('filters scenarios when a referenced border-rival token cannot be resolved', () => {
    const scenarios: SimScenarioDoc[] = [{
      id: 'border_flashpoint',
      title: '{the_border_rival} mass near the frontier',
      description: '{the_border_rival} issue a border ultimatum.',
      options: [
        { id: 'a', text: 'You mobilize troops.', effects: [], outcomeHeadline: 'One', outcomeSummary: 'Two', outcomeContext: 'Three' },
        { id: 'b', text: 'You seek mediation.', effects: [], outcomeHeadline: 'One', outcomeSummary: 'Two', outcomeContext: 'Three' },
        { id: 'c', text: 'You delay.', effects: [], outcomeHeadline: 'One', outcomeSummary: 'Two', outcomeContext: 'Three' },
      ],
      dynamic_profile: { actorPattern: 'border_rival' },
      metadata: { bundle: 'military' },
    }];

    const result = simulateScenarioLibrary(scenarios, unitedStates, countriesById, { metric_economy: 65 });

    expect(result.eligible).toHaveLength(0);
    expect(result.filtered).toHaveLength(1);
    expect(result.filtered[0].reason).toContain('land-adjacent adversarial or rival neighbor');
  });
});