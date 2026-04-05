/**
 * Token Registry — Single source of truth for all token definitions,
 * alias maps, role mappings, and prompt generation for the token system.
 *
 * All token-related constants and validation functions live here.
 * Other modules import from this file.
 */

import {
  CompiledTokenRegistry,
  TokenRegistryDocument,
  compileTokenRegistry,
  TokenCategory,
} from '../shared/token-registry-contract';

// ---------------------------------------------------------------------------
// 1. TOKEN_CATEGORIES — Categorized token definitions
// ---------------------------------------------------------------------------

export const TOKEN_CATEGORIES = {
  executive: [
    'leader_title',
    'vice_leader',
    'head_of_state_title',
  ] as const,

  legislative: [
    'legislature',
    'upper_house',
    'lower_house',
    'governing_party',
    'opposition_party',
    'legislature_speaker',
    'upper_house_leader',
    'opposition_leader',
    'governing_party_leader',
    'opposition_party_leader',
    'governing_party_ideology',
    'governing_party_short',
    'coalition_party',
  ] as const,

  judicial: [
    'judicial_role',
    'chief_justice_role',
    'prosecutor_role',
  ] as const,

  ministers: [
    'finance_role',
    'defense_role',
    'interior_role',
    'foreign_affairs_role',
    'justice_role',
    'health_role',
    'education_role',
    'commerce_role',
    'labor_role',
    'energy_role',
    'environment_role',
    'transport_role',
    'agriculture_role',
    'press_role',
  ] as const,

  security: [
    'intelligence_agency',
    'domestic_intelligence',
    'security_council',
    'police_force',
  ] as const,

  military: [
    'armed_forces_name',
    'military_chief_title',
    'special_forces',
    'coalition_name',
    'ground_forces_branch',
    'maritime_branch',
    'air_branch',
    'marine_branch',
    'space_branch',
    'paramilitary_branch',
    'coast_guard_branch',
    'cyber_branch',
    'intel_branch',
    'strategic_nuclear_branch',
  ] as const,

  economic: [
    'central_bank',
    'currency',
    'stock_exchange',
    'sovereign_fund',
    'state_enterprise',
    'commodity_name',
    'main_export',
    'main_import',
    'major_industry',
  ] as const,

  local: [
    'capital_mayor',
    'regional_governor',
    'provincial_leader',
    'capital_city',
  ] as const,

  media: [
    'state_media',
  ] as const,

  relationships: [
    'player_country',
    'regional_bloc',
    'primary_ally',
    'primary_adversary',
    'border_rival_country',
    'key_alliance',
  ] as const,

  geography: [
    'short_distance',
    'medium_distance',
    'long_distance',
    'locale_name',
    'region_type',
    'terrain',
    'geography_type',
    'climate_risk',
    'city_name',
    'state_name',
    'locale_type',
  ] as const,

  amounts: [
    'graft_amount',
    'infrastructure_cost',
    'aid_amount',
    'trade_value',
    'military_budget_amount',
    'disaster_cost',
    'sanctions_amount',
  ] as const,

  context: [
    'crisis_type',
    'scenario_theme',
    'economic_scale',
    'gdp_description',
    'population_scale',
    'fiscal_condition',
  ] as const,

  article_forms: [
    'the_player_country',
    'the_leader_title',
    'the_vice_leader',
    'the_finance_role',
    'the_defense_role',
    'the_interior_role',
    'the_foreign_affairs_role',
    'the_justice_role',
    'the_health_role',
    'the_education_role',
    'the_commerce_role',
    'the_labor_role',
    'the_energy_role',
    'the_environment_role',
    'the_transport_role',
    'the_agriculture_role',
    'the_press_role',
    'the_governing_party',
    'the_prosecutor_role',
    'the_intelligence_agency',
    'the_domestic_intelligence',
    'the_security_council',
    'the_police_force',
    'the_central_bank',
    'the_legislature',
    'the_upper_house',
    'the_lower_house',
    'the_judicial_role',
    'the_state_media',
    'the_capital_mayor',
    'the_regional_governor',
    'the_opposition_party',
    'the_opposition_leader',
    'the_major_industry',
    'the_coalition_name',
    'the_armed_forces_name',
    'the_military_chief_title',
    'the_special_forces',
    'the_ground_forces_branch',
    'the_maritime_branch',
    'the_air_branch',
    'the_cyber_branch',
    'the_stock_exchange',
    'the_sovereign_fund',
    'the_state_enterprise',
    'the_head_of_state_title',
    'the_capital_city',
    'the_regional_bloc',
    'the_judiciary_body',
    'the_governing_party_leader',
    'the_opposition_party_leader',
  ] as const,
} as const;

// ---------------------------------------------------------------------------
// 2. ALL_TOKENS — Flat readonly array of every valid token string
// ---------------------------------------------------------------------------

export const ALL_TOKENS: readonly string[] = [
  ...TOKEN_CATEGORIES.executive,
  ...TOKEN_CATEGORIES.legislative,
  ...TOKEN_CATEGORIES.judicial,
  ...TOKEN_CATEGORIES.ministers,
  ...TOKEN_CATEGORIES.security,
  ...TOKEN_CATEGORIES.military,
  ...TOKEN_CATEGORIES.economic,
  ...TOKEN_CATEGORIES.local,
  ...TOKEN_CATEGORIES.media,
  ...TOKEN_CATEGORIES.relationships,
  ...TOKEN_CATEGORIES.geography,
  ...TOKEN_CATEGORIES.amounts,
  ...TOKEN_CATEGORIES.context,
  ...TOKEN_CATEGORIES.article_forms,
];

// ---------------------------------------------------------------------------
// 2b. BUNDLE_TOKEN_RELEVANCE — Which token categories matter per bundle
// ---------------------------------------------------------------------------

type TokenCategoryKey = keyof typeof TOKEN_CATEGORIES;

const CORE_CATEGORIES: TokenCategoryKey[] = ['executive', 'context', 'article_forms'];

