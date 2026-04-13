import { evaluateRenderedOutputQuality } from '../lib/rendered-output-qa';
import type { BundleScenario } from '../lib/audit-rules';
import type { CountryDocument } from '../types';

const countries: Record<string, CountryDocument> = {
  usa: {
    id: 'usa',
    name: 'United States',
    code: 'US',
    region: 'north_america' as any,
    facts: {
      schema_version: 2,
      baseline_id: 'usa',
      demographics: { population_total: 300_000_000, source_year: 2024 },
      economy: { gdp_nominal_usd: 1_000_000_000_000, source_year: 2024, currency_name: 'US dollar' },
    },
    population: { total_millions: 300, demographics: { median_age: 38, urban_pct: 80, youth_pct: 20, working_age_pct: 60 } },
    economy: { gdp_billions: 1000, gdp_per_capita: 50000, system: 'market', primary_export: 'services', primary_import: 'electronics', trade_dependencies: [] },
    military: { doctrine: 'deterrent', overall_readiness: 70, nuclear: null, cyber: { offensive: 50, defensive: 50, apt_capability: false, infrastructure_targeting: false }, branches: [] },
    geopolitical: { neighbors: [{ countryId: 'mex', type: 'neutral', strength: 40, sharedBorder: true }], allies: [{ countryId: 'can', type: 'formal_ally', strength: 80, sharedBorder: true }], adversaries: [{ countryId: 'chn', type: 'adversary', strength: 75, sharedBorder: false }], tags: [] as any, governmentCategory: 'liberal_democracy', regimeStability: 80 },
    legislature: {} as any,
    legislature_initial_state: {} as any,
    tokens: { leader_title: 'President', legislature: 'Congress', finance_role: 'Treasury Secretary', governing_party: 'Unity Party' },
    gameplay: { starting_metrics: {}, metric_equilibria: {}, bundle_weight_overrides: {}, priority_tags: [], suppressed_tags: [], neighbor_event_chance: 0.2, term_turn_fraction: 1, difficulty: 'medium' },
    traits: [],
    description: 'test country',
  },
  can: {
    id: 'can', name: 'Canada', code: 'CA', region: 'north_america' as any,
    facts: {
      schema_version: 2,
      baseline_id: 'can',
      demographics: { population_total: 40_000_000, source_year: 2024 },
      economy: { gdp_nominal_usd: 500_000_000_000, source_year: 2024, currency_name: 'Canadian dollar' },
    },
    population: { total_millions: 40, demographics: { median_age: 40, urban_pct: 70, youth_pct: 18, working_age_pct: 62 } },
    economy: { gdp_billions: 500, gdp_per_capita: 40000, system: 'market', primary_export: 'energy', primary_import: 'machinery', trade_dependencies: [] },
    military: { doctrine: 'defensive', overall_readiness: 60, nuclear: null, cyber: { offensive: 30, defensive: 40, apt_capability: false, infrastructure_targeting: false }, branches: [] },
    geopolitical: { neighbors: [], allies: [], adversaries: [], tags: [] as any, governmentCategory: 'liberal_democracy', regimeStability: 85 },
    legislature: {} as any, legislature_initial_state: {} as any, tokens: {}, gameplay: { starting_metrics: {}, metric_equilibria: {}, bundle_weight_overrides: {}, priority_tags: [], suppressed_tags: [], neighbor_event_chance: 0.1, term_turn_fraction: 1, difficulty: 'medium' }, traits: [], description: 'ally country',
  },
  mex: {
    id: 'mex', name: 'Mexico', code: 'MX', region: 'north_america' as any,
    facts: {
      schema_version: 2,
      baseline_id: 'mex',
      demographics: { population_total: 120_000_000, source_year: 2024 },
      economy: { gdp_nominal_usd: 400_000_000_000, source_year: 2024, currency_name: 'Mexican peso' },
    },
    population: { total_millions: 120, demographics: { median_age: 30, urban_pct: 75, youth_pct: 25, working_age_pct: 58 } },
    economy: { gdp_billions: 400, gdp_per_capita: 15000, system: 'mixed', primary_export: 'manufacturing', primary_import: 'fuel', trade_dependencies: [] },
    military: { doctrine: 'defensive', overall_readiness: 50, nuclear: null, cyber: { offensive: 20, defensive: 20, apt_capability: false, infrastructure_targeting: false }, branches: [] },
    geopolitical: { neighbors: [], allies: [], adversaries: [], tags: [] as any, governmentCategory: 'liberal_democracy', regimeStability: 65 },
    legislature: {} as any, legislature_initial_state: {} as any, tokens: {}, gameplay: { starting_metrics: {}, metric_equilibria: {}, bundle_weight_overrides: {}, priority_tags: [], suppressed_tags: [], neighbor_event_chance: 0.1, term_turn_fraction: 1, difficulty: 'medium' }, traits: [], description: 'neighbor country',
  },
  chn: {
    id: 'chn', name: 'China', code: 'CN', region: 'east_asia' as any,
    facts: {
      schema_version: 2,
      baseline_id: 'chn',
      demographics: { population_total: 1_400_000_000, source_year: 2024 },
      economy: { gdp_nominal_usd: 2_000_000_000_000, source_year: 2024, currency_name: 'Renminbi' },
    },
    population: { total_millions: 1400, demographics: { median_age: 39, urban_pct: 65, youth_pct: 17, working_age_pct: 64 } },
    economy: { gdp_billions: 2000, gdp_per_capita: 18000, system: 'state-directed', primary_export: 'electronics', primary_import: 'energy', trade_dependencies: [] },
    military: { doctrine: 'power_projection', overall_readiness: 80, nuclear: null, cyber: { offensive: 60, defensive: 50, apt_capability: true, infrastructure_targeting: true }, branches: [] },
    geopolitical: { neighbors: [], allies: [], adversaries: [], tags: [] as any, governmentCategory: 'authoritarian', regimeStability: 85 },
    legislature: {} as any, legislature_initial_state: {} as any, tokens: {}, gameplay: { starting_metrics: {}, metric_equilibria: {}, bundle_weight_overrides: {}, priority_tags: [], suppressed_tags: [], neighbor_event_chance: 0.1, term_turn_fraction: 1, difficulty: 'high' }, traits: [], description: 'adversary country',
  },
};

