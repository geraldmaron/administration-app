/**
 * Reports active scenario inventory and steady-state deficits by bundle and
 * scope tier using the approved target mix.
 *
 * Usage:
 *   npx tsx scripts/report-scenario-deficits.ts
 *   npx tsx scripts/report-scenario-deficits.ts --bundle military
 *   npx tsx scripts/report-scenario-deficits.ts --target-total-per-bundle 24
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
const { ALL_BUNDLE_IDS } = require(path.join(
  __dirname,
  '..',
  'functions',
  'src',
  'data',
  'schemas',
  'bundleIds.ts'
));
const { REGION_IDS } = require(path.join(
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

const TARGET_SHARE = {
  universal: 0.4,
  regional: 0.25,
  cluster: 0.25,
  exclusive: 0.1,
};

const SCOPE_TIERS = ['universal', 'regional', 'cluster', 'exclusive'];
const VALID_SOURCE_KINDS = new Set(['evergreen', 'news', 'neighbor', 'consequence']);
const EXCLUSIVE_PER_COUNTRY_PER_BUNDLE_CEILING = 12;
const NEWS_PER_BUNDLE_CEILING = 50;
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

function normalizeCountryId(value) {
  const candidate = normalizeString(value).toLowerCase();
  return /^[a-z]{2}$/i.test(candidate) ? candidate : '';
}

function getArgValue(flag) {
  const args = process.argv.slice(2);
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

const BUNDLE_FILTER = getArgValue('--bundle')?.trim();
const TARGET_TOTAL_PER_BUNDLE = Math.max(0, Number.parseInt(getArgValue('--target-total-per-bundle') ?? '0', 10) || 0);

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function uniqueStrings(values) {
  const seen = new Set();
  const results = [];
  for (const value of values) {
    const normalized = normalizeString(String(value));
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    results.push(normalized);
  }
  return results;
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) return [value];
  return [];
}

function incrementBucket(store, key, amount = 1) {
  store[key] = (store[key] || 0) + amount;
}

function computeTierTargets(total) {
  if (total <= 0) {
    return { universal: 0, regional: 0, cluster: 0, exclusive: 0 };
  }

  const base = {};
  let assigned = 0;
  for (const tier of SCOPE_TIERS) {
    const raw = total * TARGET_SHARE[tier];
    const rounded = Math.floor(raw);
    base[tier] = rounded;
    assigned += rounded;
  }

  const remainders = SCOPE_TIERS
    .map((tier) => ({ tier, remainder: (total * TARGET_SHARE[tier]) - base[tier] }))
    .sort((left, right) => right.remainder - left.remainder);

  let remaining = total - assigned;
  for (const entry of remainders) {
    if (remaining <= 0) break;
    base[entry.tier] += 1;
    remaining -= 1;
  }

  return base;
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
  const clusterMembers = {};
  const allCountryIds = [];

  for (const [countryId, country] of Object.entries(countries)) {
    const normalizedCountryId = normalizeCountryId(countryId);
    if (!normalizedCountryId) continue;
    allCountryIds.push(normalizedCountryId);
    const clusters = inferCountryClusters(country);
    for (const clusterId of clusters) {
      if (!clusterMembers[clusterId]) clusterMembers[clusterId] = [];
      clusterMembers[clusterId].push(normalizedCountryId);
    }
  }

  for (const clusterId of Object.keys(clusterMembers)) {
    clusterMembers[clusterId].sort();
  }

  return {
    clusterMembers,
    allCountryIds: allCountryIds.sort(),
  };
}

function inferSourceKindSuggestion(sourceKinds) {
  const news = sourceKinds.news || 0;
  const evergreen = sourceKinds.evergreen || 0;
  if (news === 0 && news < NEWS_PER_BUNDLE_CEILING) return 'news';
  if (evergreen === 0) return 'evergreen';
  if (news < evergreen && news < NEWS_PER_BUNDLE_CEILING) return 'news';
  return 'evergreen';
}

function buildDryRunCommand(bundle, deficit, args) {
  return ['npx', 'tsx', 'scripts/generate-scenarios.ts', String(deficit), bundle, '--dry-run', ...args].join(' ');
}

function pickRegionalCandidates(bundle, byBundleScopeKey) {
  return REGION_IDS
    .map((regionId) => {
      const scopeKey = `region:${regionId}`;
      return {
        regionId,
        scopeKey,
        currentCount: byBundleScopeKey[bundle]?.[scopeKey] || 0,
      };
    })
    .sort((left, right) => left.currentCount - right.currentCount || left.regionId.localeCompare(right.regionId));
}

function pickClusterCandidates(bundle, byBundleScopeKey, clusterMembers) {
  return Object.entries(clusterMembers)
    .filter(([, members]) => members.length >= 2)
    .map(([clusterId, members]) => {
      const scopeKey = `cluster:${clusterId}`;
      return {
        clusterId,
        scopeKey,
        memberCount: members.length,
        currentCount: byBundleScopeKey[bundle]?.[scopeKey] || 0,
      };
    })
    .sort((left, right) => left.currentCount - right.currentCount || right.memberCount - left.memberCount || left.clusterId.localeCompare(right.clusterId));
}

function pickExclusiveCandidates(bundle, exclusiveCountryCounts, allCountryIds) {
  return allCountryIds
    .map((countryId) => ({
      countryId,
      scopeKey: `country:${countryId}`,
      currentCount: exclusiveCountryCounts[bundle]?.[countryId] || 0,
    }))
    .filter((entry) => entry.currentCount < EXCLUSIVE_PER_COUNTRY_PER_BUNDLE_CEILING)
    .sort((left, right) => left.currentCount - right.currentCount || left.countryId.localeCompare(right.countryId));
}

function buildRecommendedJob(entry, byBundleScopeKey, byBundleSourceKind, exclusiveCountryCounts, clusterMembers, allCountryIds) {
  const sourceKind = inferSourceKindSuggestion(byBundleSourceKind[entry.bundle] || {});

  if (entry.scopeTier === 'universal') {
    const args = ['--scope-tier', 'universal', '--source-kind', sourceKind];
    return {
      ...entry,
      readyToQueue: true,
      sourceKindSuggestion: sourceKind,
      command: buildDryRunCommand(entry.bundle, entry.deficit, args),
    };
  }

  if (entry.scopeTier === 'regional') {
    const candidates = pickRegionalCandidates(entry.bundle, byBundleScopeKey).slice(0, 3);
    const primary = candidates[0];
    const args = primary
      ? ['--scope-tier', 'regional', '--regions', primary.regionId, '--source-kind', sourceKind]
      : [];
    return {
      ...entry,
      readyToQueue: Boolean(primary),
      sourceKindSuggestion: sourceKind,
      regionCandidates: candidates,
      command: primary ? buildDryRunCommand(entry.bundle, entry.deficit, args) : undefined,
    };
  }

  if (entry.scopeTier === 'cluster') {
    const candidates = pickClusterCandidates(entry.bundle, byBundleScopeKey, clusterMembers).slice(0, 3);
    const primary = candidates[0];
    const args = primary
      ? ['--scope-tier', 'cluster', '--cluster-id', primary.clusterId, '--source-kind', sourceKind]
      : [];
    return {
      ...entry,
      readyToQueue: Boolean(primary),
      sourceKindSuggestion: sourceKind,
      clusterCandidates: candidates,
      command: primary ? buildDryRunCommand(entry.bundle, entry.deficit, args) : undefined,
    };
  }

  const candidates = pickExclusiveCandidates(entry.bundle, exclusiveCountryCounts, allCountryIds).slice(0, 3);
  const primary = candidates[0];
  const args = primary
    ? ['--scope-tier', 'exclusive', '--country', primary.countryId, '--exclusivity-reason', '<reason>', '--source-kind', sourceKind]
    : [];
  return {
    ...entry,
    readyToQueue: false,
    sourceKindSuggestion: sourceKind,
    exclusiveCandidates: candidates,
    requiredField: 'exclusivityReason',
    commandTemplate: primary ? buildDryRunCommand(entry.bundle, entry.deficit, args) : undefined,
  };
}

async function main() {
  const { countries } = await loadCountryCatalog(db);
  const { clusterMembers, allCountryIds } = buildCountryClusterMap(countries);
  const scenarioSnap = await db.collection('scenarios').get();
  const docs = scenarioSnap.docs.filter((doc) => {
    const data = doc.data() ?? {};
    if (data?.is_active === false) return false;
    const bundle = normalizeString(data?.metadata?.bundle);
    if (!bundle) return false;
    if (BUNDLE_FILTER && bundle !== BUNDLE_FILTER) return false;
    return true;
  });

  const byBundle = {};
  const byBundleScopeKey = {};
  const byBundleSourceKind = {};
  const exclusiveCountryCounts = {};
  const scopeKeyCounts = {};

  for (const bundle of ALL_BUNDLE_IDS) {
    if (BUNDLE_FILTER && bundle !== BUNDLE_FILTER) continue;
    byBundle[bundle] = {
      total: 0,
      universal: 0,
      regional: 0,
      cluster: 0,
      exclusive: 0,
      missing: 0,
    };
    byBundleScopeKey[bundle] = {};
    byBundleSourceKind[bundle] = {};
    exclusiveCountryCounts[bundle] = {};
  }

  for (const doc of docs) {
    const data = doc.data() ?? {};
    const bundle = normalizeString(data?.metadata?.bundle);
    if (!byBundle[bundle]) continue;

    const scopeTier = SCOPE_TIERS.includes(data?.metadata?.scopeTier) ? data.metadata.scopeTier : 'missing';
    const scopeKey = normalizeString(data?.metadata?.scopeKey) || 'missing';
    const sourceKind = VALID_SOURCE_KINDS.has(data?.metadata?.sourceKind) ? data.metadata.sourceKind : 'unknown';

    byBundle[bundle].total += 1;
    byBundle[bundle][scopeTier] += 1;
    incrementBucket(byBundleScopeKey[bundle], scopeKey);
    incrementBucket(byBundleSourceKind[bundle], sourceKind);
    incrementBucket(scopeKeyCounts, `${bundle}|${scopeKey}`);

    if (scopeTier === 'exclusive') {
      const countries = toArray(data?.metadata?.applicable_countries).map((value) => normalizeString(String(value)).toLowerCase()).filter(Boolean);
      for (const countryId of countries) {
        incrementBucket(exclusiveCountryCounts[bundle], countryId);
      }
    }
  }

  const deficitReport = {};
  const ceilingWarnings = [];
  const bundleSummaries = [];

  for (const bundle of Object.keys(byBundle).sort()) {
    const counts = byBundle[bundle];
    const targetTotal = TARGET_TOTAL_PER_BUNDLE > 0 ? TARGET_TOTAL_PER_BUNDLE : counts.total;
    const targets = computeTierTargets(targetTotal);
    const deficits = {};
    const surplus = {};

    for (const tier of SCOPE_TIERS) {
      deficits[tier] = Math.max(0, targets[tier] - counts[tier]);
      surplus[tier] = Math.max(0, counts[tier] - targets[tier]);
    }

    deficitReport[bundle] = {
      currentTotal: counts.total,
      targetTotal,
      current: {
        universal: counts.universal,
        regional: counts.regional,
        cluster: counts.cluster,
        exclusive: counts.exclusive,
      },
      target: targets,
      deficits,
      surplus,
      sourceKinds: byBundleSourceKind[bundle],
      topScopeKeys: Object.entries(byBundleScopeKey[bundle])
        .sort((left, right) => right[1] - left[1])
        .slice(0, 10)
        .map(([scopeKey, count]) => ({ scopeKey, count })),
    };

    bundleSummaries.push({
      bundle,
      currentTotal: counts.total,
      targetTotal,
      deficits,
    });

    const newsCount = byBundleSourceKind[bundle].news || 0;
    if (newsCount > NEWS_PER_BUNDLE_CEILING) {
      ceilingWarnings.push({
        type: 'news_per_bundle',
        bundle,
        count: newsCount,
        ceiling: NEWS_PER_BUNDLE_CEILING,
      });
    }

    for (const [countryId, count] of Object.entries(exclusiveCountryCounts[bundle])) {
      if (count > EXCLUSIVE_PER_COUNTRY_PER_BUNDLE_CEILING) {
        ceilingWarnings.push({
          type: 'exclusive_per_country_per_bundle',
          bundle,
          countryId,
          count,
          ceiling: EXCLUSIVE_PER_COUNTRY_PER_BUNDLE_CEILING,
        });
      }
    }
  }

  const recommendedJobs = [];
  for (const entry of bundleSummaries) {
    for (const tier of SCOPE_TIERS) {
      const deficit = entry.deficits[tier];
      if (deficit <= 0) continue;
      recommendedJobs.push(buildRecommendedJob({
        bundle: entry.bundle,
        scopeTier: tier,
        deficit,
      }, byBundleScopeKey, byBundleSourceKind, exclusiveCountryCounts, clusterMembers, allCountryIds));
    }
  }

  console.log('SUMMARY', JSON.stringify({
    bundles: Object.keys(deficitReport).length,
    activeScenarios: docs.length,
    targetTotalPerBundle: TARGET_TOTAL_PER_BUNDLE || 'match-current',
    targetShare: TARGET_SHARE,
  }, null, 2));
  console.log('DEFICITS', JSON.stringify(deficitReport, null, 2));
  console.log('RECOMMENDED_JOBS', JSON.stringify(recommendedJobs, null, 2));
  console.log('CEILING_WARNINGS', JSON.stringify(ceilingWarnings, null, 2));
  console.log('SCOPE_KEY_COUNTS', JSON.stringify(scopeKeyCounts, null, 2));
}

main().catch((error) => {
  console.error('[report-scenario-deficits] Fatal error:', error?.stack || String(error));
  process.exit(1);
});