export const BUNDLE_TOKEN_RELEVANCE: Record<string, TokenCategoryKey[]> = {
  economy:     [...CORE_CATEGORIES, 'legislative', 'ministers', 'economic', 'local', 'amounts'],
  military:    [...CORE_CATEGORIES, 'ministers', 'military', 'security', 'relationships', 'geography'],
  politics:    [...CORE_CATEGORIES, 'legislative', 'judicial', 'ministers', 'local', 'media'],
  diplomacy:   [...CORE_CATEGORIES, 'ministers', 'relationships', 'geography'],
  health:      [...CORE_CATEGORIES, 'legislative', 'ministers', 'local'],
  environment: [...CORE_CATEGORIES, 'legislative', 'ministers', 'economic', 'geography'],
  justice:     [...CORE_CATEGORIES, 'legislative', 'judicial', 'ministers', 'security'],
  social:      [...CORE_CATEGORIES, 'legislative', 'ministers', 'local', 'media'],
  corruption:  [...CORE_CATEGORIES, 'legislative', 'judicial', 'ministers', 'security', 'economic', 'amounts'],
};

function getTokensForBundle(bundle: string): readonly string[] {
  const categories = BUNDLE_TOKEN_RELEVANCE[bundle.toLowerCase()];
  if (!categories) return ALL_TOKENS;
  const categorySet = new Set(categories);
  const tokens: string[] = [];
  for (const [key, values] of Object.entries(TOKEN_CATEGORIES)) {
    if (key === 'article_forms') continue;
    if (categorySet.has(key as TokenCategoryKey)) {
      tokens.push(...values);
    }
  }
  const tokenSet = new Set(tokens);
  for (const af of TOKEN_CATEGORIES.article_forms) {
    const bare = af.startsWith('the_') ? af.slice(4) : af;
    if (tokenSet.has(bare)) tokens.push(af);
  }
  return tokens;
}

// ---------------------------------------------------------------------------
// 3. ARTICLE_FORM_TOKEN_NAMES — Set of bare token names that have the_* forms
// ---------------------------------------------------------------------------

export const ARTICLE_FORM_TOKEN_NAMES: ReadonlySet<string> = new Set(
  TOKEN_CATEGORIES.article_forms
    .filter((t) => t.startsWith('the_'))
    .map((t) => t.slice(4)),
);

// ---------------------------------------------------------------------------
// 4. TOKEN_ALIAS_MAP — Hallucinated token name → valid token name
// ---------------------------------------------------------------------------

export const TOKEN_ALIAS_MAP: Readonly<Record<string, string>> = {
  'ruling_party':             'governing_party',
  'ruling_party_leader':      'governing_party_leader',
  'ruling_party_ideology':    'governing_party_ideology',
  'ruling_party_short':       'governing_party_short',
  'army_name':                'ground_forces_branch',
  'naval_fleet':              'maritime_branch',
  'air_wing':                 'air_branch',
  'army_branch':              'ground_forces_branch',
  'navy_branch':              'maritime_branch',
  'cyber_agency':             'cyber_branch',
  'military_branch':          'armed_forces_name',
  'culture_role':        'interior_role',
  'culture_ministry':    'interior_role',
  'media_role':          'interior_role',
  'communications_role': 'interior_role',
  'security_role':       'interior_role',
  'immigration_role':    'interior_role',
  'police_role':         'interior_role',
  'intelligence_role':   'interior_role',
  'ministry_of_interior':'interior_role',
  'housing_role':        'labor_role',
  'welfare_role':        'labor_role',
  'social_role':         'labor_role',
  'public_health_role':  'health_role',
  'technology_role':     'commerce_role',
  'innovation_role':     'commerce_role',
  'science_role':        'commerce_role',
  'research_role':       'commerce_role',
  'budget_role':         'finance_role',
  'infrastructure_role': 'transport_role',
  'military_role':       'defense_role',
  'cyber_role':          'defense_role',
  'foreign_role':        'foreign_affairs_role',
  'diplomacy_role':      'foreign_affairs_role',
  'labor_ministry':      'labor_role',
  'finance_ministry':    'finance_role',
  'defense_ministry':    'defense_role',
  'interior_ministry':   'interior_role',
  'health_ministry':     'health_role',
  'education_ministry':  'education_role',
  'energy_ministry':     'energy_role',
  'commerce_ministry':   'commerce_role',
  'justice_ministry':    'justice_role',
  'environment_ministry':'environment_role',
  'transport_ministry':  'transport_role',
  'agriculture_ministry':'agriculture_role',
  'foreign_ministry':    'foreign_affairs_role',
  // Explicit *_minister variants (covers model hallucinations like {transport_minister})
  'finance_minister':         'finance_role',
  'finance_secretary':        'finance_role',
  'defense_minister':         'defense_role',
  'defense_secretary':        'defense_role',
  'defence_minister':         'defense_role',
  'defence_secretary':        'defense_role',
  'interior_minister':        'interior_role',
  'interior_secretary':       'interior_role',
  'foreign_affairs_minister': 'foreign_affairs_role',
  'foreign_minister':         'foreign_affairs_role',
  'foreign_secretary':        'foreign_affairs_role',
  'justice_minister':         'justice_role',
  'justice_secretary':        'justice_role',
  'health_minister':          'health_role',
  'health_secretary':         'health_role',
  'education_minister':       'education_role',
  'education_secretary':      'education_role',
  'commerce_minister':        'commerce_role',
  'commerce_secretary':       'commerce_role',
  'industry_minister':        'commerce_role',
  'industry_secretary':       'commerce_role',
  'industry_role':            'commerce_role',
  'trade_minister':           'commerce_role',
  'trade_secretary':          'commerce_role',
  'trade_role':               'commerce_role',
  'banking_role':             'finance_role',
  'labor_minister':           'labor_role',
  'labour_minister':          'labor_role',
  'labor_secretary':          'labor_role',
  'labour_secretary':         'labor_role',
  'energy_minister':          'energy_role',
  'energy_secretary':         'energy_role',
  'environment_minister':     'environment_role',
  'environment_secretary':    'environment_role',
  'transport_minister':       'transport_role',
  'transport_secretary':      'transport_role',
  'agriculture_minister':     'agriculture_role',
  'agriculture_secretary':    'agriculture_role',
  'business_association':'major_industry',
  'business_alliance':   'major_industry',
  'trade_association':   'major_industry',
  'trade_alliance':      'major_industry',
  'industry_group':      'major_industry',
  'industry_alliance':   'major_industry',
  'rural_alliance':      'agriculture_role',
  'farmers_alliance':    'agriculture_role',
  'agricultural_sector': 'agriculture_role',
  'national_bank':       'central_bank',
  'federal_reserve':     'central_bank',
  'parliament':          'legislature',
  'congress':            'legislature',
  'senate':              'upper_house',
  'army':                'ground_forces_branch',
  'navy':                'maritime_branch',
  'air_force':           'air_branch',
  'president':           'leader_title',
  'prime_minister':      'leader_title',
  'chancellor':          'leader_title',
  'head_of_state':       'leader_title',
  'head_of_government':  'leader_title',
  'chief_executive':     'leader_title',
  'supreme_leader':      'leader_title',
  'monarch':             'leader_title',
  'king':                'leader_title',
  'queen':               'leader_title',
  'dictator':            'leader_title',
  'vice_president':      'vice_leader',
  'deputy_leader':       'vice_leader',
  'budget':              'fiscal_condition',
  'fiscal_budget':       'fiscal_condition',
  'national_budget':     'fiscal_condition',
  'government_budget':   'fiscal_condition',
  'military':            'armed_forces_name',
  'armed_forces':        'armed_forces_name',
  'national_guard':      'ground_forces_branch',
  'coast_guard':         'coast_guard_branch',
  'supreme_court':       'judicial_role',
  'high_court':          'judicial_role',
  'constitutional_court':'judicial_role',
  'attorney_general':    'prosecutor_role',
  'chief_prosecutor':    'prosecutor_role',
  'national_police':     'police_force',
  'secret_service':      'intelligence_agency',
  'spy_agency':          'intelligence_agency',
  'national_intelligence':'intelligence_agency',
  'opposition':          'opposition_party',
  'the_opposition':      'the_opposition_party',
  'foreign_intelligence':'intelligence_agency',
  'state_bank':          'central_bank',
  'reserve_bank':        'central_bank',
  'treasury':            'finance_role',
  'exchequer':           'finance_role',
  'state_television':    'state_media',
  'state_broadcaster':   'state_media',
  'national_media':      'state_media',
  'spokesperson':            'press_role',
  'government_spokesperson': 'press_role',
  'press_secretary':         'press_role',
  'judiciary':              'judicial_role',
  'judiciary_body':         'judicial_role',
  'the_judiciary':          'judicial_role',
  'courts':                 'judicial_role',
  'national_assembly':      'legislature',
  'lower_chamber':          'lower_house',
  'upper_chamber':          'upper_house',
  'military_general':       'military_chief_title',
  'general_staff':          'military_chief_title',
  'joint_chiefs':           'military_chief_title',
  'chief_of_staff':         'military_chief_title',
  'naval_commander':        'maritime_branch',
  'air_commander':          'air_branch',
  'military_capability':    'armed_forces_name',
  'nuclear_command':        'strategic_nuclear_branch',
  'cabinet_secretary':      'interior_role',
  'senior_official':        'leader_title',
  'industry_leader':        'major_industry',
  'private_sector':         'major_industry',
  'business_leader':        'major_industry',
  'central_intelligence':   'intelligence_agency',
  'security_services':      'intelligence_agency',
  'police':                 'police_force',
  'security_forces':        'police_force',
  'media_outlet':           'state_media',
  'public_broadcaster':     'state_media',
  'state_news':             'state_media',
  'commodity':              'commodity_name',
  'provincial_governor':    'regional_governor',
  'governor':               'regional_governor',
  'mayor':                  'capital_mayor',
};

