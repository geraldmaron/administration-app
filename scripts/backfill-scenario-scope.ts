/**
 * Backfills scope metadata for existing scenarios and reports inventory by
 * bundle, scope tier, and scope key.
 *
 * Usage:
 *   npx tsx scripts/backfill-scenario-scope.ts
 *   npx tsx scripts/backfill-scenario-scope.ts --apply
 *   npx tsx scripts/backfill-scenario-scope.ts --apply --limit 200
 *   npx tsx scripts/backfill-scenario-scope.ts --bundle diplomacy
 */

// @ts-nocheck
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import * as path from 'path';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const serviceAccount = require(path.join(__dirname, '..', 'serviceAccountKey.json'));
const admin = require('firebase-admin');

const { loadCountryCatalog } = require(path.join(
  __dirname,
  '..',
  'functions',
  'src',
  'lib',
  'country-catalog.ts'
));
const { normalizeRegion, getRegionForCountry, REGION_IDS } = require(path.join(
  __dirname,
  '..',
  'functions',
  'src',
  'data',
  'schemas',
  'regions.ts'
));
const { GEO_TAGS } = require(path.join(
  __dirname,
  '..',
  'functions',
  'src',
  'data',
  'schemas',
  'geopoliticalTags.ts'
));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'the-administration-3a072',
  });
}

const db = admin.firestore();

const SCRIPT_ID = 'scripts/backfill-scenario-scope.ts';
const BACKFILL_VERSION = '2026-03-17-scope-backfill-v1';
const VALID_SCOPE_TIERS = new Set(['universal', 'regional', 'cluster', 'exclusive']);
const VALID_SOURCE_KINDS = new Set(['evergreen', 'news', 'neighbor', 'consequence']);
const VALID_EXCLUSIVITY_REASONS = new Set([
  'constitution',
  'historical',
  'bilateral_dispute',
  'unique_institution',
  'unique_military_doctrine',
]);
const REGION_SET = new Set(REGION_IDS);
const DEMOCRATIC_CATEGORIES = new Set([
  'liberal_democracy',
  'illiberal_democracy',
  'constitutional_monarchy',
]);
const HYBRID_OR_DEMOCRATIC_CATEGORIES = new Set([
  'liberal_democracy',
  'illiberal_democracy',
  'constitutional_monarchy',
  'hybrid_regime',
]);
const AUTHORITARIAN_CATEGORIES = new Set([
  'authoritarian',
  'totalitarian',
  'theocracy',
  'absolute_monarchy',
]);
const RESOURCE_EXPORT_WORDS = [
  'oil',
  'gas',
  'lng',
  'coal',
  'copper',
  'lithium',
  'uranium',
  'nickel',
  'rare earth',
  'gold',
  'mineral',
  'phosphate',
  'bauxite',
];
const MANUFACTURING_WORDS = [
  'manufactur',
  'factory',
  'supply chain',
  'semiconductor',
  'electronics',
  'automotive',
  'industrial',
];
const TOURISM_WORDS = [
  'tourism',
  'resort',
  'visitor',
  'hotel',
  'cruise',
  'airport',
  'hospitality',
];
const CLIMATE_COASTAL_WORDS = [
  'coastal',
  'port',
  'storm surge',
  'sea level',
  'flood',
  'typhoon',
  'cyclone',
  'hurricane',
  'seawall',
];
const WATER_STRESS_WORDS = [
  'water',
  'drought',
  'irrigation',
  'reservoir',
  'crop failure',
  'harvest',
  'aquifer',
  'canal',
];
const SECURITY_WORDS = [
  'border',
  'insurg',
  'militia',
  'raid',
  'smuggling',
  'cross-border',
  'frontier',
];
const SANCTIONS_WORDS = [
  'sanction',
  'embargo',
  'smuggling',
  'evasion',
  'black market',
];
const NUCLEAR_WORDS = [
  'nuclear',
  'missile',
  'deterr',
  'brinkmanship',
  'strategic arsenal',
];
const CONSTITUTION_WORDS = [
  'constitution',
  'constitutional',
  'basic law',
  'referendum',
  'charter',
  'upper house',
  'lower house',
  'electoral college',
  'monarchy',
  'supreme court',
];
const HISTORICAL_WORDS = [
  'anniversary',
  'partition',
  'colonial',
  'postwar',
  'historic',
  'legacy of',
  'reparation',
  'transitional justice',
  'memorial',
];
const BILATERAL_WORDS = [
  'territorial dispute',
  'maritime dispute',
  'border dispute',
  'ceasefire line',
  'demarcation',
  'territorial waters',
  'island chain',
];
const MILITARY_DOCTRINE_WORDS = [
  'conscription',
  'deterrence',
  'military doctrine',
  'force posture',
  'naval doctrine',
  'strategic doctrine',
  'nuclear posture',
];
const REGIONAL_TEXT_WORDS = [
  'regional bloc',
  'cross-border',
  'neighboring states',
  'migration route',
  'regional market',
  'regional response',
];

