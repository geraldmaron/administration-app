/**
 * Shared CLI option definitions and filter helpers for scenario-loops.
 * Used by generate, list, and audit commands for bundle/region/country.
 */

export const REGIONS = [
  { id: 'africa', label: 'Africa' },
  { id: 'asia', label: 'Asia' },
  { id: 'caribbean', label: 'Caribbean' },
  { id: 'east_asia', label: 'East Asia' },
  { id: 'europe', label: 'Europe' },
  { id: 'eurasia', label: 'Eurasia' },
  { id: 'middle_east', label: 'Middle East' },
  { id: 'north_america', label: 'North America' },
  { id: 'oceania', label: 'Oceania' },
  { id: 'south_america', label: 'South America' },
  { id: 'south_asia', label: 'South Asia' },
  { id: 'southeast_asia', label: 'Southeast Asia' },
];

export const DEFAULT_BUNDLE_IDS = [
  'economy', 'politics', 'military', 'tech', 'environment', 'social',
  'health', 'diplomacy', 'justice', 'corruption', 'culture', 'infrastructure',
  'resources', 'authoritarian',
];

/** Bundle labels with short guidance for prompts (so every option has insight). */
export const BUNDLE_CHOICES = [
  { name: 'economy — supply chains, debt, inflation, fiscal crises', value: 'economy' },
  { name: 'politics — elections, scandals, constitutional crises', value: 'politics' },
  { name: 'military — wars, nuclear threats, coups, peacekeeping', value: 'military' },
  { name: 'tech — AI, cybersecurity, space, digital infrastructure', value: 'tech' },
  { name: 'environment — climate, pollution, natural disasters', value: 'environment' },
  { name: 'social — inequality, education, healthcare, strikes', value: 'social' },
  { name: 'health — pandemics, epidemics, healthcare collapse', value: 'health' },
  { name: 'diplomacy — trade wars, sanctions, alliances, hostages', value: 'diplomacy' },
  { name: 'justice — crime waves, corruption, judicial independence', value: 'justice' },
  { name: 'corruption — government corruption, bribery, fraud', value: 'corruption' },
  { name: 'culture — cultural conflicts, media, censorship', value: 'culture' },
  { name: 'infrastructure — transportation, utilities, communications', value: 'infrastructure' },
  { name: 'resources — energy crises, water scarcity, mining', value: 'resources' },
  { name: 'authoritarian — authoritarian and morally dark options', value: 'authoritarian' },
];

/**
 * OpenAI API: backend typically limits concurrent requests via OPENAI_MAX_CONCURRENT (e.g. 20).
 * We cap batch concurrency so in-flight batches don't exceed that when each batch triggers API calls.
 * @see https://platform.openai.com/docs/guides/rate-limits
 */
export const OPENAI_MAX_CONCURRENT_DEFAULT = 20;

export const BULK_DEFAULTS = {
  maxCount: 100_000,
  defaultConcurrency: OPENAI_MAX_CONCURRENT_DEFAULT,
  maxConcurrency: 100,
  defaultBatchSize: 25,
  maxBatchSize: 200,
  defaultRetries: 3,
  maxRetries: 10,
  defaultRetryDelayMs: 2000,
  defaultDelayBetweenBatchesMs: 0,
  defaultTimeoutPerBatchMs: 120_000,
  confirmThreshold: 1000,
};

/** Count = total number of scenarios to generate in this run. */
export const COUNT_PRESETS = [
  { name: '10 — small run (quick test)', value: 10 },
  { name: '50', value: 50 },
  { name: '100', value: 100 },
  { name: '500', value: 500 },
  { name: '1,000', value: 1000 },
  { name: '5,000', value: 5000 },
  { name: '10,000 — large run (use bulk options)', value: 10000 },
  { name: 'Custom — enter any number from 1 to 100,000', value: 'custom' },
];