// ---------------------------------------------------------------------------
// 5. ROLE_ALIAS_MAP — Invalid roleId → canonical roleId
// ---------------------------------------------------------------------------

export const ROLE_ALIAS_MAP: Readonly<Record<string, string>> = {
  'role_innovation':      'role_commerce',
  'role_science':         'role_commerce',
  'role_technology':      'role_commerce',
  'role_research':        'role_commerce',
  'role_finance':         'role_economy',
  'role_foreign_affairs': 'role_diplomacy',
  'role_security':        'role_interior',
  'role_welfare':         'role_labor',
  'role_social':          'role_labor',
  'role_public_health':   'role_health',
  'role_police':          'role_interior',
  'role_intelligence':    'role_interior',
  'role_cyber':           'role_defense',
  'role_budget':          'role_economy',
  'role_housing':         'role_labor',
  'role_immigration':     'role_interior',
};

// ---------------------------------------------------------------------------
// 6. CANONICAL_ROLE_IDS — The 13 valid advisor roleIds
// ---------------------------------------------------------------------------

export const CANONICAL_ROLE_IDS: ReadonlySet<string> = new Set([
  'role_executive',
  'role_diplomacy',
  'role_defense',
  'role_economy',
  'role_justice',
  'role_health',
  'role_commerce',
  'role_labor',
  'role_interior',
  'role_energy',
  'role_environment',
  'role_transport',
  'role_education',
]);

// ---------------------------------------------------------------------------
// 7. CONCEPT_TO_TOKEN_MAP — English concept → correct token
// ---------------------------------------------------------------------------