function getArgValue(flag) {
  const args = process.argv.slice(2);
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

const APPLY = process.argv.includes('--apply');
const REWRITE_EXISTING = process.argv.includes('--rewrite-existing');
const INCLUDE_INACTIVE = process.argv.includes('--include-inactive');
const BUNDLE_FILTER = getArgValue('--bundle')?.trim();
const LIMIT = Math.max(0, Number.parseInt(getArgValue('--limit') ?? '0', 10) || 0);
const MANUAL_REVIEW_LIMIT = Math.max(1, Number.parseInt(getArgValue('--manual-limit') ?? '50', 10) || 50);

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeCountryId(value) {
  const candidate = normalizeString(value).toLowerCase();
  return /^[a-z]{2}$/i.test(candidate) ? candidate : '';
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) return [value];
  return [];
}

function uniqueStrings(values) {
  const seen = new Set();
  const results = [];
  for (const value of values) {
    const normalized = normalizeString(String(value));
    if (!normalized) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    results.push(normalized);
  }
  return results;
}

function normalizeRegions(values) {
  const results = [];
  for (const value of values) {
    const raw = normalizeString(String(value));
    if (!raw) continue;
    const lowered = raw.toLowerCase();
    const regionId = REGION_SET.has(lowered) ? lowered : normalizeRegion(raw);
    if (regionId) results.push(regionId);
  }
  return uniqueStrings(results);
}

function inferScopeKey(scopeTier, options) {
  const primaryRegion = options.region ?? options.regions?.[0];
  switch (scopeTier) {
    case 'regional':
      return primaryRegion ? `region:${primaryRegion}` : '';
    case 'cluster':
      return options.clusterId ? `cluster:${options.clusterId}` : '';
    case 'exclusive':
      return options.applicableCountries?.length === 1 ? `country:${options.applicableCountries[0]}` : '';
    default:
      return 'universal';
  }
}

function normalizeSourceKind(data) {
  const meta = data?.metadata ?? {};
  if (VALID_SOURCE_KINDS.has(meta.sourceKind)) return meta.sourceKind;
  if (meta.isNeighborEvent === true) return 'neighbor';
  if (meta.source === 'news' || meta.source_news) return 'news';
  return 'evergreen';
}

function buildScenarioText(data) {
  const chunks = [data?.title, data?.description];
  for (const option of Array.isArray(data?.options) ? data.options : []) {
    chunks.push(option?.text, option?.outcomeHeadline, option?.outcomeSummary, option?.outcomeContext);
    for (const advisor of Array.isArray(option?.advisorFeedback) ? option.advisorFeedback : []) {
      chunks.push(advisor?.feedback);
    }
  }
  return chunks.filter(Boolean).join(' ').toLowerCase();
}

function includesAny(text, phrases) {
  return phrases.some((phrase) => text.includes(phrase));
}

function isValidExistingClassification(data) {
  const meta = data?.metadata ?? {};
  if (!VALID_SCOPE_TIERS.has(meta.scopeTier)) return false;
  if (!normalizeString(meta.scopeKey)) return false;
  if (!VALID_SOURCE_KINDS.has(meta.sourceKind)) return false;
  if (meta.scopeTier === 'regional') {
    const regions = normalizeRegions(toArray(meta.region_tags));
    if (regions.length === 0) return false;
    if (!String(meta.scopeKey).startsWith('region:')) return false;
  }
  if (meta.scopeTier === 'cluster') {
    if (!normalizeString(meta.clusterId)) return false;
    if (!String(meta.scopeKey).startsWith('cluster:')) return false;
  }
  if (meta.scopeTier === 'exclusive') {
    const countries = toArray(meta.applicable_countries).map(normalizeCountryId).filter(Boolean);
    if (countries.length !== 1) return false;
    if (!VALID_EXCLUSIVITY_REASONS.has(meta.exclusivityReason)) return false;
    if (!String(meta.scopeKey).startsWith('country:')) return false;
  }
  if (meta.scopeTier === 'universal' && meta.scopeKey !== 'universal') return false;
  return true;
}

function getScenarioCountries(data) {
  const meta = data?.metadata ?? {};
  return uniqueStrings([
    ...toArray(meta.applicable_countries).map(normalizeCountryId),
    ...toArray(meta.involvedCountries).map(normalizeCountryId),
  ].filter(Boolean));
}

function getScenarioRegions(data, scenarioCountries) {
  const meta = data?.metadata ?? {};
  const boostedRegions = Object.keys(meta.regionalBoost ?? {});
  const countryRegions = scenarioCountries.map((countryId) => getRegionForCountry(countryId)).filter(Boolean);
  return normalizeRegions([
    ...toArray(meta.region_tags),
    ...boostedRegions,
    ...countryRegions,
  ]);
}

function getGovernmentCategory(country) {
  return country?.geopolitical?.governmentCategory ?? '';
}

function getGeopoliticalTags(country) {
  return new Set(toArray(country?.geopolitical?.tags).map(String));
}

function getAllies(country) {
  return toArray(country?.geopolitical?.allies);
}

function getAdversaries(country) {
  return toArray(country?.geopolitical?.adversaries);
}

function getNeighbors(country) {
  return toArray(country?.geopolitical?.neighbors);
}

