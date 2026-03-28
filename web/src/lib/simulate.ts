import type {
  AdvisorFeedback,
  Option,
  OptionEffect,
  RelationshipCondition,
  ScenarioCondition,
  ScenarioMetadata,
  SimulationConditionCheck,
  SimulationDiagnostics,
  SimulationFilteredScenario,
  SimulationRelationshipConditionCheck,
  SimulationScenario,
  SimulationTokenUsage,
  SimulationValidationCheck,
} from '@/lib/types';

export interface CountryRelationship {
  countryId: string;
  type: string;
  strength: number;
  sharedBorder: boolean;
  treaty?: string;
}

export interface GeopoliticalProfile {
  neighbors: CountryRelationship[];
  allies: CountryRelationship[];
  adversaries: CountryRelationship[];
  tags: string[];
  governmentCategory: string;
  regimeStability: number;
}

export interface CountryDoc {
  id: string;
  name: string;
  region: string;
  definiteArticle?: string;
  leader?: string;
  leaderTitle?: string;
  tokens?: Record<string, string>;
  geopoliticalProfile?: GeopoliticalProfile;
  gameplayProfile?: {
    startingMetrics?: Record<string, number>;
    neighborEventChance?: number;
  };
  geopolitical?: GeopoliticalProfile;
  gameplay?: {
    starting_metrics?: Record<string, number>;
    neighbor_event_chance?: number;
  };
}

export interface SimScenarioDoc {
  id: string;
  title: string;
  description: string;
  options: Option[];
  conditions?: ScenarioCondition[];
  relationship_conditions?: RelationshipCondition[];
  metadata?: ScenarioMetadata;
  dynamic_profile?: { actorPattern?: string };
  phase?: string;
  actIndex?: number;
}

interface ResolveTextResult {
  text: string;
  tokenUsages: SimulationTokenUsage[];
  fallbackTokens: string[];
  unresolvedTokens: string[];
}

export function normalizeCountryDoc(country: CountryDoc): CountryDoc {
  return {
    ...country,
    leaderTitle: country.leaderTitle ?? country.tokens?.leader_title,
    geopoliticalProfile: country.geopoliticalProfile ?? country.geopolitical,
    gameplayProfile: country.gameplayProfile ?? (country.gameplay
      ? {
          startingMetrics: country.gameplay.starting_metrics,
          neighborEventChance: country.gameplay.neighbor_event_chance,
        }
      : undefined),
  };
}

const PLACEHOLDER_PATTERN = /\{\{?([a-zA-Z_]+)\}?\}/g;
const OPTIONAL_BRANCH_TOKENS = new Set([
  'marine_branch',
  'space_branch',
  'paramilitary_branch',
  'coast_guard_branch',
  'intel_branch',
  'cyber_branch',
  'sovereign_fund',
  'special_forces',
  'strategic_nuclear_branch',
]);

const FALLBACK_TOKEN_VALUES: Record<string, string> = {
  the_player_country: 'the country',
  player_country: 'the country',
  country: 'the country',
  the_adversary: 'the opposing state',
  adversary: 'an opposing state',
  the_ally: 'the allied state',
  ally: 'an allied state',
  the_neighbor: 'the neighboring state',
  neighbor: 'a neighboring state',
  the_border_rival: 'the border rival',
  border_rival: 'a border rival',
  the_regional_rival: 'the regional rival',
  regional_rival: 'a regional rival',
  the_rival: 'the rival state',
  rival: 'a rival state',
  the_trade_partner: 'the trade partner',
  trade_partner: 'a trade partner',
  the_partner: 'the partner state',
  partner: 'a partner state',
  the_nation: 'the nation',
  nation: 'a nation',
  leader_title: 'national leader',
  the_leader_title: 'the national leader',
  legislature: 'legislature',
  the_legislature: 'the legislature',
  ruling_party: 'ruling party',
  the_ruling_party: 'the ruling party',
};

