import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  createGenerationJob,
  getJobStatus,
  type CreateJobOptions,
  type GenerationJobData,
} from '../functions/src/background-jobs';
import { ALL_BUNDLE_IDS, isValidBundleId, type BundleId } from '../functions/src/data/schemas/bundleIds';
import { REGION_IDS } from '../functions/src/data/schemas/regions';
import {
  normalizeCountryIds,
  normalizeGenerationScope,
  normalizeRegionIds,
  type ScenarioExclusivityReason,
  type ScenarioScopeTier,
  type ScenarioSourceKind,
} from '../functions/src/shared/generation-contract';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VALID_REGIONS = new Set<string>(REGION_IDS);
const VALID_SCOPE_TIERS = new Set<ScenarioScopeTier>(['universal', 'regional', 'cluster', 'exclusive']);
const VALID_SOURCE_KINDS = new Set<ScenarioSourceKind>(['evergreen', 'news', 'neighbor', 'consequence']);
const VALID_EXCLUSIVITY_REASONS = new Set<ScenarioExclusivityReason>([
  'constitution',
  'historical',
  'bilateral_dispute',
  'unique_institution',
  'unique_military_doctrine',
]);

function initializeAdmin(): admin.firestore.Firestore {
  if (admin.apps.length) {
    return admin.firestore();
  }

  const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');
  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error('serviceAccountKey.json not found. This script requires local Firebase admin credentials.');
  }

  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'the-administration-3a072',
  });

  return admin.firestore();
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
  const items = value.split(',').map((item) => item.trim()).filter(Boolean);
  return items.length > 0 ? items : undefined;
}

async function resolveDefaultBundles(db: admin.firestore.Firestore): Promise<BundleId[]> {
  const bundlesSnap = await db.doc('world_state/bundles').get();
  if (!bundlesSnap.exists) {
    throw new Error('world_state/bundles not found. Run seed-app-config first.');
  }

  const data = bundlesSnap.data();
  const standard = data?.standard_bundle_ids;
  const all = data?.all_bundle_ids;
  const rawIds = Array.isArray(standard) && standard.length > 0 ? standard : (Array.isArray(all) ? all : []);
  const bundleIds = rawIds.filter((id: string): id is BundleId => isValidBundleId(id));

  if (bundleIds.length === 0) {
    throw new Error(`No valid bundle IDs in world_state/bundles. Valid bundles: ${ALL_BUNDLE_IDS.join(', ')}`);
  }

  return bundleIds;
}