function inferCountryClusters(country) {
  const clusters = new Set();
  if (!country) return [];

  const govCategory = getGovernmentCategory(country);
  const tags = getGeopoliticalTags(country);
  const region = normalizeString(country?.region).toLowerCase();
  const gdpPerCapita = Number(country?.economy?.gdp_per_capita ?? 0);
  const primaryExport = normalizeString(country?.economy?.primary_export).toLowerCase();
  const primaryImport = normalizeString(country?.economy?.primary_import).toLowerCase();
  const tradeDependencies = toArray(country?.economy?.trade_dependencies).map((value) => String(value).toLowerCase());
  const urbanPct = Number(country?.population?.demographics?.urban_pct ?? 0);
  const medianAge = Number(country?.population?.demographics?.median_age ?? 0);
  const regimeStability = Number(country?.geopolitical?.regimeStability ?? 0);
  const legislatureGridlock = Number(country?.legislature_initial_state?.gridlock_level ?? 0);
  const allies = getAllies(country);
  const adversaries = getAdversaries(country);
  const neighbors = getNeighbors(country);
  const isDemocratic = DEMOCRATIC_CATEGORIES.has(govCategory);
  const isHybridOrDemocratic = HYBRID_OR_DEMOCRATIC_CATEGORIES.has(govCategory);
  const isAuthoritarian = AUTHORITARIAN_CATEGORIES.has(govCategory);
  const hasResourceExport = RESOURCE_EXPORT_WORDS.some((word) => primaryExport.includes(word));
  const hasManufacturingSignal = tags.has(GEO_TAGS.MANUFACTURING_HUB) || MANUFACTURING_WORDS.some((word) => primaryExport.includes(word));
  const hasTourismSignal = TOURISM_WORDS.some((word) => primaryExport.includes(word) || primaryImport.includes(word));
  const isIsland = tags.has(GEO_TAGS.ISLAND_NATION) || tags.has(GEO_TAGS.ARCHIPELAGO);
  const isCoastal = tags.has(GEO_TAGS.COASTAL);
  const isLandlocked = tags.has(GEO_TAGS.LANDLOCKED);

  if (isDemocratic && (tags.has(GEO_TAGS.NATO) || tags.has(GEO_TAGS.EU) || tags.has(GEO_TAGS.FIVE_EYES) || tags.has(GEO_TAGS.AUKUS) || tags.has(GEO_TAGS.QUAD)) && allies.length >= 2) {
    clusters.add('alliance_anchor_democracy');
  }
  if (isDemocratic && gdpPerCapita >= 25000 && medianAge >= 35) {
    clusters.add('aging_industrial_democracy');
  }
  if (isHybridOrDemocratic && (legislatureGridlock >= 55 || regimeStability <= 55)) {
    clusters.add('fragile_multifaction_democracy');
  }
  if (hasResourceExport && (tradeDependencies.length >= 2 || normalizeString(country?.gameplay?.priority_tags?.join(' ')).toLowerCase().includes('sovereign'))) {
    clusters.add('resource_nationalist_state');
  }
  if (hasManufacturingSignal && tradeDependencies.length >= 2) {
    clusters.add('export_manufacturing_power');
  }
  if (isDemocratic && hasResourceExport) {
    clusters.add('commodity_exporter_democracy');
  }
  if (isAuthoritarian && (tags.has(GEO_TAGS.OIL_EXPORTER) || tags.has(GEO_TAGS.GAS_EXPORTER) || hasResourceExport)) {
    clusters.add('petrostate_authoritarian');
  }
  if ((primaryImport.includes('food') || primaryImport.includes('grain') || primaryImport.includes('wheat') || primaryImport.includes('rice')) && gdpPerCapita <= 20000) {
    clusters.add('food_import_dependent_state');
  }
  if (urbanPct >= 70 && (primaryExport.includes('tourism') || primaryExport.includes('finance') || primaryExport.includes('services') || primaryExport.includes('service'))) {
    clusters.add('migrant_destination_service_economy');
  }
  if (isIsland && hasTourismSignal && (region === 'caribbean' || region === 'oceania' || region === 'southeast_asia')) {
    clusters.add('small_island_tourism_state');
  }
  if (isCoastal && (region === 'caribbean' || region === 'oceania' || region === 'southeast_asia' || region === 'south_asia' || region === 'east_asia')) {
    clusters.add('climate_exposed_coastal_state');
  }
  if ((primaryExport.includes('agric') || primaryExport.includes('crop') || primaryExport.includes('cotton') || primaryExport.includes('tea')) && (region === 'africa' || region === 'south_asia' || region === 'middle_east')) {
    clusters.add('water_stressed_agro_state');
  }
  if (isLandlocked && (tradeDependencies.length >= 2 || neighbors.length >= 2)) {
    clusters.add('landlocked_trade_corridor_state');
  }
  if (adversaries.length > 0 || tags.has(GEO_TAGS.CONFLICT_ZONE)) {
    clusters.add('frontier_security_state');
  }
  if (isAuthoritarian && tags.has(GEO_TAGS.SANCTIONED)) {
    clusters.add('sanctions_exposed_authoritarian');
  }
  if (tags.has(GEO_TAGS.NUCLEAR_STATE)) {
    clusters.add('nuclear_deterrent_rivalry_state');
  }
  if (tags.has(GEO_TAGS.POST_CONFLICT)) {
    clusters.add('post_conflict_reconstruction_state');
  }

  return [...clusters].sort();
}