export const CONCEPT_TO_TOKEN_MAP: ReadonlyArray<{ concept: string; token: string }> = [
  { concept: 'president / prime minister / chancellor / head of government / head of state', token: '{leader_title}' },
  { concept: 'vice president / deputy prime minister / deputy leader', token: '{vice_leader}' },
  { concept: 'parliament / congress / national diet / senate / legislature / national assembly / riksdag', token: '{legislature}' },
  { concept: 'upper house / senate / house of lords', token: '{upper_house}' },
  { concept: 'lower house / house of representatives / house of commons', token: '{lower_house}' },
  { concept: 'governing party / ruling party / party in power / coalition in power / the administration (as political entity)', token: '{governing_party}' },
  { concept: 'governing coalition / ruling coalition / coalition government / coalition allies / parliamentary majority / legislative majority', token: '{governing_party} (use with {legislature} for majority framing)' },
  { concept: 'finance minister / treasury secretary / chancellor of the exchequer / minister of finance', token: '{finance_role}' },
  { concept: 'defence minister / secretary of defense / defence secretary', token: '{defense_role}' },
  { concept: 'interior minister / home secretary / secretary of homeland security', token: '{interior_role}' },
  { concept: 'foreign minister / secretary of state / foreign secretary / MFA head', token: '{foreign_affairs_role}' },
  { concept: 'attorney general / minister of justice / justice minister', token: '{justice_role}' },
  { concept: 'health minister / secretary of health / health secretary', token: '{health_role}' },
  { concept: 'education minister / secretary of education', token: '{education_role}' },
  { concept: 'trade/commerce minister / secretary of commerce / business secretary', token: '{commerce_role}' },
  { concept: 'labour/labor minister / work secretary', token: '{labor_role}' },
  { concept: 'energy minister / secretary of energy', token: '{energy_role}' },
  { concept: 'environment minister / EPA administrator / secretary of environment', token: '{environment_role}' },
  { concept: 'supreme court / constitutional court / high court', token: '{judicial_role}' },
  { concept: 'chief justice / president of the court', token: '{chief_justice_role}' },
  { concept: 'prosecutor general / attorney general (prosecutorial role)', token: '{prosecutor_role}' },
  { concept: 'intelligence agency / CIA / MI6 / Mossad / FSB / spy agency', token: '{intelligence_agency}' },
  { concept: 'domestic intelligence / FBI / MI5 / BfV / security service', token: '{domestic_intelligence}' },
  { concept: 'national security council / COBRA / NSC', token: '{security_council}' },
  { concept: 'central bank / federal reserve / bank of england / monetary authority / reserve bank', token: '{central_bank}' },
  { concept: 'national currency / dollar / euro / pound / yen / currency unit', token: '{currency}' },
  { concept: 'stock exchange / financial market / bourse', token: '{stock_exchange}' },
  { concept: 'state media / public broadcaster / national broadcaster / state television', token: '{state_media}' },
  { concept: 'press secretary / spokesperson / government communications director / communications secretary', token: '{press_role}' },
  { concept: 'armed forces / military / defence forces / national army', token: '{armed_forces_name}' },
  { concept: 'capital city / seat of government / capital', token: '{capital_city}' },
  { concept: 'opposition party / opposition bloc / main opposition / political opposition / opposition leader\'s party', token: '{opposition_party}' },
  { concept: 'regional bloc / regional organization / ASEAN / African Union / EU / ECOWAS / CARICOM / GCC / regional body', token: '{regional_bloc}' },
  { concept: 'major industry / main industry / primary sector / key economic sector / dominant sector', token: '{major_industry}' },
];

// ---------------------------------------------------------------------------
// 8. isValidToken
// ---------------------------------------------------------------------------

export function isValidToken(token: string): boolean {
  return ALL_TOKENS.includes(token.toLowerCase());
}

// ---------------------------------------------------------------------------
// 9. normalizeTokenAliases — Apply TOKEN_ALIAS_MAP substitutions to text
// ---------------------------------------------------------------------------

export function normalizeTokenAliases(text: string): string {
  let result = text;
  for (const [bad, good] of Object.entries(TOKEN_ALIAS_MAP)) {
    result = result.replace(new RegExp(`\\{the_${bad}\\}`, 'gi'), `{the_${good}}`);
    result = result.replace(new RegExp(`\\{${bad}\\}`, 'gi'), `{${good}}`);
  }
  const exactPlaceholderReplacements: ReadonlyArray<[RegExp, string]> = [
    [/\{the_legislature_speaker\}/gi, 'the speaker of {the_legislature}'],
    [/\{legislature_speaker\}/gi, 'speaker of {the_legislature}'],
    [/\{the_economy\}/gi, 'the economy'],
    [/\{economy\}/gi, 'the economy'],
    [/\{metric_public_order\}/gi, 'public order'],
    [/\{the_public_order\}/gi, 'public order'],
    [/\{public_order\}/gi, 'public order'],
    [/\{metric_approval\}/gi, 'public approval'],
    [/\{the_approval\}/gi, 'public approval'],
    [/\{approval\}/gi, 'public approval'],
    [/\{(?:the_)?major_trading_partner\}/gi, 'a major trading partner'],
    [/\{(?:the_)?trading_partner\}/gi, 'a trading partner'],
    [/\{(?:the_)?foreign_nation\}/gi, 'a foreign nation'],
    [/\{(?:the_)?neighboring_country\}/gi, 'a neighboring country'],
    [/\{(?:the_)?international_community\}/gi, 'the international community'],
  ];
  for (const [pattern, replacement] of exactPlaceholderReplacements) {
    result = result.replace(pattern, replacement);
  }

  const metricPlaceholderLabels: Readonly<Record<string, string>> = {
    approval: 'public approval',
    public_order: 'public order',
    foreign_relations: 'foreign relations',
    foreign_influence: 'foreign influence',
    economic_bubble: 'economic bubble',
  };

  result = result.replace(/\{(?:the_)?metric_([a-z_]+)\}/gi, (_match, metricName: string) => {
    const normalizedMetric = metricName.toLowerCase();
    if (metricPlaceholderLabels[normalizedMetric]) {
      return metricPlaceholderLabels[normalizedMetric];
    }

    return normalizedMetric.replace(/_/g, ' ');
  });

  return result;
}

// ---------------------------------------------------------------------------
// 10. buildTokenWhitelistPromptSection — Dynamic TOKEN SYSTEM prompt section
// ---------------------------------------------------------------------------

