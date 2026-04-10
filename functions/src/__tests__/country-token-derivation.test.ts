import { deriveCountryTokenPatch, derivePlayerPartyTokens, type RawCountryRecord } from '../lib/country-token-derivation';

describe('deriveCountryTokenPatch', () => {
  test('derives scalable economy and population tokens from numeric country data', () => {
    const country: RawCountryRecord = {
      facts: {
        schema_version: 2,
        baseline_id: 'us',
        demographics: { population_total: 331_000_000, source_year: 2024 },
        economy: { gdp_nominal_usd: 25_400_000_000_000, source_year: 2024, currency_name: 'US dollar', primary_export: 'technology' },
        geography: { capital_city: 'Washington, D.C.' },
        institutions: {
          executive: { leader_title: 'President', head_of_state_title: 'President of the United States' },
          legislature: { legislature: 'Congress', lower_house: 'House of Representatives', upper_house: 'Senate' },
        },
      },
      profile: {
        geography: 'continental',
        vulnerabilities: ['climate_disaster_exposure'],
      },
      gameplay: {
        starting_metrics: { metric_budget: 45 },
      },
      tokens: {},
    };

    const patch = deriveCountryTokenPatch(country, () => 0.5);

    expect(patch.capital_city).toBe('Washington, D.C.');
    expect(patch.population_scale).toBe('a population of about 331 million');
    expect(patch.gdp_description).toBe('an economy of about 25.4 trillion US dollars');
    expect(patch.economic_scale).toBe("the world's largest economy");
    expect(patch.fiscal_condition).toBe('persistent fiscal strain');
    expect(patch.geography_type).toBe('continental power');
    expect(patch.climate_risk).toBe('multi-hazard climate exposure');
    expect(patch.trade_value).toBe('approximately 2.5 trillion US dollars');
    expect(patch.commodity_name).toBe('technology');
  });

  test('clears generic placeholder institution values and opposition leader token', () => {
    const country: RawCountryRecord = {
      facts: {
        schema_version: 2,
        baseline_id: 'jm',
        demographics: { population_total: 2_800_000, source_year: 2024 },
        economy: { gdp_nominal_usd: 17_000_000_000, source_year: 2024, currency_name: 'Jamaican dollar', primary_export: 'bauxite' },
      },
      profile: {
        geography: 'island',
        vulnerabilities: ['hurricane_prone'],
      },
      gameplay: {
        starting_metrics: { metric_budget: 22 },
      },
      tokens: {
        commodity_name: 'major exports',
        state_media: 'National Broadcaster',
        state_enterprise: 'State Enterprise',
        sovereign_fund: 'National Investment Fund',
        opposition_leader: 'the opposition leader',
      },
      economy: {
        primary_export: 'bauxite',
      },
    };

    const patch = deriveCountryTokenPatch(country);

    expect(patch.commodity_name).toBe('bauxite');
    expect(patch.state_media).toBeNull();
    expect(patch.state_enterprise).toBeNull();
    expect(patch.sovereign_fund).toBeNull();
    expect(patch.opposition_leader).toBeNull();
    expect(patch.geography_type).toBe('island nation');
    expect(patch.climate_risk).toBe('hurricane exposure');
    expect(patch.fiscal_condition).toBe('acute fiscal strain');
  });

  test('does not override derived opposition_party with stale stored token value', () => {
    const country: RawCountryRecord = {
      facts: {
        schema_version: 2,
        baseline_id: 'us',
        demographics: { population_total: 331_000_000, source_year: 2024 },
        economy: { gdp_nominal_usd: 25_400_000_000_000, source_year: 2024, currency_name: 'US dollar' },
      },
      parties: [
        { id: 'us_dem', countryId: 'us', name: 'Democratic Party', ideology: 3, isRuling: true, isCoalitionMember: false },
        { id: 'us_rep', countryId: 'us', name: 'Republican Party', ideology: 8, isRuling: false, isCoalitionMember: false },
      ],
      tokens: {
        opposition_party: 'STALE_VALUE',
      },
    };

    const patch = deriveCountryTokenPatch(country);

    expect(patch.opposition_party).toBe('Republican Party');
  });

  test('derives country role titles from the stored cabinet structure', () => {
    const country: RawCountryRecord = {
      facts: {
        schema_version: 2,
        baseline_id: 'ca',
        demographics: { population_total: 40_000_000, source_year: 2024 },
        economy: { gdp_nominal_usd: 2_200_000_000_000, source_year: 2024, currency_name: 'Canadian dollar' },
        institutions: {
          executive: { leader_title: 'Prime Minister', head_of_state_title: 'King of Canada', vice_leader_title: 'Deputy Prime Minister' },
          legislature: { legislature: 'Parliament of Canada', lower_house: 'House of Commons', upper_house: 'Senate' },
          office_titles: {
            finance_role: 'Minister of Finance',
            defense_role: 'Minister of National Defence',
            foreign_affairs_role: 'Minister of Foreign Affairs',
            justice_role: 'Minister of Justice',
            health_role: 'Minister of Health',
            education_role: 'Minister of Education',
            commerce_role: 'Minister of Trade',
            labor_role: 'Minister of Labour',
            interior_role: 'Minister of the Interior',
            energy_role: 'Minister of Energy',
            environment_role: 'Minister of Environment',
            transport_role: 'Minister of Transport',
          },
        },
      },
      cabinet: {
        roles: [
          { id: 'role_diplomacy', title: 'Minister of Foreign Affairs' },
          { id: 'role_defense', title: 'Minister of National Defence' },
          { id: 'role_economy', title: 'Minister of Finance' },
          { id: 'role_justice', title: 'Minister of Justice' },
          { id: 'role_health', title: 'Minister of Health' },
          { id: 'role_education', title: 'Minister of Education' },
          { id: 'role_commerce', title: 'Minister of Trade' },
          { id: 'role_labor', title: 'Minister of Labour' },
          { id: 'role_interior', title: 'Minister of the Interior' },
          { id: 'role_energy', title: 'Minister of Energy' },
          { id: 'role_environment', title: 'Minister of Environment' },
          { id: 'role_transport', title: 'Minister of Transport' },
        ],
      },
    };

    const patch = deriveCountryTokenPatch(country);

    expect(patch.leader_title).toBe('Prime Minister');
    expect(patch.head_of_state_title).toBe('King of Canada');
    expect(patch.vice_leader).toBe('Deputy Prime Minister');
    expect(patch.legislature).toBe('Parliament of Canada');
    expect(patch.lower_house).toBe('House of Commons');
    expect(patch.upper_house).toBe('Senate');
    expect(patch.finance_role).toBe('Minister of Finance');
    expect(patch.defense_role).toBe('Minister of National Defence');
    expect(patch.foreign_affairs_role).toBe('Minister of Foreign Affairs');
    expect(patch.justice_role).toBe('Minister of Justice');
    expect(patch.health_role).toBe('Minister of Health');
    expect(patch.education_role).toBe('Minister of Education');
    expect(patch.commerce_role).toBe('Minister of Trade');
    expect(patch.labor_role).toBe('Minister of Labour');
    expect(patch.interior_role).toBe('Minister of the Interior');
    expect(patch.energy_role).toBe('Minister of Energy');
    expect(patch.environment_role).toBe('Minister of Environment');
    expect(patch.transport_role).toBe('Minister of Transport');
  });
});