/** Concurrency = how many batches run at the same time. Higher = faster, more API load. */
export const CONCURRENCY_CHOICES = [
  { name: '5 — conservative (fewer parallel requests)', value: 5 },
  { name: '10', value: 10 },
  { name: '20 — recommended (matches typical OpenAI limit)', value: 20 },
  { name: '50', value: 50 },
  { name: '100 — max parallel batches', value: 100 },
  { name: 'Custom — enter 1–100 (capped by OPENAI_MAX_CONCURRENT if set)', value: 'custom' },
];

/** Batch size = scenarios per batch. Larger batches = fewer round-trips, more memory per batch. */
export const BATCH_SIZE_CHOICES = [
  { name: '10', value: 10 },
  { name: '25 — recommended', value: 25 },
  { name: '50', value: 50 },
  { name: '100', value: 100 },
  { name: '200', value: 200 },
  { name: 'Custom — enter 1–200 (scenarios per API round-trip)', value: 'custom' },
];

/** Retries = how many times to retry a batch if it fails (e.g. rate limit or timeout). */
export const RETRIES_CHOICES = [
  { name: '0 — no retries', value: 0 },
  { name: '1', value: 1 },
  { name: '2', value: 2 },
  { name: '3 — recommended', value: 3 },
  { name: '5', value: 5 },
  { name: '10', value: 10 },
];

export const REGION_CHOICES = REGIONS.map(r => ({ name: r.label, value: r.id }));

/** Dedup defaults: skip existing and dedup within run by default. */
export const DEDUP_DEFAULTS = { skipExisting: true, dedupWithinRun: true };

export function createBundleOption(cmd) {
  return cmd.option(
    '--bundle <id>',
    'Bundle ID to operate on (e.g. default, campaign, tutorial)'
  );
}

export function createRegionOption(cmd) {
  return cmd.option(
    '--region <name>',
    `Region filter: one of ${REGIONS.map(r => r.id).join(', ')}`
  );
}

export function createCountryOption(cmd) {
  return cmd.option(
    '--country <id>',
    'Country ID filter (comma-separated for multiple)'
  );
}

export function createDryRunOption(cmd) {
  return cmd.option('--dry-run', 'Show what would be done without writing');
}

export function createJsonOption(cmd) {
  return cmd.option('--json', 'Output machine-readable JSON');
}

export function parseCountryList(value) {
  if (!value || typeof value !== 'string') return [];
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

export function validateRegion(region) {
  if (!region) return null;
  const found = REGIONS.find(r => r.id === region);
  return found ? found.id : null;
}

export function clampCount(value, max = BULK_DEFAULTS.maxCount) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n) || n < 1) return 10;
  return Math.min(n, max);
}

export function clampConcurrency(value) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n) || n < 1) return BULK_DEFAULTS.defaultConcurrency;
  return Math.min(n, BULK_DEFAULTS.maxConcurrency);
}

export function clampBatchSize(value) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n) || n < 1) return BULK_DEFAULTS.defaultBatchSize;
  return Math.min(n, BULK_DEFAULTS.maxBatchSize);
}

export function clampRetries(value) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n) || n < 0) return BULK_DEFAULTS.defaultRetries;
  return Math.min(n, BULK_DEFAULTS.maxRetries);
}

/**
 * Effective concurrency cap from env OPENAI_MAX_CONCURRENT (used by backend).
 * Ensures we don't exceed the backend's OpenAI concurrency limit.
 */
export function getOpenAIMaxConcurrent() {
  const env = process.env.OPENAI_MAX_CONCURRENT;
  if (env == null || env === '') return null;
  const n = parseInt(env, 10);
  return Number.isNaN(n) || n < 1 ? null : n;
}

/**
 * Concurrency to use: min(requested, OPENAI_MAX_CONCURRENT when set).
 */
export function effectiveConcurrency(requested) {
  const cap = getOpenAIMaxConcurrent();
  if (cap == null) return requested;
  return Math.min(requested, cap);
}