export function buildTokenWhitelistPromptSection(registry?: CompiledTokenRegistry): string {
  const cats: Readonly<Record<string, readonly string[]>> = registry
    ? registry.tokensByCategory
    : (TOKEN_CATEGORIES as Readonly<Record<string, readonly string[]>>);
  const aliases: Readonly<Record<string, string>> = registry ? registry.aliasMap : TOKEN_ALIAS_MAP;
  const concepts: ReadonlyArray<{ concept: string; token: string }> = registry
    ? registry.conceptToTokenMap
    : CONCEPT_TO_TOKEN_MAP;

  const categoryNames = Object.keys(cats).filter(k => k !== 'article_forms');

  const categorizedList = categoryNames.map(cat => {
    const tokens = cats[cat] ?? [];
    const label = cat.charAt(0).toUpperCase() + cat.slice(1).replace(/_/g, ' ');
    return `- **${label}**: ${Array.from(tokens).map(t => `{${t}}`).join(', ')}`;
  }).join('\n');

  const articleFormsList = Array.from(cats['article_forms'] ?? TOKEN_CATEGORIES.article_forms).map(t => `{${t}}`).join(', ');

  const invalidTokenEntries = Object.entries(aliases)
    .map(([bad, good]) => `- \`{${bad}}\` → use \`{${good}}\``)
    .join('\n');

  const canonicalRolesList = Array.from(CANONICAL_ROLE_IDS).map(r => `\`${r}\``).join(', ');

  const roleDefinitions = [
    ['role_executive', 'Chief of Staff / Executive Office (overall strategy and cabinet coordination)'],
    ['role_diplomacy', 'Foreign Affairs Minister (international relations, treaties, diplomatic posture)'],
    ['role_defense', 'Defense Minister (military operations, security doctrine, national defense)'],
    ['role_economy', 'Finance Minister / Treasury Secretary (fiscal policy, macroeconomic stability)'],
    ['role_justice', 'Attorney General / Justice Minister (rule of law, legal process, civil liberties)'],
    ['role_health', 'Health Minister (public health, medical systems, pandemic response)'],
    ['role_commerce', 'Commerce / Trade Minister (business regulation, domestic trade, industry)'],
    ['role_labor', 'Labor Minister (workers, wages, employment policy, unions)'],
    ['role_interior', 'Interior / Home Affairs Minister (domestic security, public order, border enforcement)'],
    ['role_energy', 'Energy Minister (power grid, energy supply, resource extraction)'],
    ['role_environment', 'Environment Minister (climate, natural resources, environmental regulation)'],
    ['role_transport', 'Transport Minister (infrastructure, logistics, transit networks)'],
    ['role_education', 'Education Minister (curriculum reform, literacy programs, university funding)'],
  ];
  const roleDefList = roleDefinitions.map(([id, desc]) => `- \`${id}\` — ${desc}`).join('\n');

  const invalidRoleRedirects = Object.entries(ROLE_ALIAS_MAP)
    .map(([bad, good]) => `- \`${bad}\` does NOT exist — use \`${good}\``)
    .join('\n');

  const conceptTable = concepts
    .map(({ concept, token }) => `- ${concept} → ${token}`)
    .join('\n');

  return buildFullTokenPromptSection(categorizedList, articleFormsList, invalidTokenEntries, canonicalRolesList, roleDefList, invalidRoleRedirects, conceptTable);
}

export function buildCompactTokenPromptSection(registry?: CompiledTokenRegistry): string {
  const concepts: ReadonlyArray<{ concept: string; token: string }> = registry
    ? registry.conceptToTokenMap
    : CONCEPT_TO_TOKEN_MAP;
  const canonicalRolesList = Array.from(CANONICAL_ROLE_IDS).map(r => `\`${r}\``).join(', ');
  const conceptTable = concepts
    .slice(0, 15)
    .map(({ concept, token }) => `- ${concept} → ${token}`)
    .join('\n');

  return `## Token System (MANDATORY)

Use \`{token}\` placeholders for country-specific institutional facts. NEVER hardcode country names, currencies, party names, or institution names.

### Institutional Tokens (use these)
- \`{the_player_country}\` — the player's country name (always use the_ form; bare \`{player_country}'s\` for possessives)
- \`{leader_title}\` — president / PM / chancellor
- \`{finance_role}\`, \`{defense_role}\`, \`{interior_role}\`, \`{foreign_affairs_role}\`, \`{justice_role}\`, \`{health_role}\`, \`{press_role}\` — government roles
- \`{legislature}\`, \`{governing_party}\`, \`{opposition_party}\` — political institutions
- \`{currency}\`, \`{central_bank}\`, \`{armed_forces_name}\`, \`{capital_city}\` — economic/military facts
- \`{major_industry}\`, \`{regional_bloc}\` — economic/political bodies

### Relationship Language (DO NOT use tokens for these)
Write relationship actors as natural language — do NOT use \`{adversary}\`, \`{ally}\`, \`{border_rival}\`, etc.
- ✅ "your border rival has mobilized forces" / "the allied government condemned the move"
- ✅ "a neighboring rival", "the hostile state", "your closest ally"
- ❌ \`{the_border_rival} has mobilized forces\` — REJECTED

Instead, declare the required relationship in the \`requires\` block of scenario metadata:
- \`requires.land_border_adversary: true\` — scenario involves a border rival
- \`requires.formal_ally: true\` — scenario involves an ally
- \`requires.adversary: true\` — scenario involves an adversary

### Relationship Effects (for option outcomes)
Use \`relationshipEffects\` on options to mutate relationship scores — NOT tokens in text.
- \`{ "relationshipId": "border_rival", "delta": -20 }\` — worsens the border rival relationship by 20
- \`{ "relationshipId": "ally", "delta": 10 }\` — strengthens the ally relationship by 10

### Article Form Rules
- Role tokens at sentence start: use \`{the_*}\` form (\`{the_finance_role} announced...\`)
- NEVER write \`"the {token}"\` — use \`{the_token}\` instead

### Hard Fail Rules
- Literal country names, capitals, or abbreviations = REJECTED
- Invented tokens not in the approved list = REJECTED
- Ministry/department names = REJECTED (use role tokens)
- Relationship tokens (\`{adversary}\`, \`{ally}\`, \`{border_rival}\`, etc.) in prose = REJECTED

### Valid Advisor Roles (for advisorFeedback.roleId)
${canonicalRolesList}

### Key Concept → Token Mappings
${conceptTable}`;
}

