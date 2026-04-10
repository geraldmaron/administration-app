/**
 * Generate scenarios by queuing a generation job.
 * Run from functions/:  npx tsx src/scripts/generate.ts <count> [bundleId...]
 * Examples:
 *   npx tsx src/scripts/generate.ts 3 authoritarian
 *   npx tsx src/scripts/generate.ts 10 economy politics military
 */
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import { createGenerationJob, getJobStatus } from '../background-jobs';
import { isValidBundleId, type BundleId } from '../data/schemas/bundleIds';

function loadEnv(): void {
  const envPaths = ['.env.cli', '.env.local', '.env'].map(f => path.join(__dirname, '..', '..', f));
  for (const p of envPaths) {
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq < 1) continue;
      const key = t.slice(0, eq).trim();
      const val = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (!(key in process.env)) process.env[key] = val;
    }
  }
}

loadEnv();

const serviceAccountPath = path.join(__dirname, '..', '..', '..', 'serviceAccountKey.json');
if (!admin.apps.length) {
  const sa = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  admin.initializeApp({ credential: admin.credential.cert(sa), projectId: 'the-administration-3a072' });
}
const db = admin.firestore();

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function watchJob(jobId: string): Promise<void> {
  const start = Date.now();
  let lastStatus = '';
  while (true) {
    const status = await getJobStatus(db, jobId);
    if (!status) { await sleep(3000); continue; }
    const { state, completed, total, failed } = status as any;
    const elapsed = Math.round((Date.now() - start) / 1000);
    const progress = total ? `${completed ?? 0}/${total}` : '…';
    if (state !== lastStatus) {
      console.log(`  [${elapsed}s] ${state} — ${progress} scenarios`);
      lastStatus = state;
    } else {
      process.stdout.write(`\r  [${elapsed}s] ${state} — ${progress}`);
    }
    if (state === 'completed') { console.log(`\nDone. ${completed} scenarios generated.`); return; }
    if (state === 'failed') { console.error(`\nJob failed. ${failed ?? 0} errors.`); process.exit(1); }
    await sleep(4000);
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const count = parseInt(argv[0], 10) || 5;
  const bundleArgs = argv.slice(1).filter(a => !a.startsWith('--'));
  const bundles = bundleArgs.filter((id): id is BundleId => isValidBundleId(id));

  if (bundleArgs.length > 0 && bundles.length === 0) {
    console.error(`Invalid bundle IDs: ${bundleArgs.join(', ')}`);
    process.exit(1);
  }

  if (bundles.length === 0) {
    console.error('Specify at least one bundle ID.');
    process.exit(1);
  }

  const conceptsPerBundle = Math.max(1, Math.ceil(count / bundles.length));
  console.log(`Queuing: ${bundles.join(', ')} — ${conceptsPerBundle} concept(s) each (~${bundles.length * conceptsPerBundle} scenarios)\n`);

  const { jobId } = await createGenerationJob(db, {
    bundles,
    count: conceptsPerBundle,
    mode: 'manual',
    distributionConfig: { mode: 'auto' },
    requestedBy: 'generate.ts',
    priority: 'normal',
    scopeTier: 'universal',
    scopeKey: 'universal',
    sourceKind: 'evergreen',
  });

  console.log(`Job queued: ${jobId}`);
  await watchJob(jobId);
}

main().catch(e => { console.error(e); process.exit(1); });
