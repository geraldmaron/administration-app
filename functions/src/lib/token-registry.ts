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
  isTokenSentenceStartArticleSafe,
} from '../shared/token-registry-contract';
import type { TokenStrategy, ScenarioScopeTier } from '../types';
import { REQUIRES_FLAG_REGISTRY, TOKEN_REQUIRES_MAP } from '../shared/scenario-audit';

// ---------------------------------------------------------------------------
// 1. TOKEN_CATEGORIES — Categorized token definitions
//    Tokens represent STABLE facts (persist regardless of regime changes).
//    Mutable political structures (legislature, parties) are condition-gated.
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
  ] as const,

  political: [
    'governing_party',
    'governing_party_short',
    'governing_party_leader',
    'governing_party_ideology',
    'opposition_party',
    'opposition_party_leader',
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
    'police_force',
  ] as const,

  military: [
    'armed_forces_name',
    'military_chief_title',
  ] as const,

  economic: [
    'central_bank',
    'currency',
    'stock_exchange',
  ] as const,

  local: [
    'capital_city',
  ] as const,

  media: [] as unknown as readonly string[],

  relationships: [
    'player_country',
    'regional_bloc',
  ] as const,

  geography: [] as unknown as readonly string[],

  amounts: [] as unknown as readonly string[],

  context: [] as unknown as readonly string[],

  article_forms: [
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
    'the_prosecutor_role',
    'the_intelligence_agency',
    'the_police_force',
    'the_central_bank',
    'the_judicial_role',
    'the_armed_forces_name',
    'the_military_chief_title',
    'the_stock_exchange',
    'the_head_of_state_title',
    'the_capital_city',
    'the_regional_bloc',
  ] as const,
} as const;

// ---------------------------------------------------------------------------
// 1b. CONDITION_GATED_TOKENS — Tokens that require country-profile prerequisites.
//     Derived from REQUIRES_FLAG_REGISTRY via TOKEN_REQUIRES_MAP so that adding
//     a new flag + token to the registry is the only change needed.
// ---------------------------------------------------------------------------

export const CONDITION_GATED_TOKENS: ReadonlyArray<{
  token: string;
  requiresFlag: string;
  conditionMetric?: string;
  conditionMin?: number;
  conditionMax?: number;
}> = (Object.entries(TOKEN_REQUIRES_MAP) as Array<[string, keyof typeof REQUIRES_FLAG_REGISTRY]>).map(
  ([tokenName, flagKey]) => {
    const def = REQUIRES_FLAG_REGISTRY[flagKey];
    return {
      token: tokenName,
      requiresFlag: flagKey,
      ...(def?.condition?.op === 'min'
        ? { conditionMetric: def.condition.metricId, conditionMin: def.condition.threshold }
        : def?.condition?.op === 'max'
        ? { conditionMetric: def.condition.metricId, conditionMax: def.condition.threshold }
        : {}),
    };
  }
);

export const CONDITION_GATED_TOKEN_SET = new Set(CONDITION_GATED_TOKENS.map(t => t.token));

// ---------------------------------------------------------------------------
// 1c. DEPRECATED_TOKENS — Tokens removed from the active set.
//     The alias map maps these to plain language for backwards compatibility.
// ---------------------------------------------------------------------------

export const DEPRECATED_TOKENS: ReadonlyArray<{ token: string; replacement: string }> = [];

const DEPRECATED_TOKEN_SET = new Set<string>();

// ---------------------------------------------------------------------------
// 2. ALL_TOKENS — Flat readonly array of every valid token string
// ---------------------------------------------------------------------------