function buildCountryClusterMap(countries) {
  const byCountry = {};
  const clusterMembers = {};

  for (const [countryId, country] of Object.entries(countries)) {
    const normalizedCountryId = normalizeCountryId(countryId);
    if (!normalizedCountryId) continue;
    const clusters = inferCountryClusters(country);
    byCountry[normalizedCountryId] = clusters;
    for (const clusterId of clusters) {
      if (!clusterMembers[clusterId]) clusterMembers[clusterId] = [];
      clusterMembers[clusterId].push(normalizedCountryId);
    }
  }

  for (const clusterId of Object.keys(clusterMembers)) {
    clusterMembers[clusterId].sort();
  }

  return { byCountry, clusterMembers };
}

function inferScenarioCluster(data, scenarioCountries, countryClusterMap, clusterMembers) {
  const meta = data?.metadata ?? {};
  const requiredTags = new Set(toArray(meta.requiredGeopoliticalTags).map(String));
  const requiredGovCategories = new Set(toArray(meta.requiredGovernmentCategories).map(String));
  const text = buildScenarioText(data);
  const hasEligibilitySignals = requiredTags.size > 0 || requiredGovCategories.size > 0 || scenarioCountries.length > 0;
  const reasons = [];
  let strength = 'none';

  const clustersForCountries = scenarioCountries
    .map((countryId) => countryClusterMap[countryId] ?? [])
    .filter((clusters) => clusters.length > 0);
  let sharedClusters = [];
  if (clustersForCountries.length > 0) {
    sharedClusters = clustersForCountries.reduce((acc, clusters) => acc.filter((clusterId) => clusters.includes(clusterId)));
  }

  function accept(clusterId, reason, nextStrength = 'medium') {
    const memberCount = (clusterMembers[clusterId] ?? []).length;
    if (memberCount < 2) return null;
    reasons.push(reason);
    strength = nextStrength;
    return clusterId;
  }

  if (sharedClusters.length === 1) {
    return {
      clusterId: sharedClusters[0],
      strength: 'high',
      reasons: ['Applicable countries share a single derived cluster'],
    };
  }

  if (requiredTags.has(GEO_TAGS.NUCLEAR_STATE) || includesAny(text, NUCLEAR_WORDS)) {
    const clusterId = accept('nuclear_deterrent_rivalry_state', 'Nuclear or deterrence signal present', requiredTags.has(GEO_TAGS.NUCLEAR_STATE) ? 'high' : 'medium');
    if (clusterId) return { clusterId, strength, reasons };
  }
  if ((requiredTags.has(GEO_TAGS.SANCTIONED) || includesAny(text, SANCTIONS_WORDS)) && [...requiredGovCategories].some((value) => AUTHORITARIAN_CATEGORIES.has(value))) {
    const clusterId = accept('sanctions_exposed_authoritarian', 'Sanctions plus authoritarian signal present', 'high');
    if (clusterId) return { clusterId, strength, reasons };
  }
  if (requiredTags.has(GEO_TAGS.POST_CONFLICT)) {
    const clusterId = accept('post_conflict_reconstruction_state', 'Post-conflict eligibility signal present', 'high');
    if (clusterId) return { clusterId, strength, reasons };
  }
  if ((requiredTags.has(GEO_TAGS.LANDLOCKED) || includesAny(text, ['landlocked'])) && includesAny(text, ['corridor', 'customs', 'transit', 'border crossing', 'port access'])) {
    const clusterId = accept('landlocked_trade_corridor_state', 'Landlocked trade-corridor signal present', 'high');
    if (clusterId) return { clusterId, strength, reasons };
  }
  if ((requiredTags.has(GEO_TAGS.ISLAND_NATION) || requiredTags.has(GEO_TAGS.ARCHIPELAGO)) && includesAny(text, TOURISM_WORDS)) {
    const clusterId = accept('small_island_tourism_state', 'Island and tourism signal present', 'high');
    if (clusterId) return { clusterId, strength, reasons };
  }
  if ((requiredTags.has(GEO_TAGS.COASTAL) || includesAny(text, ['coastal'])) && includesAny(text, CLIMATE_COASTAL_WORDS)) {
    const clusterId = accept('climate_exposed_coastal_state', 'Coastal climate-risk signal present', 'high');
    if (clusterId) return { clusterId, strength, reasons };
  }
  if (includesAny(text, WATER_STRESS_WORDS)) {
    const clusterId = accept('water_stressed_agro_state', 'Water-stress signal present', 'medium');
    if (clusterId) return { clusterId, strength, reasons };
  }
  if ([...requiredGovCategories].some((value) => DEMOCRATIC_CATEGORIES.has(value)) && (requiredTags.has(GEO_TAGS.NATO) || requiredTags.has(GEO_TAGS.EU) || requiredTags.has(GEO_TAGS.FIVE_EYES) || requiredTags.has(GEO_TAGS.AUKUS) || requiredTags.has(GEO_TAGS.QUAD))) {
    const clusterId = accept('alliance_anchor_democracy', 'Alliance-anchor democratic signal present', 'high');
    if (clusterId) return { clusterId, strength, reasons };
  }
  if (hasEligibilitySignals && [...requiredGovCategories].some((value) => DEMOCRATIC_CATEGORIES.has(value)) && includesAny(text, ['aging', 'pension', 'elder care', 'retirement', 'welfare strain'])) {
    const clusterId = accept('aging_industrial_democracy', 'Aging industrial democracy signal present', 'medium');
    if (clusterId) return { clusterId, strength, reasons };
  }
  if (hasEligibilitySignals && [...requiredGovCategories].some((value) => HYBRID_OR_DEMOCRATIC_CATEGORIES.has(value)) && includesAny(text, ['coalition', 'hung parliament', 'confidence vote', 'fragmented', 'protest camp'])) {
    const clusterId = accept('fragile_multifaction_democracy', 'Fragmented democracy signal present', 'medium');
    if (clusterId) return { clusterId, strength, reasons };
  }
  if ((requiredTags.has(GEO_TAGS.OIL_EXPORTER) || requiredTags.has(GEO_TAGS.GAS_EXPORTER) || includesAny(text, ['oil', 'gas', 'subsidy'])) && [...requiredGovCategories].some((value) => AUTHORITARIAN_CATEGORIES.has(value))) {
    const clusterId = accept('petrostate_authoritarian', 'Hydrocarbon authoritarian signal present', 'high');
    if (clusterId) return { clusterId, strength, reasons };
  }
  if ((requiredTags.has(GEO_TAGS.OIL_EXPORTER) || requiredTags.has(GEO_TAGS.GAS_EXPORTER) || includesAny(text, ['royalty', 'state oil', 'export revenue'])) && [...requiredGovCategories].some((value) => DEMOCRATIC_CATEGORIES.has(value))) {
    const clusterId = accept('commodity_exporter_democracy', 'Commodity-exporter democratic signal present', 'high');
    if (clusterId) return { clusterId, strength, reasons };
  }
  if (requiredTags.has(GEO_TAGS.MANUFACTURING_HUB) || (hasEligibilitySignals && includesAny(text, MANUFACTURING_WORDS))) {
    const clusterId = accept('export_manufacturing_power', 'Manufacturing export signal present', requiredTags.has(GEO_TAGS.MANUFACTURING_HUB) ? 'high' : 'medium');
    if (clusterId) return { clusterId, strength, reasons };
  }
  if (hasEligibilitySignals && includesAny(text, ['food import', 'grain shipment', 'food security', 'imported wheat', 'imported rice'])) {
    const clusterId = accept('food_import_dependent_state', 'Food-import dependency signal present', 'medium');
    if (clusterId) return { clusterId, strength, reasons };
  }
  if (hasEligibilitySignals && includesAny(text, ['migrant labor', 'visa quota', 'housing shortage', 'service economy', 'migration surge'])) {
    const clusterId = accept('migrant_destination_service_economy', 'Migration-service economy signal present', 'medium');
    if (clusterId) return { clusterId, strength, reasons };
  }
  if (hasEligibilitySignals && includesAny(text, ['nationalization', 'state mining company', 'resource levy', 'resource royalty', 'sovereign control'])) {
    const clusterId = accept('resource_nationalist_state', 'Resource-nationalist signal present', 'medium');
    if (clusterId) return { clusterId, strength, reasons };
  }
  if (requiredTags.has(GEO_TAGS.CONFLICT_ZONE) || includesAny(text, SECURITY_WORDS)) {
    const clusterId = accept('frontier_security_state', 'Security frontier signal present', requiredTags.has(GEO_TAGS.CONFLICT_ZONE) ? 'high' : 'medium');
    if (clusterId) return { clusterId, strength, reasons };
  }

  return { clusterId: '', strength: 'none', reasons: [] };
}