async function main() {
  const db = initializeAdmin();
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  const filteredArgv = argv.filter((arg) => arg !== '--dry-run');
  const count = Math.max(1, Math.min(50, parseInt(filteredArgv[0] || '5', 10) || 5));
  const explicitBundles = filteredArgv.filter((arg): arg is BundleId => typeof arg === 'string' && isValidBundleId(arg));

  const regionStr = getArgValue(filteredArgv, '--regions');
  const requestedRegions = normalizeRegionIds(parseCsv(regionStr)).filter((region) => VALID_REGIONS.has(region));
  if (regionStr && requestedRegions.length === 0) {
    console.warn(`Invalid or unrecognized regions: "${regionStr}". Valid: ${[...VALID_REGIONS].join(', ')}`);
  }

  const scopeTierArg = getArgValue(filteredArgv, '--scope-tier')?.trim().toLowerCase();
  const scopeTier = scopeTierArg && VALID_SCOPE_TIERS.has(scopeTierArg as ScenarioScopeTier)
    ? (scopeTierArg as ScenarioScopeTier)
    : undefined;
  if (scopeTierArg && !scopeTier) {
    console.error(`Invalid --scope-tier: "${scopeTierArg}". Valid: ${[...VALID_SCOPE_TIERS].join(', ')}`);
    process.exit(1);
  }

  const sourceKindArg = getArgValue(filteredArgv, '--source-kind')?.trim().toLowerCase();
  const sourceKind = sourceKindArg && VALID_SOURCE_KINDS.has(sourceKindArg as ScenarioSourceKind)
    ? (sourceKindArg as ScenarioSourceKind)
    : undefined;
  if (sourceKindArg && !sourceKind) {
    console.error(`Invalid --source-kind: "${sourceKindArg}". Valid: ${[...VALID_SOURCE_KINDS].join(', ')}`);
    process.exit(1);
  }

  const exclusivityReasonArg = getArgValue(filteredArgv, '--exclusivity-reason')?.trim();
  const exclusivityReason = exclusivityReasonArg && VALID_EXCLUSIVITY_REASONS.has(exclusivityReasonArg as ScenarioExclusivityReason)
    ? (exclusivityReasonArg as ScenarioExclusivityReason)
    : undefined;
  if (exclusivityReasonArg && !exclusivityReason) {
    console.error(`Invalid --exclusivity-reason: "${exclusivityReasonArg}". Valid: ${[...VALID_EXCLUSIVITY_REASONS].join(', ')}`);
    process.exit(1);
  }

  const clusterId = getArgValue(filteredArgv, '--cluster-id')?.trim();
  const explicitScopeKey = getArgValue(filteredArgv, '--scope-key')?.trim();
  const description = getArgValue(filteredArgv, '--description')?.trim();
  const countries = normalizeCountryIds([
    ...(parseCsv(getArgValue(filteredArgv, '--countries')) ?? []),
    ...(parseCsv(getArgValue(filteredArgv, '--country')) ?? []),
  ]);

  const normalizedScope = normalizeGenerationScope({
    mode: 'manual',
    regions: requestedRegions,
    scopeTier,
    scopeKey: explicitScopeKey,
    clusterId,
    exclusivityReason,
    applicable_countries: countries,
    sourceKind,
  });

  if (!normalizedScope.ok || !normalizedScope.value) {
    console.error(normalizedScope.error ?? 'Invalid scope configuration.');
    process.exit(1);
  }

  const scope = normalizedScope.value;
  const bundleIds = explicitBundles.length > 0 ? explicitBundles : (await resolveDefaultBundles(db)).slice(0, count);
  const conceptsPerBundle = Math.max(1, Math.ceil(count / bundleIds.length));

  const jobOptions: CreateJobOptions = {
    bundles: bundleIds,
    count: conceptsPerBundle,
    mode: 'manual',
    distributionConfig: { mode: 'auto' },
    requestedBy: 'generate-scenarios.ts',
    priority: 'normal',
    ...(description ? { description } : {}),
    ...(scope.regions.length > 0 ? { regions: scope.regions, region: scope.regions[0] } : {}),
    scopeTier: scope.scopeTier,
    scopeKey: scope.scopeKey,
    ...(scope.clusterId ? { clusterId: scope.clusterId } : {}),
    ...(scope.exclusivityReason ? { exclusivityReason: scope.exclusivityReason } : {}),
    ...(scope.applicable_countries?.length ? { applicable_countries: scope.applicable_countries } : {}),
    sourceKind: scope.sourceKind,
  };

  const regionNote = scope.regions.length ? ` | regions: [${scope.regions.join(', ')}]` : '';
  const scopeNote = ` | scope: ${scope.scopeTier} (${scope.scopeKey})${scope.clusterId ? ` | cluster=${scope.clusterId}` : ''}${scope.applicable_countries?.length ? ` | countries=[${scope.applicable_countries.join(', ')}]` : ''}${scope.sourceKind ? ` | source=${scope.sourceKind}` : ''}`;
  const preview = `${bundleIds.length} bundles (${bundleIds.join(', ')}), ${conceptsPerBundle} concept(s) each (~${bundleIds.length * conceptsPerBundle} scenarios total)${regionNote}${scopeNote}`;

  if (dryRun) {
    console.log('[DRY RUN] Job payload (no write to Firestore):');
    console.log(JSON.stringify(jobOptions, null, 2));
    console.log(`\n[DRY RUN] Would queue: ${preview}`);
    return;
  }

  const { jobId } = await createGenerationJob(db, jobOptions);
  console.log(`Queued job ${jobId}: ${preview}`);
  console.log('Waiting for Firebase trigger...\n');

  await watchJob(db, jobId);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fmt(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function extractJobScenarioIds(data: GenerationJobData & { scenarioIds?: string[]; results?: Array<{ id?: string }> }): string[] {
  return data.createdScenarioIds || data.savedScenarioIds || data.scenarioIds ||
    (Array.isArray(data.results) ? data.results.map((result) => result?.id).filter((id): id is string => Boolean(id)) : []);
}

async function watchJob(db: admin.firestore.Firestore, jobId: string) {
  const timeoutMs = 10 * 60 * 1000;
  const start = Date.now();
  let lastStatus = '';
  let lastCompleted = -1;
  let lastFailed = -1;
  let triggerWarned = false;

  while (true) {
    const data = await getJobStatus(db, jobId);
    if (!data) {
      console.error(`generation_jobs/${jobId} not found`);
      process.exit(1);
    }

    const status = String(data.status || 'unknown');
    const ids = extractJobScenarioIds(data as GenerationJobData & { scenarioIds?: string[]; results?: Array<{ id?: string }> });
    const completed = data.completedCount ?? ids.length ?? 0;
    const failed = data.failedCount ?? 0;
    const total = data.totalCount ?? data.total ?? data.count ?? 0;
    const pct = total > 0 ? Math.round((100 * (completed + failed)) / total) : 0;
    const elapsedSec = ((Date.now() - start) / 1000).toFixed(0);
    const time = fmt(Date.now());

    if (status !== lastStatus) {
      if (status === 'running') {
        process.stdout.write(`  ${time}  ▶ Job started — generating ${total || '?'} scenario(s) across ${(data.bundles || []).join(', ')}\n`);
      } else if (status === 'completed') {
        process.stdout.write(`  ${time}  ✓ Job complete — ${completed} generated, ${failed} failed (${elapsedSec}s total)\n`);
      } else if (status === 'failed' || status === 'error') {
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

    if (['completed', 'failed', 'error', 'cancelled'].includes(status)) {
      break;
    }

    if (Date.now() - start > timeoutMs) {
      console.error(`\nTimed out waiting for job ${jobId} after ${timeoutMs / 1000}s`);
      process.exit(1);
    }

    await sleep(5000);
  }
}

function renderBar(done: number, total: number, width = 10): string {
  const filled = total > 0 ? Math.round((done / total) * width) : 0;
  return '▓'.repeat(filled) + '▒'.repeat(width - filled);
}

main().catch((error) => {
  console.error('Failed:', error);
  process.exit(1);
});