export const ALL_TOKENS: readonly string[] = [
  ...TOKEN_CATEGORIES.executive,
  ...TOKEN_CATEGORIES.legislative,
  ...TOKEN_CATEGORIES.political,
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

const CORE_CATEGORIES: TokenCategoryKey[] = ['executive', 'article_forms'];

export const BUNDLE_TOKEN_RELEVANCE: Record<string, TokenCategoryKey[]> = {
  economy:     [...CORE_CATEGORIES, 'ministers', 'economic', 'political'],
  military:    [...CORE_CATEGORIES, 'ministers', 'military', 'security'],
  politics:    [...CORE_CATEGORIES, 'judicial', 'ministers', 'political', 'legislative'],
  diplomacy:   [...CORE_CATEGORIES, 'ministers'],
  health:      [...CORE_CATEGORIES, 'ministers'],
  environment: [...CORE_CATEGORIES, 'ministers', 'economic'],
  justice:     [...CORE_CATEGORIES, 'judicial', 'ministers', 'security'],
  social:      [...CORE_CATEGORIES, 'ministers'],
  corruption:  [...CORE_CATEGORIES, 'judicial', 'ministers', 'security', 'economic'],
};

// ---------------------------------------------------------------------------
// 2c. MINIMAL TOKEN SET — Reduced token system for non-legacy strategies.
//     No article form tokens. LLM writes "the {finance_role}" naturally.
// ---------------------------------------------------------------------------

export const MINIMAL_CORE_TOKENS = [
  'leader_title',
  'player_country',
  'currency',
] as const;

export const MINIMAL_ROLE_TOKENS = [
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
] as const;

export const MINIMAL_INSTITUTIONAL_TOKENS = [
  'central_bank',
  'armed_forces_name',
  'intelligence_agency',
  'police_force',
  'judicial_role',
  'prosecutor_role',
  'capital_city',
] as const;

export const MINIMAL_POLITICAL_TOKENS = [
  'governing_party',
  'opposition_party',
  'legislature',
] as const;

export const MINIMAL_ALL_TOKENS: readonly string[] = [
  ...MINIMAL_CORE_TOKENS,
  ...MINIMAL_ROLE_TOKENS,
  ...MINIMAL_INSTITUTIONAL_TOKENS,
  ...MINIMAL_POLITICAL_TOKENS,
];

const MINIMAL_TOKEN_SET = new Set(MINIMAL_ALL_TOKENS);

export function getTokensForStrategy(strategy: TokenStrategy): readonly string[] {
  switch (strategy) {
    case 'none': return [];
    case 'minimal': return MINIMAL_ALL_TOKENS;
  }
}

export function isValidTokenForStrategy(token: string, strategy: TokenStrategy): boolean {
  if (strategy === 'none') return false;
  return MINIMAL_TOKEN_SET.has(token.toLowerCase());
}

export function deriveTokenStrategy(scopeTier: ScenarioScopeTier): TokenStrategy {
  if (scopeTier === 'exclusive') return 'none';
  return 'minimal';
}

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

export const NON_PREFIXING_ARTICLE_FORM_TOKEN_NAMES: ReadonlySet<string> = new Set([
  'legislature',
  'upper_house',
  'lower_house',
  'governing_party',
  'opposition_party',
  'capital_city',
  'regional_bloc',
]);

export const SENTENCE_START_ARTICLE_FORM_TOKEN_NAMES: ReadonlySet<string> = new Set(
  [...ARTICLE_FORM_TOKEN_NAMES].filter((token) => !NON_PREFIXING_ARTICLE_FORM_TOKEN_NAMES.has(token))
);

for (const tokenName of SENTENCE_START_ARTICLE_FORM_TOKEN_NAMES) {
  const category = Object.entries(TOKEN_CATEGORIES).find(([, values]) =>
    Array.isArray(values) && values.includes(tokenName)
  )?.[0] as TokenCategory | undefined;
  if (category && !isTokenSentenceStartArticleSafe(tokenName, category)) {
    throw new Error(`[TokenRegistry] ${tokenName} is marked sentence-start article-safe but category ${category} is not safe`);
  }
}

// ---------------------------------------------------------------------------
// 4. TOKEN_ALIAS_MAP — Hallucinated token name → valid token name
//    Deprecated tokens map to their plain-language replacements via
//    normalizeTokenAliases. Role/minister aliases still map to valid tokens.
// ---------------------------------------------------------------------------

export const TOKEN_ALIAS_MAP: Readonly<Record<string, string>> = {
  'culture_role':        'interior_role',
  'security_role':       'interior_role',
  'immigration_role':    'interior_role',
  'police_role':         'interior_role',
  'welfare_role':        'labor_role',
  'social_role':         'labor_role',
  'healthcare_role':     'health_role',
  'technology_role':     'commerce_role',
  'innovation_role':     'commerce_role',
  'budget_role':         'finance_role',
  'infrastructure_role': 'transport_role',
  'military_role':       'defense_role',
  'foreign_role':        'foreign_affairs_role',
  'diplomacy_role':      'foreign_affairs_role',
  'finance_minister':    'finance_role',
  'defense_minister':    'defense_role',
  'defence_minister':    'defense_role',
  'foreign_minister':    'foreign_affairs_role',
  'trade_minister':      'commerce_role',
  'trade_role':          'commerce_role',
  'industry_role':       'commerce_role',
  'national_bank':       'central_bank',
  'federal_reserve':     'central_bank',
  'state_bank':          'central_bank',
  'reserve_bank':        'central_bank',
  'president':           'leader_title',
  'prime_minister':      'leader_title',
  'chancellor':          'leader_title',
  'head_of_state':       'leader_title',
  'supreme_leader':      'leader_title',
  'monarch':             'leader_title',
  'vice_president':      'vice_leader',
  'deputy_leader':       'vice_leader',
  'military':            'armed_forces_name',
  'armed_forces':        'armed_forces_name',
  'supreme_court':       'judicial_role',
  'high_court':          'judicial_role',
  'constitutional_court':'judicial_role',
  'attorney_general':    'prosecutor_role',
  'chief_prosecutor':    'prosecutor_role',
  'national_police':     'police_force',
  'secret_service':      'intelligence_agency',
  'treasury':            'finance_role',
  'culture_ministry':    'interior_role',
  'ministry_of_interior':'interior_role',
  'opposition':          'opposition_party',
  'the_player_country':  'player_country',
  'the_opposition_party':'opposition_party',
  'the_legislature':     'legislature',
  'lawmakers':           'legislature',
  'transport_minister':  'transport_role',
  'education_secretary': 'education_role',
  'judiciary':           'judicial_role',
  'judiciary_body':      'judicial_role',
  'police':              'police_force',
  'security_forces':     'police_force',
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
  'role_intelligence':         'role_interior',
  'role_intelligence_agency':  'role_interior',
  'role_spy':                  'role_interior',
  'role_cyber':                'role_defense',
  'role_budget':               'role_economy',
  'role_housing':              'role_labor',
  'role_immigration':          'role_interior',
  'role_military':             'role_defense',
  'role_foreign_relations':    'role_diplomacy',
  'role_public_order':         'role_interior',
  'role_approval':             'role_executive',
  'role_press':                'role_executive',
  'role_communications':       'role_executive',
  'role_media':                'role_executive',
  'role_propaganda':           'role_executive',
  'role_agriculture':          'role_commerce',
  'role_trade':                'role_commerce',
  'role_industry':             'role_commerce',
  'role_culture':              'role_education',
  'role_sports':               'role_education',
  'role_religion':             'role_interior',
  'role_justice_ministry':     'role_justice',
  'role_judiciary':            'role_justice',
  'role_attorney_general':     'role_justice',
  'role_legislature':          'role_executive',
  'role_parliament':           'role_executive',
  'role_senate':               'role_executive',
  'role_congress':             'role_executive',
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
  { concept: 'president / prime minister / chancellor / head of state', token: '{leader_title}' },
  { concept: 'vice president / deputy prime minister', token: '{vice_leader}' },
  { concept: 'finance minister / treasury secretary', token: '{finance_role}' },
  { concept: 'defence minister / secretary of defense', token: '{defense_role}' },
  { concept: 'interior minister / home secretary', token: '{interior_role}' },
  { concept: 'foreign minister / secretary of state', token: '{foreign_affairs_role}' },
  { concept: 'attorney general / minister of justice', token: '{justice_role}' },
  { concept: 'supreme court / constitutional court', token: '{judicial_role}' },
  { concept: 'central bank / federal reserve', token: '{central_bank}' },
  { concept: 'national currency', token: '{currency}' },
  { concept: 'armed forces / military', token: '{armed_forces_name}' },
  { concept: 'intelligence agency', token: '{intelligence_agency}' },
];

// ---------------------------------------------------------------------------
// 8. isValidToken
// ---------------------------------------------------------------------------

export function isValidToken(token: string): boolean {
  return ALL_TOKENS.includes(token.toLowerCase());
}

export function isDeprecatedToken(token: string): boolean {
  return DEPRECATED_TOKEN_SET.has(token.toLowerCase());
}

// ---------------------------------------------------------------------------
// 9. normalizeTokenAliases — Apply TOKEN_ALIAS_MAP substitutions to text
//    Also resolves deprecated tokens to plain language.
// ---------------------------------------------------------------------------

export function normalizeTokenAliases(text: string): string {
  let result = text;

  for (const { token, replacement } of DEPRECATED_TOKENS) {
    result = result.replace(new RegExp(`\\{the_${token}\\}`, 'gi'), replacement.startsWith('the ') ? replacement : `the ${replacement}`);
    result = result.replace(new RegExp(`\\{${token}\\}`, 'gi'), replacement);
  }

        result = result.replace(/\{the_legislature_speaker\}/gi, 'the speaker of the {legislature}');
        result = result.replace(/\{legislature_speaker\}/gi, 'speaker of the {legislature}');
        result = result.replace(/\{the_opposition_party\}/gi, '{opposition_party}');
        result = result.replace(/\{the_legislature\}/gi, '{legislature}');
  result = result.replace(/\{the_approval\}/gi, 'public approval');
  result = result.replace(/\{approval\}/gi, 'public approval');
  result = result.replace(/\{the_economy\}/gi, 'the economy');
  result = result.replace(/\{economy\}/gi, 'economy');

  for (const [bad, good] of Object.entries(TOKEN_ALIAS_MAP)) {
    result = result.replace(new RegExp(`\\{the_${bad}\\}`, 'gi'), `{the_${good}}`);
    result = result.replace(new RegExp(`\\{${bad}\\}`, 'gi'), `{${good}}`);
  }

  result = result.replace(/\{(?:the_)?metric_([a-z_]+)\}/gi, (_match, metricName: string) => {
    return metricName.toLowerCase().replace(/_/g, ' ');
  });

  const validTokenSet = new Set(ALL_TOKENS.map(t => t.toLowerCase()));

  // Preserve "the {token}" as-is — article forms are eliminated, LLM writes natural language.

  result = result.replace(/\{(the_)?([a-z_]+)\}/gi, (match, thePrefix: string | undefined, tokenName: string) => {
    const bare = tokenName.toLowerCase();
        const full = thePrefix ? `the_${bare}` : bare;
        if ((bare === 'opposition_party' || bare === 'legislature') && thePrefix) return `{${bare}}`;
        if (validTokenSet.has(full) || validTokenSet.has(bare)) return match;
        if (TOKEN_ALIAS_MAP[bare]) return thePrefix ? `{the_${TOKEN_ALIAS_MAP[bare]}}` : `{${TOKEN_ALIAS_MAP[bare]}}`;
        return match;
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

  const categoryNames = Object.keys(cats).filter(k => k !== 'article_forms' && k !== 'media');

  const categorizedList = categoryNames.map(cat => {
    const tokens = cats[cat] ?? [];
    if (tokens.length === 0) return null;
    const label = cat.charAt(0).toUpperCase() + cat.slice(1).replace(/_/g, ' ');
    return `- **${label}**: ${Array.from(tokens).map(t => `{${t}}`).join(', ')}`;
  }).filter(Boolean).join('\n');


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

  return `## Token System

Use \`{token}\` placeholders for country-specific institutional facts. NEVER hardcode country names, currencies, or institution names.
If a government role or institution is not in this list, reframe around cabinet officials or agencies without naming the office.

### Approved Tokens

${categorizedList}

> **RULE**: Write "the {finance_role}" or "your {defense_role}" naturally — NO \`{the_*}\` prefix tokens. Never use \`{the_player_country}\`, \`{the_finance_role}\`, \`{the_central_bank}\` etc. — these do not exist in the token system. Foreign actors and relationship references → plain English only (never tokens).

### Canonical Advisor Roles

Valid for \`advisorFeedback.roleId\` (include 5–9 per option, always include role_executive):
${canonicalRolesList}

${roleDefList}`;
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

Use \`{token}\` placeholders for country-specific institutional facts. NEVER hardcode country names, currencies, or institution names.
If a government role or institution is not listed below, reframe around cabinet officials or agencies without naming the office.

### Approved Tokens
- \`{player_country}\` — the player's country; write "the {player_country}" or "{player_country}'s" naturally
- \`{leader_title}\` — president / PM / chancellor
- \`{finance_role}\`, \`{defense_role}\`, \`{interior_role}\`, \`{foreign_affairs_role}\`, \`{justice_role}\`, \`{health_role}\`, \`{education_role}\`, \`{commerce_role}\`, \`{labor_role}\`, \`{energy_role}\`, \`{environment_role}\`, \`{transport_role}\`, \`{press_role}\` — government roles
- \`{currency}\`, \`{central_bank}\`, \`{armed_forces_name}\`, \`{capital_city}\` — economic/military facts

### Rules
- Write "the {finance_role}" or "your {defense_role}" naturally — NO \`{the_*}\` prefix tokens
- NEVER use \`{the_player_country}\`, \`{the_finance_role}\`, \`{the_central_bank}\` etc. — these do not exist
- Foreign actors, international bodies, relationship references → plain English (never tokens)

### Valid Advisor Roles (5–9 per option, always include role_executive)
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

  const nonArticleTokens = bundleTokens.filter(t => !t.startsWith('the_') && !DEPRECATED_TOKEN_SET.has(t));
  const tokenList = nonArticleTokens.map(t => `\`{${t}}\``).join(', ');

  return `## Token System (MANDATORY)

Use \`{token}\` placeholders for country-specific institutional facts. NEVER hardcode country names, currencies, or institution names.
If a government role or institution is not listed below, reframe around cabinet officials or agencies without naming the office.

### Available Tokens${!isFullSet ? ` (${bundle} bundle)` : ''}
${tokenList}

Article forms: use \`{the_token}\` at sentence start only when the token naturally takes a definite article; otherwise keep the bare token or rewrite the sentence to start with a narrative word.

### Valid Advisor Roles (5–9 per option, always include role_executive)
${canonicalRolesList}

### Key Concept → Token Mappings
${conceptTable}`;
}

export function buildMinimalTokenPromptSection(): string {
  const canonicalRolesList = Array.from(CANONICAL_ROLE_IDS).map(r => `\`${r}\``).join(', ');
  const coreList = MINIMAL_CORE_TOKENS.map(t => `\`{${t}}\``).join(', ');
  const roleList = MINIMAL_ROLE_TOKENS.map(t => `\`{${t}}\``).join(', ');
  const instList = MINIMAL_INSTITUTIONAL_TOKENS.map(t => `\`{${t}}\``).join(', ');
  const polList = MINIMAL_POLITICAL_TOKENS.map(t => `\`{${t}}\``).join(', ');

  // Build the gated-token prerequisites table from the registry so the LLM
  // knows exactly which requires flag each conditional token commits to.
  const gatedTokensByFlag = new Map<string, string[]>();
  for (const { token, requiresFlag } of CONDITION_GATED_TOKENS) {
    const list = gatedTokensByFlag.get(requiresFlag) ?? [];
    list.push(`\`{${token}}\``);
    gatedTokensByFlag.set(requiresFlag, list);
  }
  const gatedTable = Array.from(gatedTokensByFlag.entries())
    .map(([flag, tokens]) => {
      const def = REQUIRES_FLAG_REGISTRY[flag as keyof typeof REQUIRES_FLAG_REGISTRY];
      return `- ${tokens.join(', ')} → ONLY if \`requires.${flag}: true\` (${def?.label ?? flag})`;
    })
    .join('\n');

  return `## Token System

Use \`{token}\` placeholders for ALL country-specific government roles and institutions. Tokens resolve to country-correct vocabulary at render time — a token like \`{finance_role}\` becomes "Secretary of the Treasury" for the US, "Chancellor of the Exchequer" for the UK, "Minister of Finance" elsewhere. Using hardcoded names breaks this and will fail audit.

### Available Tokens
- **Core**: ${coreList}
- **Government roles** (MANDATORY — never write these as plain text): ${roleList}
- **Institutions** (MANDATORY — never write these as plain text): ${instList}
- **Political/conditional**: ${polList}

### Conditional Tokens — requires flag prerequisite
Using any of these tokens COMMITS the scenario to the matching \`metadata.requires\` flag. Set the flag or do not use the token.
${gatedTable}

### Rules
- Write \`the {finance_role}\` or \`your {defense_role}\` naturally — NO special \`{the_*}\` prefix tokens
- NEVER invent tokens not listed above
- Foreign actors and international bodies → plain English (never tokens)
- If a role or institution is not in this list, rephrase to avoid naming it — NEVER write a hardcoded institution name

### BANNED plain-text government vocabulary (use the token equivalent instead)
Ministry of Finance · Finance Ministry · Treasury Department · Department of the Treasury → \`{finance_role}\`
Finance Minister · Treasury Secretary · Chancellor of the Exchequer → \`{finance_role}\`
Ministry of Defense · Defense Ministry · Department of Defense → \`{defense_role}\`
Defense Minister · Defence Minister → \`{defense_role}\`
Trade Ministry · Commerce Ministry · Ministry of Commerce → \`{commerce_role}\`
Trade Minister · Commerce Minister → \`{commerce_role}\`
Health Ministry · Ministry of Health → \`{health_role}\`
Health Minister → \`{health_role}\`
Ministry of Foreign Affairs · Foreign Ministry · State Department · Department of State → \`{foreign_affairs_role}\`
Foreign Minister · Secretary of State → \`{foreign_affairs_role}\`
Interior Ministry · Ministry of Interior → \`{interior_role}\`
Interior Minister · Home Secretary → \`{interior_role}\`
Justice Ministry · Ministry of Justice → \`{justice_role}\`
Justice Minister · Attorney General → \`{justice_role}\`
Education Ministry · Ministry of Education → \`{education_role}\`
Education Minister · Culture Minister · Culture Ministry · Ministry of Culture → \`{education_role}\`
Parliament · Congress · National Assembly · Bundestag · Diet → \`{legislature}\`
Federal Reserve · Central Bank · Reserve Bank → \`{central_bank}\`
Supreme Court · High Court · Constitutional Court → \`{judicial_role}\`
National Guard · Armed Forces · Military · Army → \`{armed_forces_name}\`

### Valid Advisor Roles (5–9 per option, always include role_executive)
${canonicalRolesList}`;
}

export function buildExclusivePromptSection(countryProfile: Record<string, any>): string {
  const canonicalRolesList = Array.from(CANONICAL_ROLE_IDS).map(r => `\`${r}\``).join(', ');
  const name = countryProfile.name ?? countryProfile.id ?? 'the target country';
  const tokens = countryProfile.tokens as Record<string, string> | undefined;

  const profileLines: string[] = [`Country: ${name}`];
  if (tokens) {
    if (tokens['leader_title']) profileLines.push(`Head of State title: ${tokens['leader_title']}`);
    if (tokens['currency']) profileLines.push(`Currency: ${tokens['currency']}`);
    if (tokens['central_bank']) profileLines.push(`Central Bank: ${tokens['central_bank']}`);
    if (tokens['armed_forces_name']) profileLines.push(`Armed Forces: ${tokens['armed_forces_name']}`);
    if (tokens['capital_city']) profileLines.push(`Capital: ${tokens['capital_city']}`);
    if (tokens['legislature']) profileLines.push(`Legislature: ${tokens['legislature']}`);
    if (tokens['governing_party']) profileLines.push(`Governing Party: ${tokens['governing_party']}`);
    if (tokens['opposition_party']) profileLines.push(`Opposition Party: ${tokens['opposition_party']}`);
    const roleTokens = MINIMAL_ROLE_TOKENS.filter(t => tokens[t]);
    if (roleTokens.length > 0) {
      profileLines.push(`Government roles:`);
      roleTokens.forEach(t => profileLines.push(`  ${t.replace(/_/g, ' ')}: ${tokens[t]}`));
    }
  }
  if (countryProfile.geopolitical) {
    const geo = countryProfile.geopolitical;
    if (geo.governmentCategory) profileLines.push(`Government type: ${geo.governmentCategory}`);
    if (geo.tags?.length) profileLines.push(`Geopolitical tags: ${geo.tags.join(', ')}`);
  }

  return `## Country Profile — Write for this country directly

${profileLines.join('\n')}

### Rules
- Use real institution names, real titles, real currency — NO \`{token}\` placeholders
- Write as if the player IS the leader of ${name}
- Use the exact vocabulary of this country's government — never substitute a generic equivalent (e.g. "Secretary of the Treasury" not "Finance Minister" for the US; "Congress" not "Parliament" for the US)
- All advisor feedback should reference real institutions where appropriate

### Valid Advisor Roles (5–9 per option, always include role_executive)
${canonicalRolesList}`;
}

// ---------------------------------------------------------------------------
// 10b. Contextual token prompt builders
// ---------------------------------------------------------------------------

const CONTEXTUAL_PRIORITY_TOKENS = [
  'leader_title', 'vice_leader',
  'finance_role', 'defense_role', 'interior_role', 'foreign_affairs_role', 'justice_role',
  'health_role', 'education_role', 'commerce_role', 'labor_role', 'energy_role',
  'environment_role', 'transport_role',
  'currency', 'central_bank', 'armed_forces_name', 'capital_city',
];

export interface ContextualTokenPromptOptions {
  countryData?: Record<string, any>;
  bundle?: string;
  scopeTier: string;
  isReference?: boolean;
  registry?: CompiledTokenRegistry;
  allCountries?: Record<string, any>;
}

export function buildContextualTokenPrompt(options: ContextualTokenPromptOptions): string {
  const { countryData, scopeTier, isReference } = options;

  if (countryData?.tokens) {
    return buildCheatSheet(countryData, scopeTier, isReference);
  }

  if (scopeTier === 'universal') {
    return buildEssentialTokenList();
  }

  return buildEssentialTokenList();
}

function buildCheatSheet(
  countryData: Record<string, any>,
  scopeTier: string,
  isReference?: boolean,
): string {
  const tokens = countryData.tokens as Record<string, string>;

  const cheatSheet = CONTEXTUAL_PRIORITY_TOKENS
    .filter(t => tokens[t])
    .map(t => `  {${t}} = "${tokens[t]}"`)
    .join('\n');

  const preamble = isReference
    ? 'Reference resolution (your output MUST use {token} placeholders, not these literal values):'
    : 'Token Cheat Sheet (your output uses {token} placeholders — these show what they resolve to):';

  const parts: string[] = [
    `### ${preamble}`,
    cheatSheet,
  ];

  parts.push('', '### Rules');
  parts.push('- Use only tokens from the cheat sheet above. If unsure a token exists, rewrite without it.');
  parts.push('- Use only bare tokens like {legislature} and {opposition_party}; write articles in natural language.');
  parts.push('- Never use {the_legislature}, {the_opposition_party}, or any other {the_*} prefix token.');
  parts.push('- Write relationship actors and international bodies as natural language, never tokens.');
  parts.push('- Never hardcode country names, capitals, or institution names.');
  parts.push('- {legislature}, {upper_house}, {lower_house} require requires.democratic_regime: true.');
  if (scopeTier === 'universal') {
    parts.push('- UNIVERSAL SCOPE: keep entirely domestic. Do not reference foreign relationships.');
    parts.push('- UNIVERSAL SCOPE: avoid unstable regime-specific tokens such as {legislature}, {upper_house}, {lower_house}, {governing_party}, {opposition_party}, and {state_media}. If a sentence needs them, rewrite in plain English (for example: lawmakers, the governing coalition, the opposition, state broadcasters).');
  }

  return parts.join('\n');
}

function buildEssentialTokenList(): string {
  return `### Essential Tokens
  {player_country} — player's country; use "the {player_country}" for subject, "{player_country}'s" for possessive
  {leader_title} — head of state
  {finance_role}, {defense_role}, {interior_role}, {foreign_affairs_role}, {justice_role} — cabinet roles
  {health_role}, {education_role}, {commerce_role}, {labor_role}, {energy_role}, {environment_role}, {transport_role}
  {currency}, {central_bank}, {armed_forces_name}, {capital_city}

### Rules
- Write "the {finance_role}" or "your {defense_role}" naturally — NO {the_*} prefix tokens
- Never write bare tokens at sentence start without a natural article (e.g. write "the {legislature}" not just "{legislature}" at start)
- Never hardcode country names, capitals, or institution names.
- UNIVERSAL SCOPE: do not use legislature/party/media tokens ({legislature}, {governing_party}, {opposition_party}, {state_media}) unless the scenario requires them structurally.`;
}

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
    'leader_title', 'vice_leader',
    'finance_role', 'defense_role', 'interior_role', 'foreign_affairs_role', 'justice_role',
    'health_role', 'education_role', 'commerce_role', 'labor_role', 'energy_role',
    'currency', 'central_bank', 'armed_forces_name', 'capital_city',
  ];

  const cheatSheet = PRIORITY_TOKENS
    .filter(t => tokens[t])
    .map(t => `  {${t}} = "${tokens[t]}"`)
    .join('\n');

  return `## Token System (MANDATORY)

Use {token} placeholders for institutional facts. NEVER hardcode names.
If a government role or institution is not listed below, reframe around cabinet officials or agencies without naming the office.

### Token Cheat Sheet
${cheatSheet}

### Rules
- Write "the {finance_role}" or "your {defense_role}" naturally — NO {the_*} prefix tokens
- Use "{player_country}'s" for possessives
- NEVER use {the_player_country}, {the_finance_role}, {the_central_bank} etc. — these do not exist
- NEVER hardcode country names, capitals, or institution names.
- If unsure a government role token exists, reframe around cabinet officials or agencies without naming the office.
${scopeTier === 'universal' ? '- UNIVERSAL SCOPE: keep entirely domestic. Do not reference foreign relationships.' : ''}
${scopeTier === 'universal' ? '- UNIVERSAL SCOPE: avoid regime-specific tokens like {legislature}, {upper_house}, {lower_house}, {governing_party}, {opposition_party}, and {state_media}. Rewrite them in plain English unless the scenario is explicitly country-targeted.' : ''}

### Valid Advisor Roles (5–9 per option, always include role_executive)
role_executive, role_diplomacy, role_defense, role_economy, role_justice, role_health, role_commerce, role_labor, role_interior, role_energy, role_environment, role_transport, role_education`;
}