function titleCaseToken(token: string): string {
  return token
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function getCountryNameWithDefiniteArticle(country: CountryDoc): string {
  const name = country.name.trim();
  if (name.toLowerCase().startsWith('the ')) return name;

  const article = country.definiteArticle?.trim();
  if (article) {
    if (name.toLowerCase().startsWith(`${article.toLowerCase()} `)) return name;
    return `${article} ${name}`;
  }

  const defaultArticleCountries = new Set([
    'united states',
    'united kingdom',
    'netherlands',
    'philippines',
    'czech republic',
    'united arab emirates',
    'dominican republic',
    'central african republic',
    'ivory coast',
    'bahamas',
    'gambia',
    'sudan',
    'democratic republic of the congo',
    'republic of the congo',
  ]);

  return defaultArticleCountries.has(name.toLowerCase()) ? `the ${name}` : name;
}

function buildArticleForm(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return trimmed.toLowerCase().startsWith('the ') ? trimmed : `the ${trimmed}`;
}

function resolveRelationshipNames(
  relationship: CountryRelationship | undefined,
  countriesById: Record<string, CountryDoc>
): { bare: string; definite: string } | null {
  if (!relationship) return null;
  const country = countriesById[relationship.countryId];
  if (!country) return null;
  return {
    bare: country.name,
    definite: getCountryNameWithDefiniteArticle(country),
  };
}

function setIfMissing(context: Record<string, string>, key: string, value: string | undefined): void {
  if (!value) return;
  const currentValue = context[key]?.trim();
  if (!currentValue) context[key] = value;
}

function fallbackValueForToken(tokenLower: string, context: Record<string, string>): string {
  const exact = FALLBACK_TOKEN_VALUES[tokenLower];
  if (exact) return exact;

  if (tokenLower.startsWith('the_')) {
    const bare = tokenLower.slice(4);
    const fromContext = context[bare]?.trim();
    if (fromContext) return buildArticleForm(fromContext);
    const exactBare = FALLBACK_TOKEN_VALUES[bare];
    if (exactBare) return exactBare.startsWith('the ') ? exactBare : `the ${exactBare}`;
    if (bare.endsWith('_role')) {
      return `the ${titleCaseToken(bare.replace(/_role$/, '')).toLowerCase()} minister`;
    }
    return `the ${titleCaseToken(bare).toLowerCase()}`;
  }

  if (tokenLower.endsWith('_role')) {
    return `${titleCaseToken(tokenLower.replace(/_role$/, ''))} Minister`;
  }

  return titleCaseToken(tokenLower).toLowerCase();
}

function collapseWhitespaceAndPunctuation(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\. \./g, '.')
    .replace(/(?<!\.)\.{2}(?!\.)/g, '.')
    .replace(/, ,/g, ',')
    .replace(/\s+([.!?,;:])/g, '$1')
    .trim();
}

function collapseAdjacentRepeatedWords(text: string): string {
  return text.replace(/\b(\w+)\s+\1\b/gi, '$1');
}

function collapseRepeatedSentences(text: string): string {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const deduped: string[] = [];
  for (const sentence of sentences) {
    if (deduped[deduped.length - 1]?.toLowerCase() === sentence.toLowerCase()) continue;
    deduped.push(sentence);
  }
  return deduped.join(' ');
}

function capitalizeFirstNarrativeLetter(text: string): string {
  let inToken = false;
  let prevType: 'boundary' | 'other' = 'boundary';

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '{') {
      inToken = true;
      continue;
    }
    if (character === '}') {
      inToken = false;
      prevType = 'boundary';
      continue;
    }
    if (inToken) continue;
    if (/\s/.test(character)) {
      prevType = 'boundary';
      continue;
    }
    if (/[A-Za-z]/.test(character)) {
      if (prevType === 'boundary' && /[a-z]/.test(character)) {
        return `${text.slice(0, index)}${character.toUpperCase()}${text.slice(index + 1)}`;
      }
      return text;
    }
    prevType = 'other';
  }

  return text;
}