export function buildBundleScopedTokenPrompt(bundle: string, registry?: CompiledTokenRegistry): string {
  const bundleTokens = getTokensForBundle(bundle);
  const isFullSet = bundleTokens === ALL_TOKENS;

  const concepts: ReadonlyArray<{ concept: string; token: string }> = registry
    ? registry.conceptToTokenMap
    : CONCEPT_TO_TOKEN_MAP;
  const canonicalRolesList = Array.from(CANONICAL_ROLE_IDS).map(r => `\`${r}\``).join(', ');

  const bundleTokenSet = new Set(bundleTokens);
  const relevantConcepts = concepts
    .filter(({ token }) => isFullSet || bundleTokenSet.has(token) || bundleTokenSet.has(token.replace(/^the_/, '')))
    .slice(0, 15);
  const conceptTable = relevantConcepts
    .map(({ concept, token }) => `- ${concept} → ${token}`)
    .join('\n');

  const nonArticleTokens = bundleTokens.filter(t => !t.startsWith('the_'));
  const tokenList = nonArticleTokens.map(t => `\`{${t}}\``).join(', ');

  return `## Token System (MANDATORY)

Use \`{token}\` placeholders for country-specific institutional facts. NEVER hardcode country names, currencies, party names, or institution names.

### Available Tokens${!isFullSet ? ` (${bundle} bundle)` : ''}
${tokenList}

Article forms: for any token above, use \`{the_token}\` at sentence start instead of writing "the {token}".

### Relationship Language (DO NOT use tokens for these)
Write relationship actors as natural language — do NOT use \`{adversary}\`, \`{ally}\`, \`{border_rival}\`, etc.
- ✅ "your border rival has mobilized forces" / "the allied government condemned the move"
- ❌ \`{the_border_rival} has mobilized forces\` — REJECTED

Declare required relationships in \`requires\` metadata instead.

### Relationship Effects (for option outcomes)
Use \`relationshipEffects\` on options — NOT tokens in text.

### Hard Fail Rules
- Literal country names, capitals, or abbreviations = REJECTED
- Invented tokens not in the approved list = REJECTED
- Ministry/department names = REJECTED (use role tokens)
- Relationship tokens in prose = REJECTED

### Valid Advisor Roles (for advisorFeedback.roleId)
${canonicalRolesList}

### Key Concept → Token Mappings
${conceptTable}`;
}

function buildFullTokenPromptSection(
  categorizedList: string, articleFormsList: string,
  invalidTokenEntries: string, canonicalRolesList: string, roleDefList: string,
  invalidRoleRedirects: string, conceptTable: string
): string {
  return `## Token System

Use \`{token}\` placeholders for country-specific institutional facts. NEVER hardcode country names, currencies, party names, or institution names.

- \`{the_player_country}\` — the player's country name (with article — always use this form; bare \`{player_country}'s\` for possessives)
- \`{leader_title}\` — the player's title (President, Prime Minister, etc.)
- \`{finance_role}\` — Finance Minister / Secretary of the Treasury / etc.
- \`{the_finance_role}\` — article form for sentence-initial use
- \`{currency}\` — the country's currency name
- \`{gdp_description}\` — a description of GDP scale (NOT a specific number)

For role/title tokens, use the \`the_*\` form when the token opens a sentence. Never hard-code country names, currencies, or political party names.

### Approved Token Categories

${categorizedList}
- **Article forms**: ${articleFormsList}

### Relationship Actors — Use Natural Language, NOT Tokens

Do NOT use \`{adversary}\`, \`{ally}\`, \`{border_rival}\`, \`{neighbor}\`, \`{rival}\`, \`{trade_partner}\`, \`{neutral}\`, \`{nation}\`, \`{regional_rival}\` or their \`{the_*}\` forms in prose.

Write relationship actors as natural language:
- ✅ "Your border rival has mobilized forces along the northern frontier."
- ✅ "The allied government condemned the action in an emergency statement."
- ✅ "A neighboring rival imposed new trade restrictions."
- ❌ \`{the_border_rival} has mobilized forces\` — REJECTED

Declare the required relationship in the scenario's \`requires\` metadata instead:
- \`"requires": { "land_border_adversary": true }\` — scenario involves a land border rival
- \`"requires": { "formal_ally": true }\` — scenario involves a formal ally
- \`"requires": { "adversary": true }\` — scenario involves an adversary

### Relationship Effects (for option outcomes)

Use \`relationshipEffects\` on options — NOT relationship tokens in text:
- \`{ "relationshipId": "border_rival", "delta": -20 }\` — worsens the border rival relationship by 20
- \`{ "relationshipId": "ally", "delta": 10 }\` — strengthens the ally relationship by 10
- Valid relationshipIds: \`border_rival\`, \`adversary\`, \`ally\`, \`trade_partner\`, \`partner\`, \`rival\`, \`regional_rival\`, \`neutral\`, \`neighbor\`

### Article Form Rules

**Role/institution tokens at sentence start or after a preposition** → use \`{the_*}\` form:
- ❌ \`{finance_role} presented the plan.\` → ✅ \`{the_finance_role} presented the plan.\`
- ❌ \`{foreign_affairs_role} rejected the proposal.\` → ✅ \`{the_foreign_affairs_role} rejected the proposal.\`
- ❌ \`{legislature} blocked the vote.\` → ✅ \`{the_legislature} blocked the vote.\`

**COUNTRY NAME HARD-FAIL EXAMPLES:**
- ❌ "Nigeria faces a debt shock" → ✅ "{the_player_country} faces a debt shock"
- ❌ "London rejects the proposal" → ✅ "{capital_city} rejects the proposal"
- ❌ "The UK imposes penalties" → ✅ "A rival power imposes penalties" (natural language)
- Literal country names, capitals, and abbreviations in output are immediate rejection conditions.

**TOKEN WHITELIST SAFETY (hard requirement):**
- Use only approved tokens provided in context.
- Never invent new placeholders.
- If unsure a token exists, rewrite the sentence without a new token.

### Invalid Tokens (will cause immediate rejection)

${invalidTokenEntries}
- \`{budget}\` — NOT a valid token. Use \`{fiscal_condition}\` for fiscal state, \`{trade_value}\` for trade figures, \`{military_budget_amount}\` for defense spending.
- \`{president}\`, \`{prime_minister}\` — use \`{leader_title}\` instead.
- \`{country}\`, \`{country_name}\` — use \`{the_player_country}\` instead.
- \`{legislature_speaker}\`, \`{the_legislature_speaker}\` — NOT supported. Rewrite as \`speaker of {the_legislature}\`.
- Any relationship token (\`{adversary}\`, \`{ally}\`, \`{border_rival}\`, etc.) in prose = REJECTED. Use natural language.
- Any token not in the approved list fails validation.

### Hardcoded Government Structure Terms — Always Banned

- \`"ruling coalition"\` → use \`{governing_party}\`
- \`"governing coalition"\` → use \`{governing_party}\`
- \`"coalition government"\` → use \`{governing_party}\`
- \`"parliamentary majority"\` → use \`"{legislature} majority"\`
- \`"parliamentary minority"\` → use \`"{legislature} minority"\`
- \`"parliamentary support"\` → use \`"{legislature} support"\`
- \`"parliament"\` (standalone institution noun) → use \`{legislature}\`

### Hardcoded Ministry and Institution Names — Always Banned

- \`"Justice Ministry"\` / \`"Department of Justice"\` → use \`{justice_role}\` / \`{the_justice_role}\`
- \`"Finance Ministry"\` / \`"Treasury Department"\` → use \`{finance_role}\` / \`{the_finance_role}\`
- \`"Defense Ministry"\` / \`"Department of Defense"\` → use \`{defense_role}\` / \`{the_defense_role}\`
- \`"Interior Ministry"\` / \`"Home Office"\` / \`"Department of Homeland Security"\` → use \`{interior_role}\`
- \`"Foreign Ministry"\` / \`"State Department"\` / \`"Foreign Office"\` → use \`{foreign_affairs_role}\`
- \`"Health Ministry"\` / \`"Department of Health"\` → use \`{health_role}\`
- \`"Education Ministry"\` / \`"Department of Education"\` → use \`{education_role}\`
- \`"Commerce Ministry"\` / \`"Department of Commerce"\` → use \`{commerce_role}\`
- \`"Labour Ministry"\` / \`"Department of Labor"\` → use \`{labor_role}\`
- \`"Energy Ministry"\` / \`"Department of Energy"\` → use \`{energy_role}\`
- \`"Environment Ministry"\` / \`"Environmental Protection Agency"\` → use \`{environment_role}\`
- \`"Transport Ministry"\` / \`"Department of Transportation"\` → use \`{transport_role}\`
- \`"Agriculture Ministry"\` / \`"Department of Agriculture"\` → use \`{agriculture_role}\`

✅ \`"You direct {the_justice_role} to launch a formal inquiry."\`
✅ \`"{the_finance_role} warned the cabinet that the proposed subsidy exceeds available reserves."\`
✅ \`"Your {governing_party} warns that the reform threatens their influence in {legislature}."\`

### Institutional Body Tokens

- \`{opposition_party}\` / \`{the_opposition_party}\` — the main political opposition (not a party name)
- \`{regional_bloc}\` — a regional economic/political grouping (not "the EU", "ASEAN", etc.)
- \`{major_industry}\` / \`{the_major_industry}\` — the dominant industry sector (not "oil", "tech", etc.)

### Canonical Advisor Roles

Only these 13 are valid for \`advisorFeedback.roleId\`:
${canonicalRolesList}

${roleDefList}

**Invalid role redirects (never use these):**
${invalidRoleRedirects}
- **NEVER use a metric ID as a roleId**

### Concept → Token Mapping

${conceptTable}`;
}



