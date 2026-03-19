/**
 * Queues a scenario generation job in Firestore.
 * The onScenarioJobCreated trigger runs in Firebase and generates scenarios
 * (requires OPENAI_API_KEY and MOONSHOT_API_KEY in Firebase secrets).
 *
 * Usage: npx tsx scripts/generate-scenarios.ts [count] [bundle1] [bundle2]... [--regions=region1,region2]
 * Default count: 5. Uses first N bundles from world_state/bundles (standard_bundle_ids).
 * --regions: optional comma-separated canonical region IDs (e.g. caribbean, europe, africa)
 * --scope-tier: universal | regional | cluster | exclusive
 * --cluster-id: required for cluster jobs
 * --countries: comma-separated country IDs for exclusive jobs
 * --country: single-country shorthand for exclusive jobs
 * --exclusivity-reason: required for exclusive jobs
 * --source-kind: evergreen | news | neighbor | consequence
 */

// @ts-nocheck
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import * as path from 'path';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceAccount = require(path.join(__dirname, '..', 'serviceAccountKey.json'));
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'the-administration-3a072',
  });
}

const db = admin.firestore();

const VALID_BUNDLE_IDS = new Set([
  'economy', 'politics', 'military', 'tech', 'environment', 'social', 'health',
  'diplomacy', 'justice', 'corruption', 'culture', 'infrastructure', 'resources', 'dick_mode'
]);
const VALID_REGIONS = new Set([
  'africa', 'asia', 'caribbean', 'east_asia', 'europe', 'eurasia',
  'middle_east', 'north_america', 'oceania', 'south_america', 'south_asia', 'southeast_asia'
]);
const VALID_SCOPE_TIERS = new Set(['universal', 'regional', 'cluster', 'exclusive']);
const VALID_SOURCE_KINDS = new Set(['evergreen', 'news', 'neighbor', 'consequence']);
const VALID_EXCLUSIVITY_REASONS = new Set([
  'constitution', 'historical', 'bilateral_dispute', 'unique_institution', 'unique_military_doctrine'
]);

function isValidBundleId(id: string): boolean {
  return VALID_BUNDLE_IDS.has(id);
}

function getArgValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index >= 0) return args[index + 1];
  const prefix = `${flag}=`;
  const entry = args.find((arg) => arg.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : undefined;
}

function parseCsv(value?: string): string[] | undefined {
  if (!value) return undefined;
  const items = value.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
  return items.length > 0 ? items : undefined;
}