function capitalizeSentenceBoundaries(text: string): string {
  const chars = text.split('');
  let inToken = false;
  let capitalizeNextNarrativeLetter = false;
  let tokenClosedWhilePending = false;

  for (let index = 0; index < chars.length; index += 1) {
    const character = chars[index];

    if (character === '{') {
      inToken = true;
      continue;
    }
    if (character === '}') {
      inToken = false;
      if (capitalizeNextNarrativeLetter) tokenClosedWhilePending = true;
      continue;
    }
    if (inToken) continue;

    if (capitalizeNextNarrativeLetter) {
      if (/[A-Za-z]/.test(character)) {
        if (/[a-z]/.test(character)) chars[index] = character.toUpperCase();
        capitalizeNextNarrativeLetter = false;
        tokenClosedWhilePending = false;
        continue;
      }
      if (/\s|["(\[]/.test(character)) continue;
      if (tokenClosedWhilePending && character === "'") {
        capitalizeNextNarrativeLetter = false;
        tokenClosedWhilePending = false;
        continue;
      }
      if (/[)}\]”]/.test(character)) continue;
      capitalizeNextNarrativeLetter = false;
      tokenClosedWhilePending = false;
    }

    if (/[.!?]/.test(character)) {
      capitalizeNextNarrativeLetter = true;
      tokenClosedWhilePending = false;
    }
  }

  return chars.join('');
}

function insertMissingDirectObject(text: string): string {
  return text
    .replace(/\bYou\s+direct\s+to\b/g, 'You direct your cabinet to')
    .replace(/\byou\s+direct\s+to\b/g, 'you direct your cabinet to')
    .replace(/\bYou\s+directed\s+to\b/g, 'You directed your cabinet to')
    .replace(/\byou\s+directed\s+to\b/g, 'you directed your cabinet to');
}

function normalizePresentationText(text: string): string {
  let result = text;
  result = collapseWhitespaceAndPunctuation(result);
  result = collapseAdjacentRepeatedWords(result);
  result = collapseRepeatedSentences(result);
  result = collapseWhitespaceAndPunctuation(result);
  result = capitalizeFirstNarrativeLetter(result);
  result = capitalizeSentenceBoundaries(result);
  result = insertMissingDirectObject(result);
  return result;
}

export function buildSimulationTokenContext(
  country: CountryDoc,
  countriesById: Record<string, CountryDoc>
): Record<string, string> {
  const context: Record<string, string> = { ...(country.tokens ?? {}) };
  const geopoliticalProfile = country.geopoliticalProfile;

  context.country = country.name;
  context.player_country = country.name;
  context.the_player_country = getCountryNameWithDefiniteArticle(country);
  if (country.leader) context.leader = country.leader;
  if (country.leaderTitle) {
    context.leader_title = country.leaderTitle;
    setIfMissing(context, 'the_leader_title', buildArticleForm(country.leaderTitle));
  }

  if (geopoliticalProfile) {
    const topAdversary = [...(geopoliticalProfile.adversaries ?? [])].sort((left, right) => right.strength - left.strength)[0];
    const topFormalAlly = [...(geopoliticalProfile.allies ?? [])]
      .filter((relationship) => relationship.type === 'formal_ally')
      .sort((left, right) => right.strength - left.strength)[0];
    const topStrategicPartner = [...(geopoliticalProfile.allies ?? [])]
      .filter((relationship) => relationship.type === 'strategic_partner')
      .sort((left, right) => right.strength - left.strength)[0];
    const rivalFromAdversaries = [...(geopoliticalProfile.adversaries ?? [])]
      .filter((relationship) => relationship.type === 'rival')
      .sort((left, right) => right.strength - left.strength)[0];
    const rivalFromNeighbors = [...(geopoliticalProfile.neighbors ?? [])]
      .filter((relationship) => relationship.type === 'rival')
      .sort((left, right) => right.strength - left.strength)[0];
    const neutralRelationship = [
      ...(geopoliticalProfile.allies ?? []).filter((relationship) => relationship.type === 'neutral'),
      ...(geopoliticalProfile.neighbors ?? []).filter((relationship) => relationship.type === 'neutral'),
    ].sort((left, right) => right.strength - left.strength)[0];
    const topNeighbor = [...(geopoliticalProfile.neighbors ?? [])]
      .sort((left, right) => right.strength - left.strength)[0];

    const adversaryNames = resolveRelationshipNames(topAdversary, countriesById);
    const allyNames = resolveRelationshipNames(topFormalAlly, countriesById);
    const partnerNames = resolveRelationshipNames(topStrategicPartner, countriesById);
    const rivalNames = resolveRelationshipNames(rivalFromAdversaries ?? rivalFromNeighbors, countriesById);
    const borderRivalNames = resolveRelationshipNames(rivalFromNeighbors, countriesById);
    const regionalRivalNames = resolveRelationshipNames(rivalFromAdversaries, countriesById);
    const neutralNames = resolveRelationshipNames(neutralRelationship, countriesById);
    const neighborNames = resolveRelationshipNames(topNeighbor, countriesById);

    setIfMissing(context, 'adversary', adversaryNames?.bare);
    setIfMissing(context, 'the_adversary', adversaryNames?.definite);
    setIfMissing(context, 'ally', allyNames?.bare);
    setIfMissing(context, 'the_ally', allyNames?.definite);
    setIfMissing(context, 'trade_partner', partnerNames?.bare);
    setIfMissing(context, 'the_trade_partner', partnerNames?.definite);
    setIfMissing(context, 'partner', partnerNames?.bare);
    setIfMissing(context, 'the_partner', partnerNames?.definite);
    setIfMissing(context, 'rival', rivalNames?.bare);
    setIfMissing(context, 'the_rival', rivalNames?.definite);
    setIfMissing(context, 'border_rival', borderRivalNames?.bare);
    setIfMissing(context, 'the_border_rival', borderRivalNames?.definite);
    setIfMissing(context, 'regional_rival', regionalRivalNames?.bare);
    setIfMissing(context, 'the_regional_rival', regionalRivalNames?.definite);
    setIfMissing(context, 'neutral', neutralNames?.bare);
    setIfMissing(context, 'the_neutral', neutralNames?.definite);
    setIfMissing(context, 'neighbor', neighborNames?.bare);
    setIfMissing(context, 'the_neighbor', neighborNames?.definite);
    setIfMissing(context, 'nation', neighborNames?.bare);
    setIfMissing(context, 'the_nation', neighborNames?.definite);
  }

  for (const [key, value] of Object.entries({ ...context })) {
    if (!value || key.startsWith('the_')) continue;
    setIfMissing(context, `the_${key}`, buildArticleForm(value));
  }

  return context;
}

