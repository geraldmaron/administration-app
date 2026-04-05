import type { BundleScenario, Issue } from './audit-rules';
import type { CountryDocument, CountryRelationship } from '../types';
import type { ScenarioScopeTier } from '../shared/generation-contract';

const TOKEN_PATTERN = /\{([a-z_]+)\}/gi;
const OPTIONAL_TOKENS = new Set([
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

const FALLBACK_VALUES: Record<string, string> = {
  player_country: 'the country',
  the_player_country: 'the country',
  leader_title: 'national leader',
  the_leader_title: 'the national leader',
  legislature: 'legislature',
  the_legislature: 'the legislature',
  governing_party: 'governing party',
  the_governing_party: 'the governing party',
  opposition: 'opposition party',
  the_opposition: 'the opposition party',
  opposition_party: 'opposition party',
  the_opposition_party: 'the opposition party',
  finance_role: 'finance minister',
  the_finance_role: 'the finance minister',
  defense_role: 'defense minister',
  the_defense_role: 'the defense minister',
  justice_role: 'justice minister',
  the_justice_role: 'the justice minister',
  press_role: 'press secretary',
  the_press_role: 'the press secretary',
  adversary: 'an opposing state',
  the_adversary: 'the opposing state',
  ally: 'an allied state',
  the_ally: 'the allied state',
  border_rival: 'a border rival',
  the_border_rival: 'the border rival',
  rival: 'a rival state',
  the_rival: 'the rival state',
  neighbor: 'a neighboring state',
  the_neighbor: 'the neighboring state',
  trade_partner: 'a trade partner',
  the_trade_partner: 'the trade partner',
  partner: 'a partner state',
  the_partner: 'the partner state',
  regional_bloc: 'regional bloc',
  the_regional_bloc: 'the regional bloc',
  major_industry: 'major industry',
  the_major_industry: 'the major industry',
};

export interface RenderedOutputQaSample {
  countryId: string;
  title: string;
  fallbackTokens: string[];
  unresolvedTokens: string[];
}

export interface RenderedOutputQaResult {
  pass: boolean;
  sampleCount: number;
  issues: Issue[];
  samples: RenderedOutputQaSample[];
}

function articleize(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return trimmed.toLowerCase().startsWith('the ') ? trimmed : `the ${trimmed}`;
}

function countryWithArticle(country: CountryDocument): string {
  const name = country.name.trim();
  if (name.toLowerCase().startsWith('the ')) return name;
  const articleCountries = new Set([
    'united states',
    'united kingdom',
    'netherlands',
    'philippines',
    'czech republic',
    'united arab emirates',
    'dominican republic',
    'central african republic',
    'bahamas',
    'gambia',
  ]);
  return articleCountries.has(name.toLowerCase()) ? `the ${name}` : name;
}

function resolveRelationshipName(
  relationship: CountryRelationship | undefined,
  countries: Record<string, CountryDocument>
): { bare: string; definite: string } | null {
  if (!relationship) return null;
  const country = countries[relationship.countryId];
  if (!country) return null;
  return {
    bare: country.name,
    definite: countryWithArticle(country),
  };
}

function setIfMissing(context: Record<string, string>, key: string, value: string | undefined): void {
  if (!value) return;
  if (!context[key]?.trim()) context[key] = value;
}

function buildRenderContext(country: CountryDocument, countries: Record<string, CountryDocument>): Record<string, string> {
  const context: Record<string, string> = {};
  for (const [key, value] of Object.entries(country.tokens ?? {})) {
    if (typeof value === 'string' && value.trim()) context[key] = value.trim();
  }

  context.player_country = country.name;
  context.the_player_country = countryWithArticle(country);
  if (country.tokens?.leader_title) {
    context.leader_title = country.tokens.leader_title;
    context.the_leader_title = articleize(country.tokens.leader_title);
  }

  const geopolitical = country.geopolitical;
  if (geopolitical) {
    const topAdversary = [...(geopolitical.adversaries ?? [])].sort((a, b) => b.strength - a.strength)[0];
    const topAlly = [...(geopolitical.allies ?? [])].filter((item) => item.type === 'formal_ally').sort((a, b) => b.strength - a.strength)[0];
    const topPartner = [...(geopolitical.allies ?? [])].filter((item) => item.type === 'strategic_partner').sort((a, b) => b.strength - a.strength)[0];
    const topRival = [...(geopolitical.adversaries ?? [])].filter((item) => item.type === 'rival').sort((a, b) => b.strength - a.strength)[0]
      ?? [...(geopolitical.neighbors ?? [])].filter((item) => item.type === 'rival').sort((a, b) => b.strength - a.strength)[0];
    const topBorderRival = [...(geopolitical.neighbors ?? [])].filter((item) => item.sharedBorder && ['rival', 'adversary', 'conflict'].includes(item.type)).sort((a, b) => b.strength - a.strength)[0];
    const topNeighbor = [...(geopolitical.neighbors ?? [])].sort((a, b) => b.strength - a.strength)[0];

    const pairs: Array<[string, { bare: string; definite: string } | null]> = [
      ['adversary', resolveRelationshipName(topAdversary, countries)],
      ['ally', resolveRelationshipName(topAlly, countries)],
      ['trade_partner', resolveRelationshipName(topPartner, countries)],
      ['partner', resolveRelationshipName(topPartner, countries)],
      ['rival', resolveRelationshipName(topRival, countries)],
      ['border_rival', resolveRelationshipName(topBorderRival, countries)],
      ['neighbor', resolveRelationshipName(topNeighbor, countries)],
      ['nation', resolveRelationshipName(topNeighbor, countries)],
    ];

    for (const [key, value] of pairs) {
      setIfMissing(context, key, value?.bare);
      setIfMissing(context, `the_${key}`, value?.definite);
    }
  }

  for (const [key, value] of Object.entries({ ...context })) {
    if (!value || key.startsWith('the_')) continue;
    setIfMissing(context, `the_${key}`, articleize(value));
  }

  return context;
}

function normalizeRenderedText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\s+([.!?,;:])/g, '$1')
    .replace(/\b(the)\s+\1\b/gi, '$1')
    .trim();
}

