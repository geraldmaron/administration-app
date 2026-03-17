/**
 * Queues a scenario generation job in Firestore.
 * The onScenarioJobCreated trigger runs in Firebase and generates scenarios
 * (requires OPENAI_API_KEY and MOONSHOT_API_KEY in Firebase secrets).
 *
 * Usage: npx tsx scripts/generate-scenarios.ts [count] [bundle1] [bundle2]... [--regions=region1,region2]
 * Default count: 5. Uses first N bundles from world_state/bundles (standard_bundle_ids).
 * --regions: optional comma-separated canonical region IDs (e.g. caribbean, europe, africa)
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

function isValidBundleId(id: string): boolean {
  return VALID_BUNDLE_IDS.has(id);
}

async function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  const filteredArgv = argv.filter((a) => a !== '--dry-run');
  const count = Math.max(1, Math.min(50, parseInt(filteredArgv[0] || '5', 10) || 5));
  const explicitBundles = filteredArgv.filter((a) => typeof a === 'string' && isValidBundleId(a));

  // Parse optional --regions=africa,europe or --regions africa,europe flag
  const VALID_REGIONS = new Set([
    'africa', 'asia', 'caribbean', 'east_asia', 'europe', 'eurasia',
    'middle_east', 'north_america', 'oceania', 'south_america', 'south_asia', 'southeast_asia'
  ]);
  let requestedRegions: string[] | undefined;
  for (let i = 0; i < filteredArgv.length; i++) {
    const arg = filteredArgv[i];
    const match = arg.match(/^--regions(?:=(.+))?$/);
    if (match) {
      const regionStr = match[1] ?? filteredArgv[i + 1] ?? '';
      requestedRegions = regionStr.split(',').map(r => r.trim().toLowerCase()).filter(r => VALID_REGIONS.has(r));
      if (requestedRegions.length === 0) {
        console.warn(`Invalid or unrecognized regions: "${regionStr}". Valid: ${[...VALID_REGIONS].join(', ')}`);
        requestedRegions = undefined;
      }
      break;
    }
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

  const regionNote = requestedRegions?.length ? ` | regions: [${requestedRegions.join(', ')}]` : '';
  const preview = `${bundleIds.length} bundles (${bundleIds.join(', ')}), ${conceptsPerBundle} concept(s) each (~${bundleIds.length * conceptsPerBundle} scenarios total)${regionNote}`;

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
    const completed: number = data.completedCount ?? 0;
    const failed: number = data.failedCount ?? 0;
    const total: number = data.totalCount ?? data.count ?? 0;
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