export function resolveSimulationText(text: string, context: Record<string, string>): ResolveTextResult {
  const tokenUsages: SimulationTokenUsage[] = [];
  const fallbackTokens = new Set<string>();
  const unresolvedTokens = new Set<string>();

  const replaced = text.replace(PLACEHOLDER_PATTERN, (raw, tokenName: string) => {
    const tokenLower = tokenName.toLowerCase();
    const directValue = context[tokenName] ?? context[tokenLower];
    if (directValue != null) {
      tokenUsages.push({ token: tokenLower, raw, value: directValue, source: 'context' });
      return directValue;
    }

    if (OPTIONAL_BRANCH_TOKENS.has(tokenLower)) {
      tokenUsages.push({ token: tokenLower, raw, value: '', source: 'optional-empty' });
      fallbackTokens.add(tokenLower);
      return '';
    }

    const fallback = fallbackValueForToken(tokenLower, context);
    tokenUsages.push({ token: tokenLower, raw, value: fallback, source: 'fallback' });
    fallbackTokens.add(tokenLower);
    unresolvedTokens.add(tokenLower);
    return fallback;
  });

  return {
    text: normalizePresentationText(replaced),
    tokenUsages,
    fallbackTokens: [...fallbackTokens],
    unresolvedTokens: [...unresolvedTokens],
  };
}