// ---------------------------------------------------------------------------
// 11. retokenizeText — Reverse token resolution safety net
// ---------------------------------------------------------------------------

const MIN_RETOKENIZE_LENGTH = 4;

const RETOKENIZE_SKIP_VALUES = new Set([
  'the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'for', 'by', 'and', 'or',
  'is', 'are', 'was', 'were', 'has', 'have', 'had', 'be', 'been', 'being',
  'yes', 'no', 'not', 'but', 'from', 'with', 'that', 'this', 'will', 'can',
  'may', 'do', 'did', 'does', 'it', 'its', 'if', 'so', 'as', 'up', 'out',
]);

const RETOKENIZE_PRIORITY_TOKENS = [
  'leader_title', 'vice_leader',
  'finance_role', 'defense_role', 'interior_role', 'foreign_affairs_role', 'justice_role',
  'health_role', 'education_role', 'commerce_role', 'labor_role', 'energy_role',
  'environment_role', 'transport_role', 'agriculture_role', 'press_role',
  'central_bank', 'currency', 'stock_exchange',
  'armed_forces_name', 'military_chief_title', 'intelligence_agency',
  'police_force', 'capital_city',
  'judicial_role', 'chief_justice_role', 'prosecutor_role',
  'player_country',
] as const;

export function retokenizeText(
  text: string,
  sampleCountryTokenMaps: ReadonlyArray<Readonly<Record<string, string>>>,
): string {
  if (!text || sampleCountryTokenMaps.length === 0) return text;

  let result = text;

  for (const tokenMap of sampleCountryTokenMaps) {
    const replacements: Array<{ resolved: string; token: string; articleForm: boolean }> = [];

    for (const bareToken of RETOKENIZE_PRIORITY_TOKENS) {
      const resolvedBare = tokenMap[bareToken];
      if (!resolvedBare || resolvedBare.length < MIN_RETOKENIZE_LENGTH) continue;
      if (RETOKENIZE_SKIP_VALUES.has(resolvedBare.toLowerCase())) continue;

      replacements.push({ resolved: resolvedBare, token: `{${bareToken}}`, articleForm: false });

      const articleKey = `the_${bareToken}`;
      const resolvedArticle = tokenMap[articleKey];
      if (resolvedArticle && resolvedArticle.length >= MIN_RETOKENIZE_LENGTH) {
        replacements.push({ resolved: resolvedArticle, token: `{${articleKey}}`, articleForm: true });
      }
    }

    const countryName = tokenMap['player_country'];
    if (countryName && countryName.length >= MIN_RETOKENIZE_LENGTH) {
      replacements.push({ resolved: countryName, token: '{player_country}', articleForm: false });
    }

    replacements.sort((a, b) => b.resolved.length - a.resolved.length);

    for (const { resolved, token } of replacements) {
      const escapedValue = resolved.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`(?<!\\{[a-z_]*)\\b${escapedValue}\\b(?![a-z_]*\\})`, 'gi');
      result = result.replace(pattern, token);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// 12. Registry Loader — Firestore-backed with TTL cache + hardcoded fallback
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
    sentenceStartArticleFormTokenNames: new Set(SENTENCE_START_ARTICLE_FORM_TOKEN_NAMES),
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