/**
 * Build a "token cheat sheet" that shows local models what tokens resolve to
 * for a specific country. The model still outputs {token} placeholders, but
 * seeing concrete examples helps it use the right tokens.
 *
 * @param countryData - The country object from the country catalog (must have a `tokens` field)
 * @param scopeTier - The scope tier ('universal', 'regional', 'cluster', 'exclusive')
 * @returns A prompt section with token examples, or an empty string if no data
 */
export function preResolveTokenContext(
  countryData: Record<string, any> | undefined,
  scopeTier: string,
  registry?: CompiledTokenRegistry
): string {
  if (!countryData?.tokens) {
    return buildCompactTokenPromptSection(registry);
  }

  const tokens = countryData.tokens as Record<string, string>;
  const PRIORITY_TOKENS = [
    'leader_title', 'vice_leader', 'legislature', 'governing_party', 'opposition_party',
    'finance_role', 'defense_role', 'interior_role', 'foreign_affairs_role', 'justice_role',
    'health_role', 'education_role', 'commerce_role', 'labor_role', 'energy_role',
    'currency', 'central_bank', 'armed_forces_name', 'capital_city', 'major_industry',
  ];

  const cheatSheet = PRIORITY_TOKENS
    .filter(t => tokens[t])
    .map(t => `  {${t}} = "${tokens[t]}"`)
    .join('\n');

  // Build relationship context for prose guidance (informational only — do NOT use as tokens)
  const GEO = countryData.geopolitical;
  const relContext: string[] = [];
  if (GEO) {
    if (GEO.allies?.length)     relContext.push(`  ally: "${GEO.allies[0].countryId?.toUpperCase() || 'an allied nation'}"`);
    if (GEO.adversaries?.length) relContext.push(`  adversary: "${GEO.adversaries[0].countryId?.toUpperCase() || 'a rival power'}"`);
    const borderRival = (GEO.neighbors ?? []).find((n: any) => n.sharedBorder && ['rival','adversary','conflict'].includes(n.type));
    if (borderRival) relContext.push(`  border rival: "${borderRival.countryId?.toUpperCase()}"`);
    else if (GEO.neighbors?.length) relContext.push(`  neighbor: "${GEO.neighbors[0].countryId?.toUpperCase() || 'a neighboring state'}"`);
  }

  // Build amounts context — these are per-game randomized monetary values
  const amounts = countryData.amounts as Record<string, number | string | null> | undefined;
  const amountsContext = amounts ? [
    amounts.graft_amount ? `  {graft_amount} = "${tokens.graft_amount ?? formatAmountValue(amounts.graft_amount as number, amounts.currency_code as string)}"` : null,
    amounts.infrastructure_cost ? `  {infrastructure_cost} = "${tokens.infrastructure_cost ?? formatAmountValue(amounts.infrastructure_cost as number, amounts.currency_code as string)}"` : null,
    amounts.aid_amount ? `  {aid_amount} = "${tokens.aid_amount ?? formatAmountValue(amounts.aid_amount as number, amounts.currency_code as string)}"` : null,
    amounts.trade_value ? `  {trade_value} = "${tokens.trade_value ?? formatAmountValue(amounts.trade_value as number, amounts.currency_code as string)}"` : null,
    amounts.military_budget_amount ? `  {military_budget_amount} = "${tokens.military_budget_amount ?? formatAmountValue(amounts.military_budget_amount as number, amounts.currency_code as string)}"` : null,
    amounts.disaster_cost ? `  {disaster_cost} = "${tokens.disaster_cost ?? formatAmountValue(amounts.disaster_cost as number, amounts.currency_code as string)}"` : null,
    amounts.sanctions_amount ? `  {sanctions_amount} = "${tokens.sanctions_amount ?? formatAmountValue(amounts.sanctions_amount as number, amounts.currency_code as string)}"` : null,
  ].filter(Boolean).join('\n') : '';

  return `## Token System (MANDATORY)

Use {token} placeholders for institutional facts. NEVER hardcode names. Write relationship actors as natural language.

### Institutional Token Cheat Sheet
${cheatSheet}

${amountsContext ? `### Monetary Amounts (per-game randomized — use these tokens for financial references)\n${amountsContext}` : ''}

${relContext.length ? `### Country Relationships (use natural language for these — do NOT use as tokens)\n${relContext.join('\n')}\n- ✅ "your border rival has mobilized forces" — NOT \`{the_border_rival}\`\n- ✅ "the allied government condemned the move" — NOT \`{the_ally}\`\n` : ''}
### Rules
- Output {token} placeholders for institutional facts (cheat sheet above).
- Write relationship actors as natural language: "your border rival", "the allied nation", "a neighboring rival".
- NEVER output relationship tokens ({adversary}, {ally}, {border_rival}, etc.) in prose — REJECTED.
- Use {the_*} form at sentence start (e.g., {the_finance_role}, {the_legislature}).
- Use bare form only before 's for possessives ({player_country}'s economy).
- NEVER write "the {token}" — use {the_token} instead.
- NEVER hardcode country names, capitals, party names, or institution names.
${scopeTier === 'universal' ? '- UNIVERSAL SCOPE: keep entirely domestic. Do not reference foreign relationships.' : ''}