function resolveRelationshipForRole(
  role: string,
  country: CountryDoc
): CountryRelationship | null {
  const geo = country.geopoliticalProfile;
  if (!geo) return null;
  switch (role) {
    case 'adversary':
      return [...(geo.adversaries ?? [])].sort((a, b) => b.strength - a.strength)[0] ?? null;
    case 'ally':
      return [...(geo.allies ?? [])].filter(r => r.type === 'formal_ally').sort((a, b) => b.strength - a.strength)[0] ?? null;
    case 'trade_partner':
    case 'partner':
      return [...(geo.allies ?? [])].filter(r => r.type === 'strategic_partner').sort((a, b) => b.strength - a.strength)[0] ?? null;
    case 'rival': {
      const fromAdversaries = [...(geo.adversaries ?? [])].filter(r => r.type === 'rival').sort((a, b) => b.strength - a.strength)[0];
      const fromNeighbors = [...(geo.neighbors ?? [])].filter(r => r.type === 'rival').sort((a, b) => b.strength - a.strength)[0];
      return fromAdversaries ?? fromNeighbors ?? null;
    }
    case 'border_rival':
      return [...(geo.neighbors ?? [])].filter(r => r.sharedBorder && ['rival', 'adversary', 'conflict'].includes(r.type)).sort((a, b) => b.strength - a.strength)[0] ?? null;
    case 'regional_rival':
      return [...(geo.adversaries ?? [])].filter(r => r.type === 'rival').sort((a, b) => b.strength - a.strength)[0] ?? null;
    case 'neutral':
      return [...(geo.allies ?? []), ...(geo.neighbors ?? [])].filter(r => r.type === 'neutral').sort((a, b) => b.strength - a.strength)[0] ?? null;
    case 'nation':
    case 'neighbor':
      return [...(geo.neighbors ?? [])].sort((a, b) => b.strength - a.strength)[0] ?? null;
    default:
      return null;
  }
}

function buildRelationshipConditionChecks(
  relationshipConditions: RelationshipCondition[] | undefined,
  country: CountryDoc
): SimulationRelationshipConditionCheck[] {
  return (relationshipConditions ?? []).map((cond) => {
    const relationship = resolveRelationshipForRole(cond.relationshipId, country);
    if (!relationship) {
      return {
        relationshipId: cond.relationshipId,
        resolvedCountryId: null,
        actual: null,
        min: cond.min,
        max: cond.max,
        passed: false,
        detail: `Cannot resolve "${cond.relationshipId}" relationship for this country — no matching partner found.`,
      };
    }
    const actual = relationship.strength;
    const minPass = cond.min == null || actual >= cond.min;
    const maxPass = cond.max == null || actual <= cond.max;
    const passed = minPass && maxPass;
    const bounds: string[] = [];
    if (cond.min != null) bounds.push(`>= ${cond.min}`);
    if (cond.max != null) bounds.push(`<= ${cond.max}`);
    return {
      relationshipId: cond.relationshipId,
      resolvedCountryId: relationship.countryId,
      actual,
      min: cond.min,
      max: cond.max,
      passed,
      detail: passed
        ? `${cond.relationshipId} (${relationship.countryId}) score = ${actual} passes ${bounds.join(' and ') || 'with no thresholds'}`
        : `${cond.relationshipId} (${relationship.countryId}) score = ${actual} fails ${bounds.join(' and ')}`,
    };
  });
}

function buildConditionChecks(
  conditions: ScenarioCondition[] | undefined,
  metrics: Record<string, number>
): SimulationConditionCheck[] {
  return (conditions ?? []).map((condition) => {
    const actual = metrics[condition.metricId] ?? 50;
    const minPass = condition.min == null || actual >= condition.min;
    const maxPass = condition.max == null || actual <= condition.max;
    const passed = minPass && maxPass;
    const bounds: string[] = [];
    if (condition.min != null) bounds.push(`>= ${condition.min}`);
    if (condition.max != null) bounds.push(`<= ${condition.max}`);

    return {
      metricId: condition.metricId,
      actual,
      min: condition.min,
      max: condition.max,
      passed,
      detail: passed
        ? `${condition.metricId} = ${actual} passes ${bounds.join(' and ') || 'with no thresholds'}`
        : `${condition.metricId} = ${actual} fails ${bounds.join(' and ')}`,
    };
  });
}

function pushCheck(checks: SimulationValidationCheck[], kind: string, passed: boolean, detail: string): void {
  checks.push({ kind, passed, detail });
}