function inferExclusivityReason(data, country) {
  const existingReason = data?.metadata?.exclusivityReason;
  if (VALID_EXCLUSIVITY_REASONS.has(existingReason)) return existingReason;

  const bundle = normalizeString(data?.metadata?.bundle).toLowerCase();
  const text = buildScenarioText(data);

  if (includesAny(text, BILATERAL_WORDS)) return 'bilateral_dispute';
  if (bundle === 'military' || includesAny(text, MILITARY_DOCTRINE_WORDS)) return 'unique_military_doctrine';
  if (includesAny(text, CONSTITUTION_WORDS) || normalizeString(country?.legislature?.type)) return 'constitution';
  if (includesAny(text, HISTORICAL_WORDS)) return 'historical';
  return 'unique_institution';
}

function buildMigrationProposal(docId, data, scenarioCountries, scenarioRegions, countryClusterMap, clusterMembers) {
  const meta = data?.metadata ?? {};
  const sourceKind = normalizeSourceKind(data);
  const text = buildScenarioText(data);
  const normalizedCountries = scenarioCountries;
  const regionalTextSignal = includesAny(text, REGIONAL_TEXT_WORDS);
  const clusterSignal = inferScenarioCluster(data, normalizedCountries, countryClusterMap, clusterMembers);

  if (isValidExistingClassification(data) && !REWRITE_EXISTING) {
    const regions = meta.scopeTier === 'regional'
      ? normalizeRegions(toArray(meta.region_tags))
      : normalizeRegions(toArray(meta.region_tags).concat(scenarioRegions));
    return {
      scopeTier: meta.scopeTier,
      scopeKey: meta.scopeKey,
      clusterId: normalizeString(meta.clusterId) || undefined,
      exclusivityReason: VALID_EXCLUSIVITY_REASONS.has(meta.exclusivityReason) ? meta.exclusivityReason : undefined,
      sourceKind,
      regionTags: regions,
      applicableCountries: meta.scopeTier === 'exclusive' ? normalizedCountries : undefined,
      confidence: 'high',
      manualReview: false,
      reasons: ['Existing scope metadata is already valid'],
      touchedFields: [],
      shouldWrite: false,
    };
  }

  if (normalizedCountries.length === 1) {
    const countryId = normalizedCountries[0];
    return {
      scopeTier: 'exclusive',
      scopeKey: `country:${countryId}`,
      clusterId: undefined,
      exclusivityReason: inferExclusivityReason(data),
      sourceKind,
      regionTags: scenarioRegions.length > 0 ? scenarioRegions : [getRegionForCountry(countryId)].filter(Boolean),
      applicableCountries: [countryId],
      confidence: 'high',
      manualReview: false,
      reasons: ['Single applicable country implies exclusive scope'],
      touchedFields: ['metadata.scopeTier', 'metadata.scopeKey', 'metadata.exclusivityReason', 'metadata.sourceKind'],
      shouldWrite: true,
    };
  }

  if (normalizedCountries.length > 1) {
    const countryRegions = uniqueStrings(normalizedCountries.map((countryId) => getRegionForCountry(countryId)).filter(Boolean));
    if (clusterSignal.clusterId) {
      return {
        scopeTier: 'cluster',
        scopeKey: `cluster:${clusterSignal.clusterId}`,
        clusterId: clusterSignal.clusterId,
        exclusivityReason: undefined,
        sourceKind,
        regionTags: scenarioRegions.length > 0 ? scenarioRegions : countryRegions,
        applicableCountries: undefined,
        confidence: clusterSignal.strength === 'high' ? 'high' : 'medium',
        manualReview: false,
        reasons: clusterSignal.reasons,
        touchedFields: ['metadata.scopeTier', 'metadata.scopeKey', 'metadata.clusterId', 'metadata.sourceKind'],
        shouldWrite: true,
      };
    }
    if (countryRegions.length === 1) {
      return {
        scopeTier: 'regional',
        scopeKey: `region:${countryRegions[0]}`,
        clusterId: undefined,
        exclusivityReason: undefined,
        sourceKind,
        regionTags: countryRegions,
        applicableCountries: undefined,
        confidence: 'high',
        manualReview: false,
        reasons: ['Applicable countries resolve to one canonical region'],
        touchedFields: ['metadata.scopeTier', 'metadata.scopeKey', 'metadata.region_tags', 'metadata.sourceKind'],
        shouldWrite: true,
      };
    }
    return {
      scopeTier: '',
      scopeKey: '',
      clusterId: undefined,
      exclusivityReason: undefined,
      sourceKind,
      regionTags: scenarioRegions,
      applicableCountries: normalizedCountries,
      confidence: 'low',
      manualReview: true,
      reasons: ['Multiple applicable countries span multiple regions without a coherent shared cluster'],
      touchedFields: [],
      shouldWrite: false,
    };
  }

  if (scenarioRegions.length > 0 && !clusterSignal.clusterId) {
    return {
      scopeTier: 'regional',
      scopeKey: `region:${scenarioRegions[0]}`,
      clusterId: undefined,
      exclusivityReason: undefined,
      sourceKind,
      regionTags: scenarioRegions,
      applicableCountries: undefined,
      confidence: 'high',
      manualReview: false,
      reasons: ['Scenario already carries regional metadata'],
      touchedFields: ['metadata.scopeTier', 'metadata.scopeKey', 'metadata.region_tags', 'metadata.sourceKind'],
      shouldWrite: true,
    };
  }

  if (clusterSignal.clusterId) {
    return {
      scopeTier: 'cluster',
      scopeKey: `cluster:${clusterSignal.clusterId}`,
      clusterId: clusterSignal.clusterId,
      exclusivityReason: undefined,
      sourceKind,
      regionTags: scenarioRegions,
      applicableCountries: undefined,
      confidence: clusterSignal.strength === 'high' ? 'high' : 'medium',
      manualReview: clusterSignal.strength === 'none',
      reasons: clusterSignal.reasons,
      touchedFields: ['metadata.scopeTier', 'metadata.scopeKey', 'metadata.clusterId', 'metadata.sourceKind'],
      shouldWrite: clusterSignal.strength !== 'none',
    };
  }

  if (regionalTextSignal && scenarioRegions.length > 0) {
    return {
      scopeTier: 'regional',
      scopeKey: scenarioRegions[0] ? `region:${scenarioRegions[0]}` : '',
      clusterId: undefined,
      exclusivityReason: undefined,
      sourceKind,
      regionTags: scenarioRegions,
      applicableCountries: undefined,
      confidence: scenarioRegions.length > 0 ? 'medium' : 'low',
      manualReview: scenarioRegions.length === 0,
      reasons: ['Narrative uses regional framing without enough country-level restriction'],
      touchedFields: scenarioRegions.length > 0 ? ['metadata.scopeTier', 'metadata.scopeKey', 'metadata.region_tags', 'metadata.sourceKind'] : [],
      shouldWrite: scenarioRegions.length > 0,
    };
  }

  return {
    scopeTier: 'universal',
    scopeKey: 'universal',
    clusterId: undefined,
    exclusivityReason: undefined,
    sourceKind,
    regionTags: [],
    applicableCountries: undefined,
    confidence: 'medium',
    manualReview: false,
    reasons: ['No durable country, region, or cluster restriction found; defaulting to universal'],
    touchedFields: ['metadata.scopeTier', 'metadata.scopeKey', 'metadata.sourceKind'],
    shouldWrite: true,
  };
}