### requires block (MANDATORY when scenario involves foreign actors)
Add to metadata.requires when appropriate:
- \`"requires": { "land_border_adversary": true }\` — for border conflict scenarios
- \`"requires": { "formal_ally": true }\` — for scenarios involving an ally
- \`"requires": { "adversary": true }\` — for scenarios involving an adversary

### relationshipEffects (on options — mutates relationship scores)
- \`{ "relationshipId": "border_rival", "delta": -20 }\`
- Valid ids: border_rival, adversary, ally, trade_partner, partner, rival, regional_rival, neutral, neighbor

### Valid Advisor Roles
role_executive, role_diplomacy, role_defense, role_economy, role_justice, role_health, role_commerce, role_labor, role_interior, role_energy, role_environment, role_transport, role_education`;
}

function formatAmountValue(amount: number, currencyCode: string): string {
  const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode, maximumFractionDigits: 0 });
  return formatter.format(amount);
}

// ---------------------------------------------------------------------------
// 11. Registry Loader — Firestore-backed with TTL cache + hardcoded fallback
// ---------------------------------------------------------------------------

let _registryCache: { compiled: CompiledTokenRegistry; expiresAt: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let firestoreInstance: FirebaseFirestore.Firestore | null = null;

function getFirestore(): FirebaseFirestore.Firestore {
  if (!firestoreInstance) {
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
      admin.initializeApp();
    }
    firestoreInstance = admin.firestore();
  }
  return firestoreInstance!;
}

export function buildFallbackRegistry(): CompiledTokenRegistry {
  const categoryKeys: readonly TokenCategory[] = [
    'executive',
    'legislative',
    'judicial',
    'ministers',
    'security',
    'military',
    'economic',
    'local',
    'media',
    'relationships',
    'geography',
    'amounts',
    'context',
  ];

  const tokensByCategory = categoryKeys.reduce((acc, category) => {
    acc[category] = [...TOKEN_CATEGORIES[category]];
    return acc;
  }, {} as Record<TokenCategory | 'article_forms', readonly string[]>);

  tokensByCategory.article_forms = [...TOKEN_CATEGORIES.article_forms];

  return {
    version: 0,
    tokensByCategory,
    allTokens: [...ALL_TOKENS],
    articleFormTokenNames: new Set(ARTICLE_FORM_TOKEN_NAMES),
    aliasMap: { ...TOKEN_ALIAS_MAP },
    conceptToTokenMap: [...CONCEPT_TO_TOKEN_MAP],
  };
}

export async function loadCompiledTokenRegistry(): Promise<CompiledTokenRegistry> {
  if (_registryCache !== null && Date.now() < _registryCache.expiresAt) {
    return _registryCache.compiled;
  }

  try {
    const snapshot = await getFirestore().collection('world_state').doc('token_registry').get();
    const doc = snapshot.data() as TokenRegistryDocument | undefined;

    if (!doc) {
      throw new Error('Missing Firestore document world_state/token_registry');
    }

    const compiled = compileTokenRegistry(doc);
    _registryCache = {
      compiled,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };
    return compiled;
  } catch (error) {
    console.warn('[token-registry] Failed to load from Firestore, using hardcoded fallback:', error);
    const compiled = buildFallbackRegistry();
    _registryCache = {
      compiled,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };
    return compiled;
  }
}

export function invalidateTokenRegistryCache(): void {
  _registryCache = null;
}
