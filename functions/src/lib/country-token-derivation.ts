import type { CountryAmountValues, CountryFacts, MilitaryProfile, GeopoliticalProfile, PoliticalParty } from '../types';

interface RawCountryProfile {
  geography?: string;
  economicScale?: string;
  vulnerabilities?: string[];
  strengths?: string[];
  tags?: string[];
}

interface RawCountryEconomy {
  primary_export?: string;
  primary_import?: string;
}

interface RawCountryGameplay {
  starting_metrics?: Record<string, number | undefined>;
}

interface RawCountryCabinetRole {
  id?: string;
  title?: string;
}

interface RawCountryCabinet {
  roles?: RawCountryCabinetRole[];
}

interface RawCountryInstitutions {
  executive?: NonNullable<CountryFacts['institutions']>['executive'];
  legislature?: NonNullable<CountryFacts['institutions']>['legislature'];
  office_titles?: NonNullable<CountryFacts['institutions']>['office_titles'];
}

export interface RawCountryRecord {
  id?: string;
  name?: string;
  facts: CountryFacts;
  cabinet?: RawCountryCabinet;
  profile?: RawCountryProfile;
  economy?: RawCountryEconomy;
  gameplay?: RawCountryGameplay;
  tokens?: Record<string, string | null | undefined>;
  military?: MilitaryProfile;
  parties?: PoliticalParty[];
  geopolitical?: GeopoliticalProfile;
}

const GENERIC_TOKEN_VALUES = new Set([
  'major exports',
  'national broadcaster',
  'state enterprise',
  'national investment fund',
  'the opposition leader',
]);

const SPECIAL_CURRENCY_PLURALS: Record<string, string> = {
  'argentine peso': 'Argentine pesos',
  'australian dollar': 'Australian dollars',
  'bangladeshi taka': 'Bangladeshi taka',
  'brazilian real': 'Brazilian reais',
  'canadian dollar': 'Canadian dollars',
  'chilean peso': 'Chilean pesos',
  'colombian peso': 'Colombian pesos',
  'cuban peso': 'Cuban pesos',
  euro: 'euros',
  'ghanaian cedi': 'Ghanaian cedis',
  'hungarian forint': 'Hungarian forints',
  'indian rupee': 'Indian rupees',
  'israeli new shekel': 'Israeli new shekels',
  'jamaican dollar': 'Jamaican dollars',
  'japanese yen': 'Japanese yen',
  'kenyan shilling': 'Kenyan shillings',
  'mexican peso': 'Mexican pesos',
  'new zealand dollar': 'New Zealand dollars',
  'russian ruble': 'Russian rubles',
  'saudi riyal': 'Saudi riyals',
  'south african rand': 'South African rand',
  'south korean won': 'South Korean won',
  'swiss franc': 'Swiss francs',
  'us dollar': 'US dollars',
  baht: 'baht',
  bolivar: 'bolivars',
  dollar: 'dollars',
  dong: 'dong',
  hryvnia: 'hryvnias',
  krona: 'kronor',
  krone: 'kroner',
  lira: 'lira',
  naira: 'naira',
  peso: 'pesos',
  pound: 'pounds',
  'pound sterling': 'pounds sterling',
  renminbi: 'renminbi',
  rial: 'rials',
  ringgit: 'ringgit',
  riyal: 'riyals',
  rupee: 'rupees',
  rupiah: 'rupiah',
  won: 'won',
  zloty: 'zloty',
};

const INVARIANT_CURRENCY_UNITS = new Set(['yen', 'won', 'yuan', 'renminbi', 'ringgit', 'rupiah', 'dong', 'baht', 'naira']);

const POPULATION_OVERRIDES: Record<string, number> = {
  nl: 17_500_000,
};

function cleanText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isGenericTokenValue(value: string | null | undefined): boolean {
  const normalized = cleanText(value)?.toLowerCase();
  return normalized ? GENERIC_TOKEN_VALUES.has(normalized) : false;
}

function getPopulation(country: RawCountryRecord): number | null {
  if (country.id && POPULATION_OVERRIDES[country.id]) {
    return POPULATION_OVERRIDES[country.id];
  }
  return country.facts.demographics.population_total ?? null;
}