describe('derivePlayerPartyTokens', () => {
  const usaCountry: RawCountryRecord = {
    facts: {
      schema_version: 2,
      baseline_id: 'us',
      demographics: { population_total: 331_000_000, source_year: 2024 },
      economy: { gdp_nominal_usd: 25_400_000_000_000, source_year: 2024, currency_name: 'US dollar' },
    },
    parties: [
      { id: 'us_dem', countryId: 'us', name: 'Democratic Party', shortName: 'Democrats', ideology: 3, isRuling: false, isCoalitionMember: false, isMainOpposition: true },
      { id: 'us_rep', countryId: 'us', name: 'Republican Party', shortName: 'Republicans', ideology: 8, isRuling: true, isCoalitionMember: false, isMainOpposition: true },
    ],
    tokens: {},
  };

  test('when player picks Democrat, opposition resolves to Republican Party', () => {
    const tokens = derivePlayerPartyTokens(usaCountry, 'Democratic Party');
    expect(tokens.governing_party).toBe('Democratic Party');
    expect(tokens.opposition_party).toBe('Republican Party');
  });

  test('when player picks Republican (the isRuling party), opposition resolves to Democratic Party', () => {
    const tokens = derivePlayerPartyTokens(usaCountry, 'Republican Party');
    expect(tokens.governing_party).toBe('Republican Party');
    expect(tokens.opposition_party).toBe('Democratic Party');
  });

  test('matches by shortName when playerPartyName is an abbreviation', () => {
    const tokens = derivePlayerPartyTokens(usaCountry, 'Democrats');
    expect(tokens.governing_party).toBe('Democratic Party');
    expect(tokens.opposition_party).toBe('Republican Party');
  });

  test('falls back to isRuling when playerPartyName does not match any party', () => {
    const tokens = derivePlayerPartyTokens(usaCountry, 'Unknown Party');
    expect(tokens.governing_party).toBe('Republican Party');
    expect(tokens.opposition_party).toBe('Democratic Party');
  });

  test('without playerPartyName, uses isRuling flag as before', () => {
    const tokens = derivePlayerPartyTokens(usaCountry, undefined);
    expect(tokens.governing_party).toBe('Republican Party');
    expect(tokens.opposition_party).toBe('Democratic Party');
  });

  test('opposition_party is null when there is only one party', () => {
    const singlePartyCountry: RawCountryRecord = {
      ...usaCountry,
      parties: [
        { id: 'party_a', countryId: 'us', name: 'Unity Party', ideology: 5, isRuling: true, isCoalitionMember: false },
      ],
    };
    const tokens = derivePlayerPartyTokens(singlePartyCountry, 'Unity Party');
    expect(tokens.governing_party).toBe('Unity Party');
    expect(tokens.opposition_party).toBeNull();
  });

  test('isMainOpposition flag routes correctly in multi-party system, bypassing array order', () => {
    // Canada: array order would incorrectly return Bloc Québécois (first alphabetically)
    // but isMainOpposition on Liberals should win
    const canadaCountry: RawCountryRecord = {
      facts: { schema_version: 2, baseline_id: 'ca', demographics: { population_total: 40_000_000, source_year: 2024 }, economy: { gdp_nominal_usd: 2_200_000_000_000, source_year: 2024, currency_name: 'Canadian dollar' } },
      parties: [
        { id: 'ca_bloc',  countryId: 'ca', name: 'Bloc Québécois',              ideology: 4, isRuling: false, isCoalitionMember: false, isMainOpposition: false },
        { id: 'ca_con',   countryId: 'ca', name: 'Conservative Party of Canada', ideology: 7, isRuling: true,  isCoalitionMember: false, isMainOpposition: true },
        { id: 'ca_green', countryId: 'ca', name: 'Green Party of Canada',        ideology: 3, isRuling: false, isCoalitionMember: false, isMainOpposition: false },
        { id: 'ca_lib',   countryId: 'ca', name: 'Liberal Party of Canada',      ideology: 5, isRuling: false, isCoalitionMember: false, isMainOpposition: true },
        { id: 'ca_ndp',   countryId: 'ca', name: 'New Democratic Party',         ideology: 2, isRuling: false, isCoalitionMember: false, isMainOpposition: false },
      ],
      tokens: {},
    };
    // Player picks Conservative → Liberal should be opposition (not Bloc)
    const tokensAsCon = derivePlayerPartyTokens(canadaCountry, 'Conservative Party of Canada');
    expect(tokensAsCon.governing_party).toBe('Conservative Party of Canada');
    expect(tokensAsCon.opposition_party).toBe('Liberal Party of Canada');

    // Player picks Liberal → Conservative should be opposition (symmetric isMainOpposition)
    const tokensAsLib = derivePlayerPartyTokens(canadaCountry, 'Liberal Party of Canada');
    expect(tokensAsLib.governing_party).toBe('Liberal Party of Canada');
    expect(tokensAsLib.opposition_party).toBe('Conservative Party of Canada');
  });

  test('populates governing_party_leader and opposition_party_leader from currentLeader', () => {
    const countryWithLeaders: RawCountryRecord = {
      facts: { schema_version: 2, baseline_id: 'us', demographics: { population_total: 331_000_000, source_year: 2024 }, economy: { gdp_nominal_usd: 25_400_000_000_000, source_year: 2024, currency_name: 'US dollar' } },
      parties: [
        { id: 'us_rep', countryId: 'us', name: 'Republican Party', ideology: 8, isRuling: true, isCoalitionMember: false, isMainOpposition: true, currentLeader: 'Donald Trump' },
        { id: 'us_dem', countryId: 'us', name: 'Democratic Party', ideology: 3, isRuling: false, isCoalitionMember: false, isMainOpposition: true, currentLeader: 'Hakeem Jeffries' },
      ],
      tokens: {},
    };
    const tokens = derivePlayerPartyTokens(countryWithLeaders, 'Republican Party');
    expect(tokens.governing_party_leader).toBe('Donald Trump');
    expect(tokens.opposition_party_leader).toBe('Hakeem Jeffries');
  });

  test('governing_party_leader and opposition_party_leader are null when currentLeader absent', () => {
    const tokens = derivePlayerPartyTokens(usaCountry, 'Republican Party');
    expect(tokens.governing_party_leader).toBeNull();
    expect(tokens.opposition_party_leader).toBeNull();
  });
});
