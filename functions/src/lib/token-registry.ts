/**
 * Token Registry — Single source of truth for all token definitions,
 * alias maps, role mappings, and prompt generation for the token system.
 *
 * All token-related constants and validation functions live here.
 * Other modules import from this file.
 */

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
    'ruling_party',
    'opposition_party',
    'legislature_speaker',
    'upper_house_leader',
    'opposition_leader',
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
  ] as const,

  security: [
    'intelligence_agency',
    'domestic_intelligence',
    'security_council',
    'police_force',
  ] as const,

  military: [
    'military_general',
    'military_branch',
    'special_forces',
    'naval_commander',
    'air_commander',
    'military_capability',
    'army_name',
    'naval_fleet',
    'air_wing',
    'cyber_agency',
    'nuclear_command',
    'coalition_name',
    'armed_forces_name',
    'military_chief_title',
    'army_branch',
    'navy_branch',
    'air_branch',
    'marine_branch',
    'space_branch',
    'paramilitary_branch',
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

  civil: [
    'cabinet_secretary',
    'senior_official',
  ] as const,

  media: [
    'state_media',
    'press_secretary',
  ] as const,

  relationships: [
    'player_country',
    'nation',
    'adversary',
    'border_rival',
    'regional_rival',
    'ally',
    'neutral',
    'rival',
    'partner',
    'trade_partner',
    'neighbor',
    'regional_bloc',
  ] as const,

  context: [
    'short_distance',
    'medium_distance',
    'long_distance',
    'locale_name',
    'region_type',
    'terrain',
    'crisis_type',
    'scenario_theme',
    'economic_scale',
    'gdp_description',
    'population_scale',
    'geography_type',
    'climate_risk',
    'military_capability',
    'fiscal_condition',
    'opposition_leader',
    'graft_amount',
    'infrastructure_cost',
    'aid_amount',
    'trade_value',
    'military_budget_amount',
    'disaster_cost',
    'sanctions_amount',
    'city_name',
    'state_name',
    'locale_type',
  ] as const,

  article_forms: [
    'the_adversary',
    'the_border_rival',
    'the_regional_rival',
    'the_ally',
    'the_trade_partner',
    'the_neutral',
    'the_rival',
    'the_partner',
    'the_neighbor',
    'the_player_country',
    'the_nation',
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
    'the_ruling_party',
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
    'the_press_secretary',
    'the_military_branch',
    'the_military_general',
    'the_cabinet_secretary',
    'the_senior_official',
    'the_capital_mayor',
    'the_regional_governor',
    'the_opposition_party',
    'the_opposition_leader',
    'the_major_industry',
    'the_regional_bloc',
    'the_army_name',
    'the_naval_fleet',
    'the_air_wing',
    'the_cyber_agency',
    'the_nuclear_command',
    'the_coalition_name',
    'the_armed_forces_name',
    'the_military_chief_title',
    'the_special_forces',
    'the_naval_commander',
    'the_air_commander',
    'the_stock_exchange',
    'the_sovereign_fund',
    'the_state_enterprise',
    'the_head_of_state_title',
    'the_capital_city',
  ] as const,

  party: [
    'ruling_party_leader',
    'opposition_party_leader',
    'ruling_party_ideology',
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
  ...TOKEN_CATEGORIES.civil,
  ...TOKEN_CATEGORIES.media,
  ...TOKEN_CATEGORIES.relationships,
  ...TOKEN_CATEGORIES.context,
  ...TOKEN_CATEGORIES.party,
  ...TOKEN_CATEGORIES.article_forms,
];

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
  'army':                'military_branch',
  'navy':                'military_branch',
  'air_force':           'military_branch',
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
  'military':            'military_branch',
  'armed_forces':        'armed_forces_name',
  'national_guard':      'military_branch',
  'coast_guard':         'military_branch',
  'supreme_court':       'judicial_role',
  'high_court':          'judicial_role',
  'constitutional_court':'judicial_role',
  'attorney_general':    'prosecutor_role',
  'chief_prosecutor':    'prosecutor_role',
  'national_police':     'police_force',
  'secret_service':      'intelligence_agency',
  'spy_agency':          'intelligence_agency',
  'national_intelligence':'intelligence_agency',
  'foreign_intelligence':'intelligence_agency',
  'state_bank':          'central_bank',
  'reserve_bank':        'central_bank',
  'treasury':            'finance_role',
  'exchequer':           'finance_role',
  'state_television':    'state_media',
  'state_broadcaster':   'state_media',
  'national_media':      'state_media',
  'spokesperson':        'press_secretary',
  'government_spokesperson': 'press_secretary',
  'enemy':               'adversary',
  'foe':                 'adversary',
  'hostile_nation':      'adversary',
  'hostile_power':       'adversary',
  'neighboring_country': 'neighbor',
  'neighbouring_country':'neighbor',
  'bordering_country':   'border_rival',
  'bordering_nation':    'border_rival',
  'trading_partner':     'trade_partner',
  'trade_ally':          'trade_partner',
  'allied_nation':       'ally',
  'allied_country':      'ally',
  'regional_power':      'regional_rival',
  'regional_competitor': 'regional_rival',
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
  { concept: 'ruling party / governing party / party in power / coalition in power / the administration (as political entity)', token: '{ruling_party}' },
  { concept: 'ruling coalition / governing coalition / coalition government / coalition allies / parliamentary majority / legislative majority', token: '{ruling_party} (use with {legislature} for majority framing)' },
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
  { concept: 'armed forces / military / defence forces / national army', token: '{military_branch}' },
  { concept: 'capital city / seat of government / capital', token: '{capital_city}' },
  { concept: 'hostile nation / adversary country / enemy state (not sharing a border)', token: '{the_adversary}' },
  { concept: 'hostile neighbour / border rival / border threat', token: '{the_border_rival}' },
  { concept: 'allied nation / friendly country / key ally', token: '{the_ally}' },
  { concept: 'trading partner / major trade partner', token: '{the_trade_partner}' },
  { concept: 'opposition party / opposition bloc / main opposition / political opposition / opposition leader\'s party', token: '{opposition_party}' },
  { concept: 'regional bloc / regional organization / ASEAN / African Union / EU / ECOWAS / CARICOM / GCC / regional body', token: '{the_regional_bloc}' },
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

export function buildTokenWhitelistPromptSection(): string {
  const categoryNames = Object.keys(TOKEN_CATEGORIES).filter(k => k !== 'article_forms') as Array<keyof typeof TOKEN_CATEGORIES>;

  const categorizedList = categoryNames.map(cat => {
    const tokens = TOKEN_CATEGORIES[cat];
    const label = cat.charAt(0).toUpperCase() + cat.slice(1).replace(/_/g, ' ');
    return `- **${label}**: ${tokens.map(t => `{${t}}`).join(', ')}`;
  }).join('\n');

  const articleFormsList = TOKEN_CATEGORIES.article_forms.map(t => `{${t}}`).join(', ');

  const relationshipTokens = [
    'the_adversary', 'the_border_rival', 'the_regional_rival', 'the_ally',
    'the_trade_partner', 'the_neutral', 'the_rival', 'the_partner',
    'the_neighbor', 'the_player_country', 'the_nation', 'the_regional_bloc',
  ];

  const invalidTokenEntries = Object.entries(TOKEN_ALIAS_MAP)
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

  const conceptTable = CONCEPT_TO_TOKEN_MAP
    .map(({ concept, token }) => `- ${concept} → ${token}`)
    .join('\n');

  return buildFullTokenPromptSection(categorizedList, articleFormsList, relationshipTokens, invalidTokenEntries, canonicalRolesList, roleDefList, invalidRoleRedirects, conceptTable);
}

export function buildCompactTokenPromptSection(): string {
  const canonicalRolesList = Array.from(CANONICAL_ROLE_IDS).map(r => `\`${r}\``).join(', ');
  const conceptTable = CONCEPT_TO_TOKEN_MAP
    .slice(0, 15)
    .map(({ concept, token }) => `- ${concept} → ${token}`)
    .join('\n');

  return `## Token System (MANDATORY)

Use \`{token}\` placeholders for ALL government roles, institutions, countries, and entities. NEVER hardcode names.

### Core Tokens
- \`{leader_title}\` — president/PM/chancellor
- \`{the_player_country}\` — the player's country (always use the_ form)
- \`{finance_role}\`, \`{defense_role}\`, \`{interior_role}\`, \`{foreign_affairs_role}\`, \`{justice_role}\`, \`{health_role}\` — government roles
- \`{legislature}\`, \`{ruling_party}\`, \`{opposition_party}\` — political institutions
- \`{the_adversary}\`, \`{the_ally}\`, \`{the_trade_partner}\`, \`{the_neighbor}\`, \`{the_border_rival}\` — foreign relations
- \`{currency}\`, \`{central_bank}\`, \`{stock_exchange}\`, \`{military_branch}\`, \`{capital_city}\` — infrastructure
- \`{major_industry}\`, \`{the_regional_bloc}\` — economic/political bodies

### Article Form Rules
- Country/relationship tokens: ALWAYS use \`{the_*}\` form except in possessives (\`{adversary}'s\`)
- Role tokens at sentence start: use \`{the_*}\` form (\`{the_finance_role} announced...\`)
- NEVER write \`"the {token}"\` — use \`{the_token}\` instead

### Hard Fail Rules
- Literal country names, capitals, or abbreviations = REJECTED
- Invented tokens not in the approved list = REJECTED
- Ministry/department names = REJECTED (use role tokens)
- "ruling coalition", "parliamentary majority" = REJECTED (use {ruling_party}, {legislature})

### Valid Advisor Roles (for advisorFeedback.roleId)
${canonicalRolesList}

### Key Concept → Token Mappings
${conceptTable}`;
}

function buildFullTokenPromptSection(
  categorizedList: string, articleFormsList: string, relationshipTokens: string[],
  invalidTokenEntries: string, canonicalRolesList: string, roleDefList: string,
  invalidRoleRedirects: string, conceptTable: string
): string {
  return `## Token System

All country-specific content must use \`{token}\` placeholders:

- \`{the_player_country}\` — the player's country name (with article — always use this form, never \`{player_country}\`)
- \`{leader_title}\` — the player's title (President, Prime Minister, etc.)
- \`{finance_role}\` — Finance Minister / Secretary of the Treasury / etc.
- \`{the_finance_role}\` — article form for sentence-initial use
- \`{currency}\` — the country's currency name
- \`{gdp_description}\` — a description of GDP scale (NOT a specific number to steal or misappropriate)

Use \`the_*\` forms for all country relationship tokens in narrative text. For role/title tokens, use the \`the_*\` form when the token opens a sentence. Never hard-code country names, currencies, or political party names.

### Approved Token Categories

${categorizedList}
- **Article forms**: ${articleFormsList}

### Article Form Usage Rules

**Country/relationship token rules:**

- **Subject, object, or any non-possessive position** → always use \`{the_*}\` form: ${relationshipTokens.map(t => `\`{${t}}\``).join(', ')}
  - ❌ \`{player_country} must decide...\` → ✅ \`{the_player_country} must decide...\`
  - ❌ \`Relations between your government and {ally}...\` → ✅ \`...and {the_ally}...\`
- **Possessive constructions** → bare form followed immediately by \`'s\` is valid:
  - ✅ \`{player_country}'s economy collapsed\`
  - ✅ \`{adversary}'s claims were dismissed\`
  - ✅ \`{ally}'s position hardened\`

**Role/institution tokens at sentence start or after a preposition** → use \`{the_*}\` form:
- ❌ \`{finance_role} presented the plan.\` → ✅ \`{the_finance_role} presented the plan.\`
- ❌ \`{foreign_affairs_role} rejected the proposal.\` → ✅ \`{the_foreign_affairs_role} rejected the proposal.\`
- ❌ \`{legislature} blocked the vote.\` → ✅ \`{the_legislature} blocked the vote.\`

**PRE-SUBMIT SCAN**: Before outputting your JSON, check for any bare relationship token (\`{player_country}\`, \`{adversary}\`, \`{ally}\`, \`{nation}\`, \`{neighbor}\`, \`{rival}\`, \`{partner}\`, \`{trade_partner}\`, \`{neutral}\`, \`{border_rival}\`, \`{regional_rival}\`) that is NOT followed immediately by \`'s\`. Replace those with the \`{the_*}\` form. Possessives like \`{player_country}'s\` and \`{adversary}'s\` are valid — do NOT replace them.

**COUNTRY NAME HARD-FAIL EXAMPLES:**
- ❌ "Nigeria faces a debt shock" → ✅ "{player_country} faces a debt shock"
- ❌ "London rejects the proposal" → ✅ "{capital_city} rejects the proposal"
- ❌ "The UK imposes penalties" → ✅ "{the_adversary} imposes penalties"
- Literal country names, capitals, and abbreviations in output are immediate rejection conditions.

**TOKEN WHITELIST SAFETY (hard requirement):**
- Use only approved tokens provided in context.
- Never invent new placeholders (for example \`{budget_crisis}\`, \`{federal_police}\`, \`{national_bank}\` are invalid unless explicitly listed).
- If you are unsure a token exists, rewrite the sentence without introducing a new token.

### Invalid Tokens (will cause immediate rejection)

${invalidTokenEntries}
- \`{budget}\` — NOT a valid token. Use \`{fiscal_condition}\` for fiscal state, \`{trade_value}\` for trade figures, \`{military_budget_amount}\` for defense spending.
- \`{president}\`, \`{prime_minister}\` — use \`{leader_title}\` instead.
- \`{country}\`, \`{country_name}\` — use \`{the_player_country}\` instead.
- \`{border_ival}\` — typo. Use \`{border_rival}\`.
- \`{legislature_speaker}\`, \`{the_legislature_speaker}\` — NOT supported runtime tokens. Rewrite as \`speaker of {the_legislature}\` or plain language.
- Any token not in the approved list fails validation. When in doubt, use approved tokens only.

### Hardcoded Government Structure Terms — Always Banned

These terms assume a specific government system and will read as wrong for presidential, authoritarian, or monarchic countries.
- \`"ruling coalition"\` → use \`{ruling_party}\`
- \`"governing coalition"\` → use \`{ruling_party}\`
- \`"coalition government"\` → use \`{ruling_party}\`
- \`"parliamentary majority"\` → use \`"{legislature} majority"\`
- \`"parliamentary minority"\` → use \`"{legislature} minority"\`
- \`"parliamentary support"\` → use \`"{legislature} support"\`
- \`"parliament"\` (as a standalone institution noun) → use \`{legislature}\`

### Hardcoded Ministry and Institution Names — Always Banned

These are country-specific names that will display incorrectly for most countries. Always use the role token.

- \`"Justice Ministry"\` / \`"Ministry of Justice"\` / \`"Department of Justice"\` / \`"Justice Department"\` → use \`{justice_role}\` / \`{the_justice_role}\`
- \`"Finance Ministry"\` / \`"Ministry of Finance"\` / \`"Treasury Department"\` / \`"Department of the Treasury"\` → use \`{finance_role}\` / \`{the_finance_role}\`
- \`"Defense Ministry"\` / \`"Defence Ministry"\` / \`"Ministry of Defense"\` / \`"Department of Defense"\` → use \`{defense_role}\` / \`{the_defense_role}\`
- \`"Interior Ministry"\` / \`"Ministry of Interior"\` / \`"Home Office"\` / \`"Department of Homeland Security"\` → use \`{interior_role}\` / \`{the_interior_role}\`
- \`"Foreign Ministry"\` / \`"Ministry of Foreign Affairs"\` / \`"State Department"\` / \`"Department of State"\` / \`"Foreign Office"\` → use \`{foreign_affairs_role}\` / \`{the_foreign_affairs_role}\`
- \`"Health Ministry"\` / \`"Ministry of Health"\` / \`"Department of Health"\` → use \`{health_role}\` / \`{the_health_role}\`
- \`"Education Ministry"\` / \`"Ministry of Education"\` / \`"Department of Education"\` → use \`{education_role}\` / \`{the_education_role}\`
- \`"Commerce Ministry"\` / \`"Ministry of Commerce"\` / \`"Department of Commerce"\` → use \`{commerce_role}\` / \`{the_commerce_role}\`
- \`"Labour Ministry"\` / \`"Labor Ministry"\` / \`"Ministry of Labour"\` / \`"Department of Labor"\` → use \`{labor_role}\` / \`{the_labor_role}\`
- \`"Energy Ministry"\` / \`"Ministry of Energy"\` / \`"Department of Energy"\` → use \`{energy_role}\` / \`{the_energy_role}\`
- \`"Environment Ministry"\` / \`"Ministry of Environment"\` / \`"Environmental Protection Agency"\` → use \`{environment_role}\` / \`{the_environment_role}\`
- \`"Transport Ministry"\` / \`"Ministry of Transport"\` / \`"Department of Transportation"\` → use \`{transport_role}\` / \`{the_transport_role}\`
- \`"Agriculture Ministry"\` / \`"Ministry of Agriculture"\` / \`"Department of Agriculture"\` → use \`{agriculture_role}\` / \`{the_agriculture_role}\`

✅ CORRECT: \`"You direct {the_justice_role} to launch a formal inquiry into the contracting scandal."\`
❌ WRONG: \`"You direct the Justice Ministry to launch a formal inquiry."\` (breaks for US, France, India, etc.)
✅ CORRECT: \`"{the_finance_role} warned the cabinet that the proposed subsidy exceeds available reserves."\`
❌ WRONG: \`"The Treasury Department warned the cabinet..."\` (US-only phrasing)

✅ CORRECT: \`"Your {ruling_party} warns that the reform threatens their influence in {legislature}."\`
❌ WRONG: \`"Your ruling coalition warns that the reform could collapse your parliamentary majority."\`

### Phase 10 Political and Economic Institution Tokens

These tokens represent abstract domestic institutions and must be used instead of invented names:
- \`{opposition_party}\` / \`{the_opposition_party}\` — the main political opposition (not a party name)
- \`{regional_bloc}\` / \`{the_regional_bloc}\` — a regional economic/political grouping (not "the EU", "ASEAN", etc.)
- \`{major_industry}\` / \`{the_major_industry}\` — the dominant industry sector in the player's economy (not "oil", "tech", etc.)

Usage examples:
- ✅ \`"Your {ruling_party} pushes the bill forward as {the_opposition_party} threatens a floor walkout."\`
- ✅ \`"{the_regional_bloc} trade ministers convened to review tariff schedules."\`
- ✅ \`"Lobbying pressure from {the_major_industry} intensified after the announcement."\`
- ✅ \`"You face {the_opposition_party}'s latest challenge with a slim floor majority."\`
- ❌ \`"The EU threatened retaliatory measures"\` → ✅ \`"{the_regional_bloc} threatened retaliatory measures"\`
- ❌ \`"Oil companies warned of divestment"\` → ✅ \`"{the_major_industry} warned of divestment"\`
- ❌ \`"The Democratic Party filed a motion"\` → ✅ \`"{the_opposition_party} filed a motion"\`

Apply the same \`{the_*}\` rules for these tokens as for relationship tokens: use the \`the_*\` form in subject/object positions; use the bare form only in possessives (\`{opposition_party}'s demands\`).

### Canonical Advisor Roles

Only these 13 are valid for \`advisorFeedback.roleId\`:
${canonicalRolesList}

${roleDefList}

**Invalid role redirects (never use these):**
${invalidRoleRedirects}
- **NEVER use a metric ID as a roleId** — metrics (\`metric_approval\`, \`metric_public_order\`, etc.) are different from roles (\`role_interior\`, \`role_diplomacy\`, etc.)

### Concept → Token Mapping

Never hardcode — always use the right token for the concept:
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
  scopeTier: string
): string {
  if (!countryData?.tokens || scopeTier === 'universal') {
    return buildCompactTokenPromptSection();
  }

  const tokens = countryData.tokens as Record<string, string>;
  const PRIORITY_TOKENS = [
    'leader_title', 'vice_leader', 'legislature', 'ruling_party', 'opposition_party',
    'finance_role', 'defense_role', 'interior_role', 'foreign_affairs_role', 'justice_role',
    'health_role', 'education_role', 'commerce_role', 'labor_role', 'energy_role',
    'currency', 'central_bank', 'military_branch', 'capital_city', 'major_industry',
  ];

  const cheatSheet = PRIORITY_TOKENS
    .filter(t => tokens[t])
    .map(t => `  {${t}} = "${tokens[t]}"`)
    .join('\n');

  const relationshipTokens: string[] = [];
  const GEO = countryData.geopolitical;
  if (GEO) {
    if (GEO.allies?.length) relationshipTokens.push(`  {the_ally} = a country like "${GEO.allies[0].countryId?.toUpperCase() || 'an allied nation'}"`);
    if (GEO.adversaries?.length) relationshipTokens.push(`  {the_adversary} = a country like "${GEO.adversaries[0].countryId?.toUpperCase() || 'a rival power'}"`);
    if (GEO.neighbors?.length) relationshipTokens.push(`  {the_neighbor} = a country like "${GEO.neighbors[0].countryId?.toUpperCase() || 'a neighboring state'}"`);
  }

  return `## Token System (MANDATORY)

Use {token} placeholders for ALL government roles, institutions, countries, and entities. NEVER hardcode names.

### Token Cheat Sheet (what these tokens resolve to for this country)
${cheatSheet}
${relationshipTokens.length ? '\n### Relationship Tokens\n' + relationshipTokens.join('\n') : ''}

### Rules
- ALWAYS output {token} placeholders in your JSON — NOT the resolved values above.
- The cheat sheet shows what tokens mean so you pick the RIGHT token for each concept.
- Use {the_*} form at sentence start or as subject (e.g., {the_finance_role}, {the_adversary}).
- Use bare form only before 's for possessives (e.g., {adversary}'s demands).
- NEVER write "the {token}" — use {the_token} instead.
- NEVER hardcode country names, capitals, party names, or institution names.
${scopeTier === 'universal' ? '- UNIVERSAL SCOPE: keep entirely domestic. Do NOT use relationship tokens.' : ''}

### Valid Advisor Roles
role_executive, role_diplomacy, role_defense, role_economy, role_justice, role_health, role_commerce, role_labor, role_interior, role_energy, role_environment, role_transport, role_education`;
}