function getGdp(country: RawCountryRecord): number | null {
  return country.facts.economy.gdp_nominal_usd ?? null;
}

function formatScaledNumber(value: number): string {
  const formatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: value >= 100 ? 0 : 1 });
  return formatter.format(value);
}

function formatPopulationScale(population: number | null): string | null {
  if (!population || population <= 0) return null;
  if (population >= 1_000_000_000) {
    return `a population of about ${formatScaledNumber(population / 1_000_000_000)} billion`;
  }
  if (population >= 1_000_000) {
    return `a population of about ${formatScaledNumber(population / 1_000_000)} million`;
  }
  return `a population of about ${formatScaledNumber(population)}`;
}

function normalizeExportLabel(value: string | null | undefined): string | null {
  const cleaned = cleanText(value);
  if (!cleaned) return null;
  return cleaned.replace(/_/g, ' ');
}

function pluralizeCurrencyUnit(currency: string | null): string {
  if (!currency) return 'currency units';

  const trimmed = currency.trim();
  const lower = trimmed.toLowerCase();
  const mapped = SPECIAL_CURRENCY_PLURALS[lower];
  if (mapped) return mapped;
  if (lower.endsWith('s')) return trimmed;

  const lastSpace = trimmed.lastIndexOf(' ');
  const prefix = lastSpace >= 0 ? trimmed.slice(0, lastSpace + 1) : '';
  const baseUnit = lastSpace >= 0 ? trimmed.slice(lastSpace + 1) : trimmed;
  const baseLower = baseUnit.toLowerCase();

  if (INVARIANT_CURRENCY_UNITS.has(baseLower)) return trimmed;
  if (baseLower === 'real') return `${prefix}reais`;
  if (baseLower.endsWith('y')) return `${prefix}${baseUnit.slice(0, -1)}ies`;
  if (baseLower.endsWith('a')) return `${trimmed}s`;
  if (baseLower.endsWith('o')) return `${trimmed}s`;
  return `${trimmed}s`;
}

function formatMoneyAmount(amount: number, currency: string | null): string {
  const unit = pluralizeCurrencyUnit(currency);
  if (amount >= 1_000_000_000_000) {
    return `${formatScaledNumber(amount / 1_000_000_000_000)} trillion ${unit}`;
  }
  if (amount >= 1_000_000_000) {
    return `${formatScaledNumber(amount / 1_000_000_000)} billion ${unit}`;
  }
  if (amount >= 1_000_000) {
    return `${formatScaledNumber(amount / 1_000_000)} million ${unit}`;
  }
  return `${formatScaledNumber(amount)} ${unit}`;
}

function formatUsdAmount(amount: number): string {
  return formatMoneyAmount(amount, 'US dollar');
}

function formatGdpDescription(gdp: number | null): string | null {
  if (!gdp || gdp <= 0) return null;
  return `an economy of about ${formatUsdAmount(gdp)}`;
}

function formatDerivedAmount(amount: number | null): string | null {
  if (!amount || amount <= 0) return null;
  return `approximately ${formatUsdAmount(amount)}`;
}

function deriveAmountValue(gdp: number | null, multiplier: number, randomFn?: () => number): number | null {
  if (!gdp || gdp <= 0) return null;
  return applyVariance(Math.round(gdp * multiplier), 0.15, randomFn);
}

function formatEconomicScale(gdp: number | null, geography: string | null): string | null {
  if (!gdp || gdp <= 0) return null;
  const isIsland = geography === 'island';
  if (gdp >= 20_000_000_000_000) return 'the world\'s largest economy';
  if (gdp >= 3_000_000_000_000) return 'one of the world\'s largest economies';
  if (gdp >= 1_000_000_000_000) return isIsland ? 'a large island economy' : 'a large economy';
  if (gdp >= 250_000_000_000) return isIsland ? 'a mid-sized island economy' : 'a mid-sized economy';
  return isIsland ? 'a small island economy' : 'a small economy';
}

