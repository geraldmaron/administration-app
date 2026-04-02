import { describe, expect, it } from 'vitest';
import { buildSimulationTokenContext, normalizeCountryDoc, resolveSimulationText, simulateScenarioLibrary, type CountryDoc, type SimScenarioDoc } from './simulate';

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

// ---------------------------------------------------------------------------
// Country framing coverage
// Five representative profiles covering presidential/parliamentary/monarchy,
// article forms (the United States, Germany, Japan), and varying token sets.
// Each must resolve all tokens with zero fallbacks.
// ---------------------------------------------------------------------------

const FRAMING_COUNTRIES: CountryDoc[] = [
  {
    id: 'united_states',
    name: 'United States',
    region: 'north_america',
    leaderTitle: 'President',
    tokens: {
      leader_title: 'President',
      legislature: 'Congress',
      upper_house: 'Senate',
      lower_house: 'House of Representatives',
      ruling_party: 'Unity Party',
      opposition_party: 'Reform Party',
      finance_role: 'Treasury Secretary',
      defense_role: 'Secretary of Defense',
      justice_role: 'Attorney General',
      currency: 'dollar',
      central_bank: 'Federal Reserve',
      military_branch: 'Armed Forces',
      capital_city: 'Washington D.C.',
    },
    geopoliticalProfile: {
      neighbors: [{ countryId: 'canada', type: 'neutral', strength: 0.8, sharedBorder: true }],
      allies: [{ countryId: 'uk', type: 'formal_ally', strength: 0.9, sharedBorder: false }],
      adversaries: [{ countryId: 'russia', type: 'rival', strength: 0.9, sharedBorder: false }],
      tags: ['nato', 'western', 'nuclear_state'],
      governmentCategory: 'presidential',
      regimeStability: 0.8,
    },
  },
  {
    id: 'germany',
    name: 'Germany',
    region: 'europe',
    leaderTitle: 'Chancellor',
    tokens: {
      leader_title: 'Chancellor',
      legislature: 'Bundestag',
      upper_house: 'Bundesrat',
      ruling_party: 'CDU/CSU',
      opposition_party: 'SPD',
      finance_role: 'Finance Minister',
      defense_role: 'Defence Minister',
      justice_role: 'Justice Minister',
      currency: 'euro',
      central_bank: 'Bundesbank',
      military_branch: 'Bundeswehr',
      capital_city: 'Berlin',
    },
    geopoliticalProfile: {
      neighbors: [{ countryId: 'france', type: 'formal_ally', strength: 0.85, sharedBorder: true }],
      allies: [{ countryId: 'united_states', type: 'formal_ally', strength: 0.8, sharedBorder: false }],
      adversaries: [{ countryId: 'russia', type: 'rival', strength: 0.7, sharedBorder: false }],
      tags: ['nato', 'western', 'eu_member'],
      governmentCategory: 'parliamentary',
      regimeStability: 0.85,
    },
  },
  {
    id: 'japan',
    name: 'Japan',
    region: 'east_asia',
    leaderTitle: 'Prime Minister',
    tokens: {
      leader_title: 'Prime Minister',
      legislature: 'National Diet',
      upper_house: 'House of Councillors',
      lower_house: 'House of Representatives',
      ruling_party: 'Liberal Democratic Party',
      opposition_party: 'Constitutional Democratic Party',
      finance_role: 'Finance Minister',
      defense_role: 'Defence Minister',
      justice_role: 'Justice Minister',
      currency: 'yen',
      central_bank: 'Bank of Japan',
      military_branch: 'Self-Defense Forces',
      capital_city: 'Tokyo',
    },
    geopoliticalProfile: {
      neighbors: [{ countryId: 'south_korea', type: 'neutral', strength: 0.6, sharedBorder: false }],
      allies: [{ countryId: 'united_states', type: 'formal_ally', strength: 0.9, sharedBorder: false }],
      adversaries: [{ countryId: 'china', type: 'rival', strength: 0.8, sharedBorder: false }],
      tags: ['g7', 'developed'],
      governmentCategory: 'parliamentary',
      regimeStability: 0.85,
    },
  },
  {
    id: 'united_kingdom',
    name: 'United Kingdom',
    region: 'europe',
    leaderTitle: 'Prime Minister',
    tokens: {
      leader_title: 'Prime Minister',
      legislature: 'Parliament',
      upper_house: 'House of Lords',
      lower_house: 'House of Commons',
      ruling_party: 'Conservative Party',
      opposition_party: 'Labour Party',
      finance_role: 'Chancellor of the Exchequer',
      defense_role: 'Secretary of State for Defence',
      justice_role: 'Lord Chancellor',
      currency: 'pound',
      central_bank: 'Bank of England',
      military_branch: 'Armed Forces',
      capital_city: 'London',
    },
    geopoliticalProfile: {
      neighbors: [{ countryId: 'france', type: 'neutral', strength: 0.7, sharedBorder: false }],
      allies: [{ countryId: 'united_states', type: 'formal_ally', strength: 0.9, sharedBorder: false }],
      adversaries: [{ countryId: 'russia', type: 'rival', strength: 0.75, sharedBorder: false }],
      tags: ['nato', 'western', 'nuclear_state', 'g7'],
      governmentCategory: 'parliamentary',
      regimeStability: 0.8,
    },
  },
  {
    id: 'saudi_arabia',
    name: 'Saudi Arabia',
    region: 'middle_east',
    leaderTitle: 'King',
    tokens: {
      leader_title: 'King',
      legislature: 'Consultative Assembly',
      ruling_party: 'House of Saud',
      finance_role: 'Finance Minister',
      defense_role: 'Defence Minister',
      justice_role: 'Minister of Justice',
      currency: 'riyal',
      central_bank: 'Saudi Central Bank',
      military_branch: 'Royal Saudi Armed Forces',
      capital_city: 'Riyadh',
      major_industry: 'oil sector',
    },
    geopoliticalProfile: {
      neighbors: [{ countryId: 'uae', type: 'formal_ally', strength: 0.8, sharedBorder: true }],
      allies: [{ countryId: 'united_states', type: 'strategic_partner', strength: 0.7, sharedBorder: false }],
      adversaries: [{ countryId: 'iran', type: 'rival', strength: 0.85, sharedBorder: false }],
      tags: ['oil_exporter', 'authoritarian', 'monarchy'],
      governmentCategory: 'absolute_monarchy',
      regimeStability: 0.7,
    },
  },
];

