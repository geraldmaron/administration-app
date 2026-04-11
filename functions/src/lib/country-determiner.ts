/**
 * Country Determiner Registry
 *
 * Single source of truth for which country names require a definite article
 * ("the") in English prose. The rule of thumb: countries that are plural,
 * contain a common noun (kingdom, states, republic, union, emirates), or are
 * island archipelagos typically require "the". Exceptions exist (Ukraine
 * dropped "the" officially in 2022; Russia never conventionally used it).
 *
 * Keys are the canonical lowercase country name as it would appear in Firestore
 * or prompt text. Matching is case-insensitive at runtime.
 */

export const COUNTRIES_REQUIRING_ARTICLE: ReadonlySet<string> = new Set([
  // Compound official names with common nouns
  'united states',
  'united states of america',
  'united kingdom',
  'united arab emirates',
  'dominican republic',
  'central african republic',
  'czech republic',
  'slovak republic',
  'democratic republic of the congo',
  'republic of the congo',
  'congo',
  'federated states of micronesia',

  // Plural or archipelago names
  'netherlands',
  'philippines',
  'bahamas',
  'maldives',
  'seychelles',
  'comoros',
  'solomon islands',
  'marshall islands',
  'cayman islands',
  'faroe islands',
  'turks and caicos islands',
  'cocos islands',
  'cook islands',
  'virgin islands',

  // Names with "The" as part of formal English usage
  'gambia',
  'ivory coast',          // alt; Côte d'Ivoire is also accepted without
  'sudan',                // historically "the Sudan" — older usage persists
  'vatican',              // "the Vatican" is idiomatic
  'holy see',
]);

/**
 * Returns true if the given country name conventionally requires "the" in
 * English. Matching is case-insensitive and trims leading/trailing whitespace.
 */
export function requiresDefiniteArticle(countryName: string): boolean {
  return COUNTRIES_REQUIRING_ARTICLE.has(countryName.trim().toLowerCase());
}

/**
 * Returns the country name with the correct form of "the" prepended (or not),
 * correctly capitalised for sentence-initial vs. mid-sentence use.
 *
 * @param countryName  The bare country name, e.g. "Netherlands"
 * @param sentenceInitial  When true, returns "The Netherlands"; otherwise "the Netherlands"
 */
export function formatCountryWithArticle(
  countryName: string,
  sentenceInitial: boolean,
): string {
  if (!requiresDefiniteArticle(countryName)) return countryName;
  const article = sentenceInitial ? 'The' : 'the';
  return `${article} ${countryName}`;
}