function inferScopeKey(scopeTier: string | undefined, options: {
  regions?: string[];
  clusterId?: string;
  countries?: string[];
}): string | undefined {
  switch (scopeTier) {
    case 'regional':
      return options.regions?.[0] ? `region:${options.regions[0]}` : undefined;
    case 'cluster':
      return options.clusterId ? `cluster:${options.clusterId}` : undefined;
    case 'exclusive':
      return options.countries?.length === 1 ? `country:${options.countries[0]}` : undefined;
    case 'universal':
      return 'universal';
    default:
      return undefined;
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  const filteredArgv = argv.filter((a) => a !== '--dry-run');
  const count = Math.max(1, Math.min(50, parseInt(filteredArgv[0] || '5', 10) || 5));
  const explicitBundles = filteredArgv.filter((a) => typeof a === 'string' && isValidBundleId(a));

  const regionStr = getArgValue(filteredArgv, '--regions');
  const requestedRegions = parseCsv(regionStr)?.filter((region) => VALID_REGIONS.has(region));
  if (regionStr && (!requestedRegions || requestedRegions.length === 0)) {
    console.warn(`Invalid or unrecognized regions: "${regionStr}". Valid: ${[...VALID_REGIONS].join(', ')}`);
  }

  const scopeTierArg = getArgValue(filteredArgv, '--scope-tier')?.trim().toLowerCase();
  const scopeTier = scopeTierArg && VALID_SCOPE_TIERS.has(scopeTierArg) ? scopeTierArg : undefined;
  if (scopeTierArg && !scopeTier) {
    console.error(`Invalid --scope-tier: "${scopeTierArg}". Valid: ${[...VALID_SCOPE_TIERS].join(', ')}`);
    process.exit(1);
  }

  const sourceKindArg = getArgValue(filteredArgv, '--source-kind')?.trim().toLowerCase();
  const sourceKind = sourceKindArg && VALID_SOURCE_KINDS.has(sourceKindArg) ? sourceKindArg : undefined;
  if (sourceKindArg && !sourceKind) {
    console.error(`Invalid --source-kind: "${sourceKindArg}". Valid: ${[...VALID_SOURCE_KINDS].join(', ')}`);
    process.exit(1);
  }

  const exclusivityReasonArg = getArgValue(filteredArgv, '--exclusivity-reason')?.trim();
  const exclusivityReason = exclusivityReasonArg && VALID_EXCLUSIVITY_REASONS.has(exclusivityReasonArg)
    ? exclusivityReasonArg
    : undefined;
  if (exclusivityReasonArg && !exclusivityReason) {
    console.error(`Invalid --exclusivity-reason: "${exclusivityReasonArg}". Valid: ${[...VALID_EXCLUSIVITY_REASONS].join(', ')}`);
    process.exit(1);
  }

  const clusterId = getArgValue(filteredArgv, '--cluster-id')?.trim();
  const explicitScopeKey = getArgValue(filteredArgv, '--scope-key')?.trim();
  const description = getArgValue(filteredArgv, '--description')?.trim();
  const countries = [
    ...(parseCsv(getArgValue(filteredArgv, '--countries')) ?? []),
    ...(parseCsv(getArgValue(filteredArgv, '--country')) ?? []),
  ].filter(Boolean);
  const scopeKey = explicitScopeKey ?? inferScopeKey(scopeTier, { regions: requestedRegions, clusterId, countries });

  if (scopeTier === 'regional' && (!requestedRegions || requestedRegions.length === 0)) {
    console.error('Regional jobs require --regions.');
    process.exit(1);
  }
  if (scopeTier === 'cluster' && !clusterId) {
    console.error('Cluster jobs require --cluster-id.');
    process.exit(1);
  }
  if (scopeTier === 'exclusive') {
    if (countries.length === 0) {
      console.error('Exclusive jobs require --country or --countries.');
      process.exit(1);
    }
    if (!exclusivityReason) {
      console.error('Exclusive jobs require --exclusivity-reason.');
      process.exit(1);
    }
  }
  if (scopeTier && !scopeKey) {
    console.error(`Unable to infer scopeKey for scope tier ${scopeTier}. Provide --scope-key explicitly.`);
    process.exit(1);
  }

  let bundleIds;
  if (explicitBundles.length > 0) {
    bundleIds = explicitBundles;
  } else {
    const bundlesSnap = await db.doc('world_state/bundles').get();
    if (!bundlesSnap.exists) {
      console.error('world_state/bundles not found. Run seed-app-config first.');
      process.exit(1);
    }
    const data = bundlesSnap.data();
    const standard = data?.standard_bundle_ids;
    const all = data?.all_bundle_ids;
    const rawIds = Array.isArray(standard) && standard.length > 0 ? standard : (Array.isArray(all) ? all : []);
    bundleIds = rawIds.filter((id: string) => isValidBundleId(id)).slice(0, count);
  }

  if (bundleIds.length === 0) {
    console.error('No valid bundle IDs in world_state/bundles.');
    process.exit(1);
  }

  // count = total desired scenarios; distribute evenly across selected bundles
  // e.g. count=5 with 5 bundles → 1 concept per bundle → ~5 scenarios
  // e.g. count=10 with 5 bundles → 2 concepts per bundle → ~10 scenarios
  const conceptsPerBundle = Math.max(1, Math.ceil(count / bundleIds.length));

  const jobRef = db.collection('generation_jobs').doc();
  const jobData: any = {
    bundles: bundleIds,
    count: conceptsPerBundle,
    mode: 'manual',
    distributionConfig: { mode: 'auto' },
    requestedBy: 'generate-scenarios.ts',
    requestedAt: admin.firestore.Timestamp.now(),
    priority: 'normal',
    status: 'pending',
  };

  if (requestedRegions?.length) {
    jobData.regions = requestedRegions;
    jobData.region = requestedRegions[0];
  }
  if (scopeTier) jobData.scopeTier = scopeTier;
  if (scopeKey) jobData.scopeKey = scopeKey;
  if (clusterId) jobData.clusterId = clusterId;
  if (countries.length > 0) jobData.applicable_countries = countries;
  if (exclusivityReason) jobData.exclusivityReason = exclusivityReason;
  if (sourceKind) jobData.sourceKind = sourceKind;
  if (description) jobData.description = description;

  const regionNote = requestedRegions?.length ? ` | regions: [${requestedRegions.join(', ')}]` : '';
  const scopeNote = scopeTier
    ? ` | scope: ${scopeTier}${scopeKey ? ` (${scopeKey})` : ''}${clusterId ? ` | cluster=${clusterId}` : ''}${countries.length ? ` | countries=[${countries.join(', ')}]` : ''}${sourceKind ? ` | source=${sourceKind}` : ''}`
    : '';
  const preview = `${bundleIds.length} bundles (${bundleIds.join(', ')}), ${conceptsPerBundle} concept(s) each (~${bundleIds.length * conceptsPerBundle} scenarios total)${regionNote}${scopeNote}`;

  if (dryRun) {
    console.log('[DRY RUN] Job payload (no write to Firestore):');
    console.log(JSON.stringify(jobData, null, 2));
    console.log(`\n[DRY RUN] Would queue: ${preview}`);
    return;
  }

  await jobRef.set(jobData);

  console.log(`Queued job ${jobRef.id}: ${preview}`);
  console.log(`Waiting for Firebase trigger...\n`);

  await watchJob(jobRef.id);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function fmt(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function extractJobScenarioIds(data: any): string[] {
  return data.createdScenarioIds || data.savedScenarioIds || data.scenarioIds ||
    (Array.isArray(data.results) ? data.results.map((r: any) => r?.id).filter(Boolean) : []);
}

async function watchJob(jobId: string) {
  const timeoutMs = 10 * 60 * 1000;
  const start = Date.now();
  let lastStatus = '';
  let lastCompleted = -1;
  let lastFailed = -1;
  let triggerWarned = false;

  while (true) {
    const snap = await db.collection('generation_jobs').doc(jobId).get();
    if (!snap.exists) {
      console.error(`generation_jobs/${jobId} not found`);
      process.exit(1);
    }

    const data = snap.data() || {};
    const status: string = String(data.status || 'unknown');
    const ids = extractJobScenarioIds(data);
    const completed: number = data.completedCount ?? ids.length ?? 0;
    const failed: number = data.failedCount ?? 0;
    const total: number = data.totalCount ?? data.total ?? data.count ?? 0;
    const pct: number = total > 0 ? Math.round((100 * (completed + failed)) / total) : 0;
    const elapsedSec = ((Date.now() - start) / 1000).toFixed(0);
    const time = fmt(Date.now());

    if (status !== lastStatus) {
      if (status === 'running') {
        process.stdout.write(`  ${time}  ▶ Job started — generating ${total || '?'} scenario(s) across ${(data.bundles || []).join(', ')}\n`);
      } else if (status === 'completed') {
        process.stdout.write(`  ${time}  ✓ Job complete — ${completed} generated, ${failed} failed (${elapsedSec}s total)\n`);
      } else if (['failed', 'error'].includes(status)) {
        process.stdout.write(`  ${time}  ✗ Job ${status}: ${data.error || 'unknown error'}\n`);
      } else if (status === 'pending' && !triggerWarned) {
        process.stdout.write(`  ${time}  … Pending — waiting for Cloud Function trigger\n`);
        triggerWarned = true;
      }
      lastStatus = status;
    }

    if ((completed !== lastCompleted || failed !== lastFailed) && (completed + failed) > 0) {
      const bar = renderBar(completed + failed, total);
      const failStr = failed > 0 ? `, ${failed} failed` : '';
      process.stdout.write(`  ${time}  [${bar}] ${completed + failed}/${total} (${pct}%) — ${completed} saved${failStr}\n`);
      lastCompleted = completed;
      lastFailed = failed;
    }

    if (['completed', 'failed', 'error', 'cancelled'].includes(status)) break;

    if (Date.now() - start > timeoutMs) {
      console.error(`\nTimed out waiting for job ${jobId} after ${timeoutMs / 1000}s`);
      process.exit(1);
    }

    await sleep(5_000);
  }
}

function renderBar(done: number, total: number, width = 10): string {
  const filled = total > 0 ? Math.round((done / total) * width) : 0;
  return '▓'.repeat(filled) + '▒'.repeat(width - filled);
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