// Core domestic tokens present in every government type (no opposition party)
const CORE_FRAMING_TEXTS = [
  'As {leader_title} of {the_player_country}, you face a budget shortfall that threatens core services. {The_finance_role} has warned that {the_legislature} will not pass emergency measures without broad support.',
  'You direct {the_finance_role} to present {the_legislature} with three fiscal paths before {player_country}\'s quarterly reserve threshold is breached.',
  '{leader_title} announced an emergency session of {the_legislature} after {the_finance_role} confirmed the scale of the shortfall.',
];

// Additional texts that require a legislature-based opposition — not applicable to absolute monarchies
const DEMOCRATIC_FRAMING_TEXTS = [
  '{The_opposition_party} is demanding a full audit before any spending bill proceeds.',
  'You direct {the_finance_role} to present {the_legislature} with three fiscal paths. {The_opposition_party} immediately challenges the projections, calling on {leader_title} to address {the_player_country}\'s structural deficit.',
];

const RELATED_COUNTRIES: Record<string, CountryDoc> = {
  canada:      { id: 'canada',      name: 'Canada',      region: 'north_america' },
  uk:          { id: 'uk',          name: 'United Kingdom', region: 'europe' },
  france:      { id: 'france',      name: 'France',      region: 'europe' },
  russia:      { id: 'russia',      name: 'Russia',      region: 'eurasia' },
  china:       { id: 'china',       name: 'China',       region: 'east_asia' },
  south_korea: { id: 'south_korea', name: 'South Korea', region: 'east_asia' },
  united_states: { id: 'united_states', name: 'United States', region: 'north_america' },
  uae:         { id: 'uae',         name: 'UAE',          region: 'middle_east' },
  iran:        { id: 'iran',        name: 'Iran',         region: 'middle_east' },
};

describe('country framing coverage', () => {
  for (const country of FRAMING_COUNTRIES) {
    const countriesById = { ...RELATED_COUNTRIES, [country.id]: country };
    const isMonarchy = country.geopoliticalProfile?.governmentCategory === 'absolute_monarchy';

    describe(country.name, () => {
      it('resolves core framing tokens with zero fallbacks', () => {
        const context = buildSimulationTokenContext(country, countriesById);
        for (const text of CORE_FRAMING_TEXTS) {
          const result = resolveSimulationText(text, context);
          expect(result.unresolvedTokens).toHaveLength(0);
          expect(result.fallbackTokens).toHaveLength(0);
          expect(result.text).not.toMatch(/\{[a-z_]+\}/i);
        }
      });

      if (!isMonarchy) {
        it('resolves opposition-party framing tokens with zero fallbacks', () => {
          const context = buildSimulationTokenContext(country, countriesById);
          for (const text of DEMOCRATIC_FRAMING_TEXTS) {
            const result = resolveSimulationText(text, context);
            expect(result.unresolvedTokens).toHaveLength(0);
            expect(result.fallbackTokens).toHaveLength(0);
            expect(result.text).not.toMatch(/\{[a-z_]+\}/i);
          }
        });
      }

      it('renders leader title in the correct form for the country', () => {
        const context = buildSimulationTokenContext(country, countriesById);
        const result = resolveSimulationText(
          'As {leader_title} of {the_player_country}, you face a critical decision.',
          context,
        );
        expect(result.text).toContain(country.leaderTitle!);
        expect(result.text).not.toMatch(/\{[a-z_]+\}/i);
      });

      it('applies the correct definite article to the country name', () => {
        const context = buildSimulationTokenContext(country, countriesById);
        const result = resolveSimulationText('{the_player_country} faces a governance crisis.', context);
        const needsArticle = ['united states', 'united kingdom'].includes(country.name.toLowerCase());
        if (needsArticle) {
          expect(result.text.toLowerCase()).toMatch(/^the /);
        } else {
          expect(result.text.toLowerCase()).not.toMatch(/^the /);
        }
      });
    });
  }
});