function buildValidationChecks(
  scenario: SimScenarioDoc,
  country: CountryDoc,
  context: Record<string, string>
): SimulationValidationCheck[] {
  const checks: SimulationValidationCheck[] = [];
  const geopoliticalProfile = country.geopoliticalProfile;
  const applicableCountries = scenario.metadata?.applicable_countries;
  const applicableCountryList = applicableCountries == null
    ? []
    : Array.isArray(applicableCountries)
      ? applicableCountries
      : [applicableCountries];

  if (applicableCountryList.length === 0) {
    pushCheck(checks, 'applicable-countries', true, 'Scenario is not limited to a specific country list.');
  } else {
    const passed = applicableCountryList.some((id) => id.toLowerCase() === country.id.toLowerCase());
    pushCheck(
      checks,
      'applicable-countries',
      passed,
      passed
        ? `Country ${country.id} is explicitly allowed by applicable_countries.`
        : `Country ${country.id} is not present in applicable_countries: ${applicableCountryList.join(', ')}.`
    );
  }

  const countryTags = new Set(geopoliticalProfile?.tags ?? []);
  const requiredTags = scenario.metadata?.requiredGeopoliticalTags ?? [];
  const excludedTags = scenario.metadata?.excludedGeopoliticalTags ?? [];
  const requiredGovernmentCategories = scenario.metadata?.requiredGovernmentCategories ?? [];
  const excludedGovernmentCategories = scenario.metadata?.excludedGovernmentCategories ?? [];

  const missingTags = requiredTags.filter((tag: string) => !countryTags.has(tag));
  pushCheck(
    checks,
    'required-tags',
    missingTags.length === 0,
    missingTags.length === 0
      ? 'Country satisfies all required geopolitical tags.'
      : `Country is missing required geopolitical tags: ${missingTags.join(', ')}.`
  );

  const matchedExcludedTags = excludedTags.filter((tag: string) => countryTags.has(tag));
  pushCheck(
    checks,
    'excluded-tags',
    matchedExcludedTags.length === 0,
    matchedExcludedTags.length === 0
      ? 'Country does not match any excluded geopolitical tags.'
      : `Country matches excluded geopolitical tags: ${matchedExcludedTags.join(', ')}.`
  );

  const governmentCategory = geopoliticalProfile?.governmentCategory ?? '';
  const requiredGovernmentPass = requiredGovernmentCategories.length === 0 || requiredGovernmentCategories.includes(governmentCategory);
  pushCheck(
    checks,
    'required-government-category',
    requiredGovernmentPass,
    requiredGovernmentPass
      ? 'Country satisfies required government-category gates.'
      : `Government category ${governmentCategory || '(missing)'} is not in required categories: ${requiredGovernmentCategories.join(', ')}.`
  );

  const excludedGovernmentPass = !excludedGovernmentCategories.includes(governmentCategory);
  pushCheck(
    checks,
    'excluded-government-category',
    excludedGovernmentPass,
    excludedGovernmentPass
      ? 'Country does not match excluded government categories.'
      : `Government category ${governmentCategory || '(missing)'} is excluded.`
  );

  if (scenario.dynamic_profile?.actorPattern === 'border_rival') {
    const hasBorderRival = (geopoliticalProfile?.neighbors ?? []).some(
      (relationship) => relationship.sharedBorder && ['rival', 'adversary', 'conflict'].includes(relationship.type)
    );
    pushCheck(
      checks,
      'border-rival-actor-pattern',
      hasBorderRival,
      hasBorderRival
        ? 'Country has a land-adjacent adversarial or rival neighbor.'
        : 'Scenario requires a land-adjacent adversarial or rival neighbor, but the country has none.'
    );
  }

  const tokenCorpus = [
    scenario.title,
    scenario.description,
    ...scenario.options.flatMap((option) => [
      option.text,
      option.outcomeHeadline,
      option.outcomeSummary,
      option.outcomeContext,
      ...(option.advisorFeedback?.map((feedback) => feedback.feedback) ?? []),
    ]),
  ].filter((value): value is string => Boolean(value)).join(' ');
  const referencedRelationshipTokens = [
    'border_rival',
    'the_border_rival',
    'rival',
    'the_rival',
    'ally',
    'the_ally',
    'adversary',
    'the_adversary',
    'trade_partner',
    'the_trade_partner',
    'partner',
    'the_partner',
    'neighbor',
    'the_neighbor',
    'regional_rival',
    'the_regional_rival',
  ].filter((key) => new RegExp(`\\{${key}\\}`, 'i').test(tokenCorpus));
  const unresolvedTokenKeys = referencedRelationshipTokens.filter((key) => !context[key]?.trim());
  pushCheck(
    checks,
    'token-graph',
    unresolvedTokenKeys.length === 0,
    unresolvedTokenKeys.length === 0
      ? referencedRelationshipTokens.length === 0
        ? 'Scenario does not require country-specific geopolitical relationship tokens.'
        : 'Country resolves the geopolitical relationship tokens this scenario uses.'
      : `Country is missing relationship-token bindings for: ${unresolvedTokenKeys.join(', ')}.`
  );

  return checks;
}