function makeScenario(overrides: Partial<BundleScenario> = {}): BundleScenario {
  return {
    id: 'scenario_1',
    title: '{the_player_country} faces a trade shock',
    description: '{the_ally} asks {the_player_country} to respond while {the_adversary} threatens tariffs.',
    options: [
      { id: 'a', text: 'You back {the_ally} publicly.', effects: [{ targetMetricId: 'metric_trade', value: -1, duration: 2, probability: 1 }], outcomeHeadline: '{leader_title} backs allies', outcomeSummary: '{the_player_country} signals support.', outcomeContext: '{the_adversary} condemns the move.', advisorFeedback: [{ roleId: 'role_diplomacy', stance: 'support', feedback: '{the_ally} will welcome the signal.' }] },
      { id: 'b', text: 'You open negotiations.', effects: [{ targetMetricId: 'metric_foreign_relations', value: 1, duration: 2, probability: 1 }], outcomeHeadline: '{leader_title} seeks talks', outcomeSummary: 'Officials prepare talks.', outcomeContext: 'Markets watch the opening.', advisorFeedback: [{ roleId: 'role_diplomacy', stance: 'support', feedback: 'Negotiations may cool tensions.' }] },
      { id: 'c', text: 'You delay a response.', effects: [{ targetMetricId: 'metric_approval', value: -1, duration: 2, probability: 1 }], outcomeHeadline: '{leader_title} delays response', outcomeSummary: 'Domestic pressure grows.', outcomeContext: '{the_ally} questions the delay.', advisorFeedback: [{ roleId: 'role_executive', stance: 'concerned', feedback: 'Delay may look indecisive.' }] },
    ],
    metadata: { bundle: 'diplomacy', scopeTier: 'exclusive', scopeKey: 'country:usa', sourceKind: 'evergreen', exclusivityReason: 'historical', applicable_countries: ['usa'], region_tags: ['north_america'] },
    ...overrides,
  };
}