function diffTouchedFields(data, proposal) {
  const meta = data?.metadata ?? {};
  const nextFields = [];
  if (meta.scopeTier !== proposal.scopeTier) nextFields.push('metadata.scopeTier');
  if (meta.scopeKey !== proposal.scopeKey) nextFields.push('metadata.scopeKey');
  if ((meta.clusterId ?? '') !== (proposal.clusterId ?? '')) nextFields.push('metadata.clusterId');
  if ((meta.exclusivityReason ?? '') !== (proposal.exclusivityReason ?? '')) nextFields.push('metadata.exclusivityReason');
  if ((meta.sourceKind ?? '') !== proposal.sourceKind) nextFields.push('metadata.sourceKind');

  const currentRegions = normalizeRegions(toArray(meta.region_tags));
  const nextRegions = uniqueStrings(proposal.regionTags ?? []);
  if (JSON.stringify(currentRegions) !== JSON.stringify(nextRegions)) nextFields.push('metadata.region_tags');

  const currentCountries = uniqueStrings(toArray(meta.applicable_countries).map(normalizeCountryId).filter(Boolean));
  const nextCountries = uniqueStrings((proposal.applicableCountries ?? []).map(normalizeCountryId).filter(Boolean));
  if (JSON.stringify(currentCountries) !== JSON.stringify(nextCountries)) nextFields.push('metadata.applicable_countries');

  return nextFields;
}