function mergeDiagnostics(parts: ResolveTextResult[]): Pick<SimulationDiagnostics, 'tokenUsages' | 'fallbackTokens' | 'unresolvedTokens'> {
  const tokenUsages: SimulationTokenUsage[] = [];
  const fallbackTokens = new Set<string>();
  const unresolvedTokens = new Set<string>();

  for (const part of parts) {
    tokenUsages.push(...part.tokenUsages);
    for (const token of part.fallbackTokens) fallbackTokens.add(token);
    for (const token of part.unresolvedTokens) unresolvedTokens.add(token);
  }

  return {
    tokenUsages,
    fallbackTokens: [...fallbackTokens],
    unresolvedTokens: [...unresolvedTokens],
  };
}

export function resolveSimulationScenario(
  scenario: SimScenarioDoc,
  country: CountryDoc,
  metrics: Record<string, number>,
  context: Record<string, string>
): SimulationScenario {
  const titleResult = resolveSimulationText(scenario.title, context);
  const descriptionResult = resolveSimulationText(scenario.description, context);
  const resolvedOptions = scenario.options.map((option) => {
    const textResult = resolveSimulationText(option.text, context);
    const headlineResult = option.outcomeHeadline
      ? resolveSimulationText(option.outcomeHeadline, context)
      : null;
    const summaryResult = option.outcomeSummary
      ? resolveSimulationText(option.outcomeSummary, context)
      : null;
    const contextResult = option.outcomeContext
      ? resolveSimulationText(option.outcomeContext, context)
      : null;
    const advisorFeedback = option.advisorFeedback?.map((feedback) => {
      const feedbackResult = resolveSimulationText(feedback.feedback, context);
      return {
        resolved: {
          ...feedback,
          feedback: feedbackResult.text,
        },
        diagnostics: feedbackResult,
      };
    });

    return {
      option: {
        ...option,
        text: textResult.text,
        outcomeHeadline: headlineResult?.text,
        outcomeSummary: summaryResult?.text,
        outcomeContext: contextResult?.text,
        advisorFeedback: advisorFeedback?.map((entry) => entry.resolved) as AdvisorFeedback[] | undefined,
      },
      diagnostics: mergeDiagnostics([
        textResult,
        ...(headlineResult ? [headlineResult] : []),
        ...(summaryResult ? [summaryResult] : []),
        ...(contextResult ? [contextResult] : []),
        ...((advisorFeedback ?? []).map((entry) => entry.diagnostics)),
      ]),
    };
  });

  const mergedDiagnostics = mergeDiagnostics([
    titleResult,
    descriptionResult,
    ...resolvedOptions.map((entry) => ({
      text: '',
      tokenUsages: entry.diagnostics.tokenUsages,
      fallbackTokens: entry.diagnostics.fallbackTokens,
      unresolvedTokens: entry.diagnostics.unresolvedTokens,
    })),
  ]);

  return {
    id: scenario.id,
    title: titleResult.text,
    description: descriptionResult.text,
    is_active: true,
    createdAt: '',
    updatedAt: undefined,
    phase: scenario.phase,
    actIndex: scenario.actIndex,
    options: resolvedOptions.map((entry) => entry.option),
    metadata: scenario.metadata,
    conditions: scenario.conditions,
    relationship_conditions: scenario.relationship_conditions,
    diagnostics: {
      ...mergedDiagnostics,
      conditionChecks: buildConditionChecks(scenario.conditions, metrics),
      relationshipConditionChecks: buildRelationshipConditionChecks(scenario.relationship_conditions, country),
      validationChecks: buildValidationChecks(scenario, country, context),
    },
  };
}