function formatFiscalCondition(metricBudget: number | null): string | null {
  if (metricBudget === null || Number.isNaN(metricBudget)) return null;
  if (metricBudget >= 65) return 'strong fiscal headroom';
  if (metricBudget >= 50) return 'manageable fiscal pressure';
  if (metricBudget >= 35) return 'persistent fiscal strain';
  return 'acute fiscal strain';
}

function formatGeographyType(country: RawCountryRecord, population: number | null, gdp: number | null): string | null {
  const geography = cleanText(country.profile?.geography)?.toLowerCase();
  const tags = new Set((country.profile?.tags ?? []).map((tag) => tag.toLowerCase()));

  if (tags.has('archipelago')) return 'archipelagic state';
  if (geography === 'island') return 'island nation';
  if (geography === 'landlocked') return 'landlocked state';
  if (geography === 'coastal') return 'coastal state';
  if (geography === 'continental') {
    if ((population ?? 0) >= 100_000_000 || (gdp ?? 0) >= 1_000_000_000_000) {
      return 'continental power';
    }
    return 'continental state';
  }
  return null;
}

function formatClimateRisk(country: RawCountryRecord): string | null {
  const vulnerabilities = new Set((country.profile?.vulnerabilities ?? []).map((item) => item.toLowerCase()));
  const geography = cleanText(country.profile?.geography)?.toLowerCase();

  if (vulnerabilities.has('hurricane_prone')) return 'hurricane exposure';
  if (vulnerabilities.has('typhoon_prone')) return 'typhoon exposure';
  if (vulnerabilities.has('earthquake_prone')) return 'earthquake exposure';
  if (vulnerabilities.has('flood_prone')) return 'flood exposure';
  if (vulnerabilities.has('drought_prone')) return 'drought exposure';
  if (vulnerabilities.has('water_stress')) return 'water stress';
  if (vulnerabilities.has('deforestation')) return 'deforestation pressure';
  if (vulnerabilities.has('disaster_prone') || vulnerabilities.has('climate_disaster_exposure')) {
    return 'multi-hazard climate exposure';
  }
  if (vulnerabilities.has('climate_vulnerable')) {
    return geography === 'island' || geography === 'coastal'
      ? 'coastal climate exposure'
      : 'broad climate vulnerability';
  }
  if (geography === 'island' || geography === 'coastal') return 'coastal climate exposure';
  return 'multi-hazard climate exposure';
}

function deriveCommodityName(country: RawCountryRecord): string | null {
  const primaryExport = normalizeExportLabel(country.facts.economy.primary_export);
  if (primaryExport && primaryExport.toLowerCase() !== 'major exports') return primaryExport;

  const firstStrength = normalizeExportLabel(country.profile?.strengths?.[0]);
  return firstStrength;
}