function buildWritePayload(data, proposal) {
  const meta = data?.metadata ?? {};
  const nextMetadata = {
    ...meta,
    scopeTier: proposal.scopeTier,
    scopeKey: proposal.scopeKey,
    sourceKind: proposal.sourceKind,
    scopeMigration: {
      version: BACKFILL_VERSION,
      script: SCRIPT_ID,
      migratedAt: admin.firestore.FieldValue.serverTimestamp(),
      confidence: proposal.confidence,
      reasons: proposal.reasons,
    },
  };

  if (proposal.clusterId) nextMetadata.clusterId = proposal.clusterId;
  else delete nextMetadata.clusterId;

  if (proposal.exclusivityReason) nextMetadata.exclusivityReason = proposal.exclusivityReason;
  else delete nextMetadata.exclusivityReason;

  if (proposal.regionTags && proposal.regionTags.length > 0) nextMetadata.region_tags = proposal.regionTags;
  else delete nextMetadata.region_tags;

  if (proposal.applicableCountries && proposal.applicableCountries.length > 0) nextMetadata.applicable_countries = proposal.applicableCountries;
  else if (proposal.scopeTier !== 'exclusive') delete nextMetadata.applicable_countries;

  return { metadata: nextMetadata };
}

function incrementBucket(store, key) {
  store[key] = (store[key] || 0) + 1;
}