export function simulateScenarioLibrary(
  scenarios: SimScenarioDoc[],
  country: CountryDoc,
  countriesById: Record<string, CountryDoc>,
  metrics: Record<string, number>
): { eligible: SimulationScenario[]; filtered: SimulationFilteredScenario[]; context: Record<string, string> } {
  const normalizedCountry = normalizeCountryDoc(country);
  const context = buildSimulationTokenContext(normalizedCountry, countriesById);
  const eligible: SimulationScenario[] = [];
  const filtered: SimulationFilteredScenario[] = [];

  for (const scenario of scenarios) {
    const resolvedScenario = resolveSimulationScenario(scenario, normalizedCountry, metrics, context);
    const failedCondition = resolvedScenario.diagnostics.conditionChecks.find((check) => !check.passed);
    const failedRelationshipCondition = resolvedScenario.diagnostics.relationshipConditionChecks.find((check) => !check.passed);
    const failedValidation = resolvedScenario.diagnostics.validationChecks.find((check) => !check.passed);

    if (!scenario.options || scenario.options.length < 3) {
      filtered.push({
        scenario: { id: scenario.id, title: resolvedScenario.title, metadata: scenario.metadata },
        reason: 'Fewer than 3 options',
        diagnostics: {
          conditionChecks: resolvedScenario.diagnostics.conditionChecks,
          relationshipConditionChecks: resolvedScenario.diagnostics.relationshipConditionChecks,
          validationChecks: resolvedScenario.diagnostics.validationChecks,
          fallbackTokens: resolvedScenario.diagnostics.fallbackTokens,
          unresolvedTokens: resolvedScenario.diagnostics.unresolvedTokens,
        },
      });
      continue;
    }

    if (failedCondition) {
      filtered.push({
        scenario: { id: scenario.id, title: resolvedScenario.title, metadata: scenario.metadata },
        reason: failedCondition.detail,
        diagnostics: {
          conditionChecks: resolvedScenario.diagnostics.conditionChecks,
          relationshipConditionChecks: resolvedScenario.diagnostics.relationshipConditionChecks,
          validationChecks: resolvedScenario.diagnostics.validationChecks,
          fallbackTokens: resolvedScenario.diagnostics.fallbackTokens,
          unresolvedTokens: resolvedScenario.diagnostics.unresolvedTokens,
        },
      });
      continue;
    }

    if (failedRelationshipCondition) {
      filtered.push({
        scenario: { id: scenario.id, title: resolvedScenario.title, metadata: scenario.metadata },
        reason: failedRelationshipCondition.detail,
        diagnostics: {
          conditionChecks: resolvedScenario.diagnostics.conditionChecks,
          relationshipConditionChecks: resolvedScenario.diagnostics.relationshipConditionChecks,
          validationChecks: resolvedScenario.diagnostics.validationChecks,
          fallbackTokens: resolvedScenario.diagnostics.fallbackTokens,
          unresolvedTokens: resolvedScenario.diagnostics.unresolvedTokens,
        },
      });
      continue;
    }

    if (failedValidation) {
      filtered.push({
        scenario: { id: scenario.id, title: resolvedScenario.title, metadata: scenario.metadata },
        reason: failedValidation.detail,
        diagnostics: {
          conditionChecks: resolvedScenario.diagnostics.conditionChecks,
          relationshipConditionChecks: resolvedScenario.diagnostics.relationshipConditionChecks,
          validationChecks: resolvedScenario.diagnostics.validationChecks,
          fallbackTokens: resolvedScenario.diagnostics.fallbackTokens,
          unresolvedTokens: resolvedScenario.diagnostics.unresolvedTokens,
        },
      });
      continue;
    }

    eligible.push(resolvedScenario);
  }

  return { eligible, filtered, context };
}

export function summarizeAdvisorStances(feedback: AdvisorFeedback[] | undefined): Record<string, number> {
  return (feedback ?? []).reduce<Record<string, number>>((summary, item) => {
    summary[item.stance] = (summary[item.stance] ?? 0) + 1;
    return summary;
  }, {});
}

export function hasMeaningfulOutcome(option: Pick<Option, 'outcomeHeadline' | 'outcomeSummary' | 'outcomeContext'>): boolean {
  return Boolean(option.outcomeHeadline || option.outcomeSummary || option.outcomeContext);
}

export function hasEffects(option: Pick<Option, 'effects'>): boolean {
  return Array.isArray(option.effects) && option.effects.length > 0;
}

export function formatEffectCount(effects: OptionEffect[]): string {
  return `${effects.length} effect${effects.length === 1 ? '' : 's'}`;
}