function deriveInstitutionTokens(country: RawCountryRecord): Record<string, string | null> {
  const institutions = country.facts.institutions;
  const executive = institutions?.executive;
  const legislature = institutions?.legislature;
  const officeTitles = institutions?.office_titles as RawCountryInstitutions['office_titles'];
  const rolesById = new Map((country.cabinet?.roles ?? []).map((role) => [role.id ?? '', cleanText(role.title)] as const));

  const mappedRoles: Record<string, string | null> = {
    leader_title: cleanText(executive?.leader_title) ?? cleanText(executive?.head_of_state_title),
    head_of_state_title: cleanText(executive?.head_of_state_title),
    vice_leader: cleanText(executive?.vice_leader_title) ?? rolesById.get('role_executive') ?? cleanText(officeTitles?.executive_role),
    legislature: cleanText(legislature?.legislature),
    lower_house: cleanText(legislature?.lower_house ?? null),
    upper_house: cleanText(legislature?.upper_house ?? null),
    finance_role: cleanText(officeTitles?.finance_role) ?? rolesById.get('role_economy') ?? null,
    defense_role: cleanText(officeTitles?.defense_role) ?? rolesById.get('role_defense') ?? null,
    interior_role: cleanText(officeTitles?.interior_role) ?? rolesById.get('role_interior') ?? null,
    foreign_affairs_role: cleanText(officeTitles?.foreign_affairs_role) ?? rolesById.get('role_diplomacy') ?? null,
    justice_role: cleanText(officeTitles?.justice_role) ?? rolesById.get('role_justice') ?? null,
    health_role: cleanText(officeTitles?.health_role) ?? rolesById.get('role_health') ?? null,
    education_role: cleanText(officeTitles?.education_role) ?? rolesById.get('role_education') ?? null,
    commerce_role: cleanText(officeTitles?.commerce_role) ?? rolesById.get('role_commerce') ?? null,
    labor_role: cleanText(officeTitles?.labor_role) ?? rolesById.get('role_labor') ?? null,
    energy_role: cleanText(officeTitles?.energy_role) ?? rolesById.get('role_energy') ?? null,
    environment_role: cleanText(officeTitles?.environment_role) ?? rolesById.get('role_environment') ?? null,
    transport_role: cleanText(officeTitles?.transport_role) ?? rolesById.get('role_transport') ?? null,
    agriculture_role: cleanText(officeTitles?.agriculture_role),
    executive_role: cleanText(officeTitles?.executive_role),
    legislature_speaker: cleanText(officeTitles?.legislature_speaker),
    upper_house_leader: cleanText(officeTitles?.upper_house_leader),
    judiciary_role: cleanText(officeTitles?.judiciary_role),
    chief_justice_role: cleanText(officeTitles?.chief_justice_role),
    prosecutor_role: cleanText(officeTitles?.prosecutor_role),
    military_chief_title: cleanText(officeTitles?.military_chief_title),
    capital_mayor_title: cleanText(officeTitles?.capital_mayor_title),
    provincial_leader_title: cleanText(officeTitles?.provincial_leader_title),
    regional_governor_title: cleanText(officeTitles?.regional_governor_title),
    press_role: cleanText(officeTitles?.press_secretary_title),
  };

  return Object.fromEntries(
    Object.entries(mappedRoles).filter(([, value]) => value !== null),
  ) as Record<string, string | null>;
}

function deriveMilitaryBranchTokens(military: MilitaryProfile | undefined): Record<string, string | null> {
  if (!military?.branches?.length) return {};
  const result: Record<string, string | null> = {};
  for (const branch of military.branches) {
    if (branch.token_key && branch.local_name) {
      result[branch.token_key] = branch.local_name;
    }
  }
  return result;
}

function ideologyLabel(score: number): string {
  if (score <= 2) return 'far-left';
  if (score <= 4) return 'centre-left';
  if (score === 5) return 'centrist';
  if (score <= 7) return 'centre-right';
  if (score <= 9) return 'right-wing';
  return 'far-right';
}

function derivePoliticalPartyTokens(parties: PoliticalParty[] | undefined): Record<string, string | null> {
  if (!parties?.length) return {};
  const ruling = parties.find(p => p.isRuling);
  const coalition = parties.find(p => p.isCoalitionMember && !p.isRuling);
  const opposition = parties.find(p => !p.isRuling && !p.isCoalitionMember);
  return {
    governing_party: ruling?.name ?? null,
    governing_party_short: ruling?.shortName ?? null,
    governing_party_ideology: ruling ? ideologyLabel(ruling.ideology) : null,
    coalition_party: coalition?.name ?? null,
    opposition_party: opposition?.name ?? null,
  };
}

function deriveGeopoliticalTokens(geopolitical: GeopoliticalProfile | undefined): Record<string, string | null> {
  if (!geopolitical) return {};
  const topAlly = [...(geopolitical.allies ?? [])].sort((a, b) => b.strength - a.strength)[0];
  const topAdversary = [...(geopolitical.adversaries ?? [])].sort((a, b) => a.strength - b.strength)[0];
  const borderRival = (geopolitical.neighbors ?? []).find(n =>
    n.sharedBorder && ['rival', 'adversary', 'conflict'].includes(n.type),
  );
  return {
    primary_ally: topAlly?.countryId ?? null,
    primary_adversary: topAdversary?.countryId ?? null,
    border_rival_country: borderRival?.countryId ?? null,
    key_alliance: topAlly?.treaty ?? null,
  };
}