function resolveRenderedText(text: string, context: Record<string, string>): { text: string; fallbackTokens: string[]; unresolvedTokens: string[] } {
  const fallbackTokens = new Set<string>();
  const unresolvedTokens = new Set<string>();
  const rendered = text.replace(TOKEN_PATTERN, (_raw, tokenName: string) => {
    const token = tokenName.toLowerCase();
    const direct = context[token];
    if (direct != null) return direct;
    if (OPTIONAL_TOKENS.has(token)) {
      fallbackTokens.add(token);
      return '';
    }
    fallbackTokens.add(token);
    unresolvedTokens.add(token);
    return FALLBACK_VALUES[token] ?? token.replace(/_/g, ' ');
  });

  return {
    text: normalizeRenderedText(rendered),
    fallbackTokens: [...fallbackTokens],
    unresolvedTokens: [...unresolvedTokens],
  };
}

function issue(severity: Issue['severity'], rule: string, target: string, message: string): Issue {
  return { severity, rule, target, message, autoFixable: false };
}

function selectSampleCountries(
  scenario: BundleScenario,
  countries: Record<string, CountryDocument>,
  limit = 3
): CountryDocument[] {
  const metadata = scenario.metadata;
  const explicitIds = Array.isArray(metadata?.applicable_countries) ? metadata.applicable_countries : [];
  const regionTags = Array.isArray(metadata?.region_tags) ? metadata.region_tags.map((item) => String(item)) : [];

  const byExplicit = explicitIds
    .map((countryId) => countries[countryId])
    .filter((country): country is CountryDocument => Boolean(country));
  if (byExplicit.length > 0) return byExplicit.slice(0, limit);

  const countryList = Object.values(countries).sort((left, right) => left.id.localeCompare(right.id));
  if (regionTags.length > 0) {
    const regional = countryList.filter((country) => regionTags.includes(String(country.region)));
    if (regional.length > 0) return regional.slice(0, limit);
  }

  return countryList.slice(0, limit);
}

export function evaluateRenderedOutputQuality(
  scenario: BundleScenario,
  countries: Record<string, CountryDocument>,
  options?: { sampleLimit?: number; strictScopeTier?: ScenarioScopeTier }
): RenderedOutputQaResult {
  const samples = selectSampleCountries(scenario, countries, options?.sampleLimit ?? 3);
  const issues: Issue[] = [];
  const results: RenderedOutputQaSample[] = [];
  const strictTier = options?.strictScopeTier ?? scenario.metadata?.scopeTier;

  if (samples.length === 0) {
    return {
      pass: false,
      sampleCount: 0,
      samples: [],
      issues: [issue('error', 'rendered-output-no-samples', scenario.id, 'No representative countries available for rendered-output QA.')],
    };
  }

  for (const country of samples) {
    const context = buildRenderContext(country, countries);
    const renderParts = [
      resolveRenderedText(scenario.title, context),
      resolveRenderedText(scenario.description, context),
      ...scenario.options.flatMap((option) => [
        resolveRenderedText(option.text, context),
        ...(option.outcomeHeadline ? [resolveRenderedText(option.outcomeHeadline, context)] : []),
        ...(option.outcomeSummary ? [resolveRenderedText(option.outcomeSummary, context)] : []),
        ...(option.outcomeContext ? [resolveRenderedText(option.outcomeContext, context)] : []),
        ...((option.advisorFeedback ?? []).map((feedback) => resolveRenderedText(feedback.feedback, context))),
      ]),
    ];

    const fallbackTokens = [...new Set(renderParts.flatMap((part) => part.fallbackTokens))];
    const unresolvedTokens = [...new Set(renderParts.flatMap((part) => part.unresolvedTokens))];
    const title = renderParts[0]?.text ?? scenario.title;
    results.push({ countryId: country.id, title, fallbackTokens, unresolvedTokens });

    if (unresolvedTokens.length > 0) {
      issues.push(issue(
        'error',
        'rendered-output-unresolved-token',
        `${scenario.id}/${country.id}`,
        `Rendered output for ${country.id} required fallback resolution for unresolved token(s): ${unresolvedTokens.join(', ')}.`
      ));
    }

    const fallbackThreshold = strictTier === 'exclusive' ? 0 : 2;
    if (fallbackTokens.length > fallbackThreshold) {
      issues.push(issue(
        strictTier === 'exclusive' ? 'error' : 'warn',
        'rendered-output-fallback-heavy',
        `${scenario.id}/${country.id}`,
        `Rendered output for ${country.id} depends on ${fallbackTokens.length} fallback token(s): ${fallbackTokens.join(', ')}.`
      ));
    }

    if (/\{[a-z_]+\}/i.test(title)) {
      issues.push(issue('error', 'rendered-output-token-leak', `${scenario.id}/${country.id}`, `Rendered title still contains raw token syntax for ${country.id}.`));
    }
  }

  return {
    pass: !issues.some((entry) => entry.severity === 'error'),
    sampleCount: results.length,
    issues,
    samples: results,
  };
}