describe('evaluateRenderedOutputQuality', () => {
  test('passes for resolvable regional scenario samples', () => {
    const result = evaluateRenderedOutputQuality(makeScenario(), countries);
    expect(result.pass).toBe(true);
    expect(result.sampleCount).toBeGreaterThan(0);
  });

  test('fails when unresolved token fallback is required', () => {
    const result = evaluateRenderedOutputQuality(makeScenario({ description: '{the_missing_token} creates a crisis.' }), countries);
    expect(result.pass).toBe(false);
    expect(result.issues.map((item) => item.rule)).toContain('rendered-output-unresolved-token');
  });

  test('fails strict exclusive scenarios with fallback-heavy renders', () => {
    const scenario = makeScenario({
      metadata: {
        bundle: 'politics',
        scopeTier: 'exclusive',
        scopeKey: 'country:usa',
        sourceKind: 'evergreen',
        exclusivityReason: 'constitution',
        applicable_countries: ['usa'],
      },
      description: '{the_player_country} debates {the_unknown_body}.',
    });
    const result = evaluateRenderedOutputQuality(scenario, countries);
    expect(result.pass).toBe(false);
    expect(result.issues.some((item) => item.rule === 'rendered-output-fallback-heavy')).toBe(true);
  });

  describe('post-resolution prose quality', () => {
    test('fails when token resolves to produce "you the [Role]"', () => {
      // "you {finance_role}" where finance_role = "Treasury Secretary" → "you Treasury Secretary" is caught pre-resolution
      // "You the {finance_role}" → "You the Treasury Secretary" is caught post-resolution as well
      const scenario = makeScenario({
        description: 'You the {finance_role} announced new measures.',
      });
      const result = evaluateRenderedOutputQuality(scenario, countries);
      expect(result.pass).toBe(false);
      expect(result.issues.some((item) => item.rule === 'rendered-output-you-the')).toBe(true);
    });

    test('fails when token resolves to produce "your the [Role]"', () => {
      const scenario = makeScenario({
        description: 'Your the {finance_role} warned of a recession.',
      });
      const result = evaluateRenderedOutputQuality(scenario, countries);
      expect(result.pass).toBe(false);
      expect(result.issues.some((item) => item.rule === 'rendered-output-your-the')).toBe(true);
    });

    test('fails when consecutive articles appear after resolution', () => {
      // "a {the_finance_role}" → "a the Treasury Secretary" after resolution
      const scenario = makeScenario({
        description: 'Officials appointed a {the_finance_role} to lead negotiations.',
      });
      const result = evaluateRenderedOutputQuality(scenario, countries);
      expect(result.pass).toBe(false);
      expect(result.issues.some((item) => item.rule === 'rendered-output-double-article')).toBe(true);
    });

    test('passes for grammatically valid token usage', () => {
      const scenario = makeScenario({
        description: '{the_finance_role} announced new measures. The {finance_role} briefed {the_leader_title}.',
      });
      const result = evaluateRenderedOutputQuality(scenario, countries);
      const proseIssues = result.issues.filter((item) =>
        item.rule === 'rendered-output-you-the' || item.rule === 'rendered-output-your-the' || item.rule === 'rendered-output-double-article'
      );
      expect(proseIssues).toHaveLength(0);
    });

    test('passes for "You, the [Role]," with commas (grammatically correct appositive)', () => {
      const scenario = makeScenario({
        description: 'You, the {finance_role}, must decide quickly.',
      });
      const result = evaluateRenderedOutputQuality(scenario, countries);
      const proseIssues = result.issues.filter((item) =>
        item.rule === 'rendered-output-you-the' || item.rule === 'rendered-output-your-the'
      );
      expect(proseIssues).toHaveLength(0);
    });
  });
});