export function deriveCountryTokenPatch(country: RawCountryRecord, randomFn?: () => number): Record<string, string | null> {
  const population = getPopulation(country);
  const gdp = getGdp(country);
  const currency = cleanText(country.facts.economy.currency_name);
  const geographyType = formatGeographyType(country, population, gdp);
  const budgetMetric = country.gameplay?.starting_metrics?.metric_budget ?? null;
  const primaryImport = normalizeExportLabel(country.facts.economy.primary_import);
  const majorIndustry = normalizeExportLabel(country.facts.economy.major_industry);
  const centralBank = cleanText(country.facts.economy.central_bank);
  const amountValues = deriveCountryAmountValues(country, randomFn);

  const gdpWithVariance = gdp && gdp > 0 ? applyVariance(gdp, 0.15, randomFn) : gdp;
  const popWithVariance = population && population > 0 ? applyVariance(population, 0.10, randomFn) : population;

  return {
    ...deriveInstitutionTokens(country),
    ...deriveMilitaryBranchTokens(country.military),
    ...derivePoliticalPartyTokens(country.parties),
    ...deriveGeopoliticalTokens(country.geopolitical),
    currency,
    central_bank: centralBank,
    capital_city: cleanText(country.facts.geography?.capital_city),
    population_scale: formatPopulationScale(popWithVariance),
    gdp_description: formatGdpDescription(gdpWithVariance),
    economic_scale: formatEconomicScale(gdpWithVariance, cleanText(country.profile?.geography)?.toLowerCase() ?? null),
    fiscal_condition: formatFiscalCondition(budgetMetric),
    geography_type: geographyType,
    climate_risk: formatClimateRisk(country),
    commodity_name: deriveCommodityName(country),
    main_import: primaryImport,
    major_industry: majorIndustry,
    graft_amount: formatDerivedAmount(amountValues.graft_amount),
    infrastructure_cost: formatDerivedAmount(amountValues.infrastructure_cost),
    aid_amount: formatDerivedAmount(amountValues.aid_amount),
    trade_value: formatDerivedAmount(amountValues.trade_value),
    military_budget_amount: formatDerivedAmount(amountValues.military_budget_amount),
    disaster_cost: formatDerivedAmount(amountValues.disaster_cost),
    sanctions_amount: formatDerivedAmount(amountValues.sanctions_amount),
    opposition_leader: null,
    opposition_party_leader: null,
    opposition_party: cleanText(country.tokens?.opposition_party),
    state_media: isGenericTokenValue(country.tokens?.state_media) ? null : cleanText(country.tokens?.state_media),
    state_enterprise: isGenericTokenValue(country.tokens?.state_enterprise) ? null : cleanText(country.tokens?.state_enterprise),
    sovereign_fund: isGenericTokenValue(country.tokens?.sovereign_fund) ? null : cleanText(country.tokens?.sovereign_fund),
  };
}

function applyVariance(
  base: number,
  variancePct: number = 0.15,
  randomFn: () => number = Math.random,
): number {
  if (base <= 0) return base;
  const multiplier = 1 + (randomFn() * 2 - 1) * variancePct;
  return Math.round(base * multiplier);
}

export function deriveCountryAmountValues(
  country: Pick<RawCountryRecord, 'id' | 'facts'>,
  rng?: () => number,
): CountryAmountValues {
  const gdp = getGdp(country as RawCountryRecord);
  return {
    graft_amount: deriveAmountValue(gdp, 0.0175, rng),
    infrastructure_cost: deriveAmountValue(gdp, 0.03, rng),
    aid_amount: deriveAmountValue(gdp, 0.0055, rng),
    trade_value: deriveAmountValue(gdp, 0.1, rng),
    military_budget_amount: deriveAmountValue(gdp, 0.0275, rng),
    disaster_cost: deriveAmountValue(gdp, 0.0425, rng),
    sanctions_amount: deriveAmountValue(gdp, 0.06, rng),
    currency_code: 'USD',
  };
}