async function main() {
  const catalog = await loadCountryCatalog(db, { forceRefresh: true });
  const countries = catalog?.countries ?? {};
  const { byCountry: countryClusterMap, clusterMembers } = buildCountryClusterMap(countries);

  const scenarioSnap = await db.collection('scenarios').get();
  const docs = scenarioSnap.docs.filter((doc) => {
    const data = doc.data() ?? {};
    if (!INCLUDE_INACTIVE && data?.is_active === false) return false;
    if (BUNDLE_FILTER && normalizeString(data?.metadata?.bundle) !== BUNDLE_FILTER) return false;
    return true;
  });
  const limitedDocs = LIMIT > 0 ? docs.slice(0, LIMIT) : docs;

  const summary = {
    scanned: limitedDocs.length,
    apply: APPLY,
    rewriteExisting: REWRITE_EXISTING,
    includeInactive: INCLUDE_INACTIVE,
    updatedCandidates: 0,
    manualReviewCount: 0,
    preservedValidExisting: 0,
    confidence: { high: 0, medium: 0, low: 0 },
  };

  const currentInventory = {};
  const proposedInventory = {};
  const scopeTierCounts = {};
  const sourceKindCounts = {};
  const bundleScopeTierCounts = {};
  const manualReview = [];
  const writePreview = [];

  let batch = db.batch();
  let batchCount = 0;
  let appliedWrites = 0;

  for (const doc of limitedDocs) {
    const data = doc.data() ?? {};
    const scenarioCountries = getScenarioCountries(data);
    const scenarioRegions = getScenarioRegions(data, scenarioCountries);
    const proposal = buildMigrationProposal(doc.id, data, scenarioCountries, scenarioRegions, countryClusterMap, clusterMembers);
    proposal.touchedFields = diffTouchedFields(data, proposal);
    proposal.shouldWrite = proposal.shouldWrite && proposal.touchedFields.length > 0;

    const currentScopeTier = VALID_SCOPE_TIERS.has(data?.metadata?.scopeTier) ? data.metadata.scopeTier : 'missing';
    const currentScopeKey = normalizeString(data?.metadata?.scopeKey) || 'missing';
    incrementBucket(currentInventory, `${normalizeString(data?.metadata?.bundle) || 'unknown'}|${currentScopeTier}|${currentScopeKey}`);

    if (!proposal.scopeTier || !proposal.scopeKey) {
      summary.manualReviewCount += 1;
      summary.confidence.low += 1;
      manualReview.push({
        id: doc.id,
        bundle: data?.metadata?.bundle ?? 'unknown',
        reasons: proposal.reasons,
        applicableCountries: scenarioCountries,
        regionTags: scenarioRegions,
      });
      continue;
    }

    if (!proposal.shouldWrite && isValidExistingClassification(data)) {
      summary.preservedValidExisting += 1;
    }

    summary.confidence[proposal.confidence] += 1;
    incrementBucket(scopeTierCounts, proposal.scopeTier);
    incrementBucket(sourceKindCounts, proposal.sourceKind);
    incrementBucket(bundleScopeTierCounts, `${normalizeString(data?.metadata?.bundle) || 'unknown'}|${proposal.scopeTier}`);
    incrementBucket(proposedInventory, `${normalizeString(data?.metadata?.bundle) || 'unknown'}|${proposal.scopeTier}|${proposal.scopeKey}`);

    if (proposal.manualReview) {
      summary.manualReviewCount += 1;
      manualReview.push({
        id: doc.id,
        bundle: data?.metadata?.bundle ?? 'unknown',
        reasons: proposal.reasons,
        proposedScopeTier: proposal.scopeTier,
        proposedScopeKey: proposal.scopeKey,
        applicableCountries: scenarioCountries,
        regionTags: proposal.regionTags,
      });
    }

    if (!proposal.shouldWrite) continue;

    summary.updatedCandidates += 1;
    writePreview.push({
      id: doc.id,
      bundle: data?.metadata?.bundle ?? 'unknown',
      scopeTier: proposal.scopeTier,
      scopeKey: proposal.scopeKey,
      sourceKind: proposal.sourceKind,
      confidence: proposal.confidence,
      touchedFields: proposal.touchedFields,
      reasons: proposal.reasons,
    });

    if (!APPLY || proposal.manualReview) continue;

    batch.set(doc.ref, buildWritePayload(data, proposal), { merge: true });
    batchCount += 1;
    appliedWrites += 1;

    if (batchCount >= 400) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (APPLY && batchCount > 0) {
    await batch.commit();
  }

  const clusterCountryCounts = Object.fromEntries(
    Object.entries(clusterMembers)
      .sort((left, right) => left[0].localeCompare(right[0]))
      .map(([clusterId, members]) => [clusterId, members.length])
  );

  console.log('SUMMARY', JSON.stringify({
    ...summary,
    appliedWrites,
    countryCatalogSource: catalog?.source ?? null,
  }, null, 2));
  console.log('SCOPE_TIER_COUNTS', JSON.stringify(scopeTierCounts, null, 2));
  console.log('SOURCE_KIND_COUNTS', JSON.stringify(sourceKindCounts, null, 2));
  console.log('BUNDLE_SCOPE_TIER_COUNTS', JSON.stringify(bundleScopeTierCounts, null, 2));
  console.log('CURRENT_INVENTORY', JSON.stringify(currentInventory, null, 2));
  console.log('PROPOSED_INVENTORY', JSON.stringify(proposedInventory, null, 2));
  console.log('CLUSTER_COUNTRY_COUNTS', JSON.stringify(clusterCountryCounts, null, 2));
  console.log('WRITE_PREVIEW', JSON.stringify(writePreview.slice(0, 100), null, 2));
  console.log('MANUAL_REVIEW', JSON.stringify(manualReview.slice(0, MANUAL_REVIEW_LIMIT), null, 2));
}

main().catch((error) => {
  console.error('[backfill-scenario-scope] Fatal error:', error?.stack || String(error));
  process.exit(1);
});