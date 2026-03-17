/**
 * Scenario Generation Job CLI
 *
 * Creates a Firestore `generation_jobs` document so the
 * `onScenarioJobCreated` cloud function can generate scenarios.
 *
 * Usage (from functions/):
 *
 *   pnpm dlx tsx src/tools/create-generation-job.ts \\
 *     --bundles politics \\
 *     --count 20 \\
 *     --mode manual
 *
 * Examples:
 *   # 20 total scenarios from the 'politics' bundle
 *   pnpm dlx tsx src/tools/create-generation-job.ts --bundles politics --count 20
 *
 *   # 5 scenarios per bundle for economy + military (10 total)
 *   pnpm dlx tsx src/tools/create-generation-job.ts --bundles economy,military --count 5
 *
 * NOTE: `count` is per-bundle. Total scenarios ~= bundles.length * count
 * (each scenario may have multiple acts depending on distributionConfig).
 */

import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';
import {
  createGenerationJob,
  type CreateJobOptions,
} from '../background-jobs';
import {
  ALL_BUNDLE_IDS,
  STANDARD_BUNDLE_IDS,
  type BundleId,
  isValidBundleId,
} from '../data/schemas/bundleIds';

interface CliArgs {
  bundles: 'all' | 'standard' | BundleId[];
  count: number;
  mode: 'news' | 'manual';
  description?: string;
  requestedBy?: string;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const getArg = (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    return idx >= 0 ? args[idx + 1] : undefined;
  };

  const bundlesRaw = getArg('--bundles') ?? 'standard';
  let bundles: 'all' | 'standard' | BundleId[];

  if (bundlesRaw === 'all' || bundlesRaw === 'standard') {
    bundles = bundlesRaw;
  } else {
    const parts = bundlesRaw.split(',').map((s) => s.trim()).filter(Boolean);
    const valid: BundleId[] = [];
    const invalid: string[] = [];
    for (const p of parts) {
      if (isValidBundleId(p)) {
        valid.push(p);
      } else {
        invalid.push(p);
      }
    }
    if (valid.length === 0) {
      console.error(
        `No valid bundle IDs in "--bundles ${bundlesRaw}". Valid: ${ALL_BUNDLE_IDS.join(
          ', '
        )}`
      );
      process.exit(1);
    }
    if (invalid.length > 0) {
      console.warn(
        `[create-generation-job] Ignoring invalid bundles: ${invalid.join(', ')}`
      );
    }
    bundles = valid;
  }

  const countRaw = getArg('--count') ?? '20';
  const count = Math.max(1, parseInt(countRaw, 10) || 20);

  const modeRaw = getArg('--mode') ?? 'manual';
  const mode: 'news' | 'manual' =
    modeRaw === 'news' || modeRaw === 'manual' ? modeRaw : 'manual';

  const description = getArg('--description');
  const requestedBy =
    getArg('--requestedBy') ??
    process.env.USER ??
    process.env.LOGNAME ??
    'cli:create-generation-job';

  return { bundles, count, mode, description, requestedBy };
}

function initializeAdmin(): admin.firestore.Firestore {
  if (admin.apps.length) {
    return admin.firestore();
  }

  const serviceAccountPath = path.join(
    __dirname,
    '..',
    '..',
    '..',
    'serviceAccountKey.json'
  );

  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(
      fs.readFileSync(serviceAccountPath, 'utf8')
    );
    console.log(
      `[create-generation-job] Initializing Firebase Admin with serviceAccountKey.json`
    );
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log(
      `[create-generation-job] Initializing Firebase Admin from GOOGLE_APPLICATION_CREDENTIALS`
    );
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  } else {
    console.error(
      '[create-generation-job] No Firebase credentials. Provide serviceAccountKey.json or set GOOGLE_APPLICATION_CREDENTIALS.'
    );
    process.exit(1);
  }

  return admin.firestore();
}

async function main() {
  const args = parseArgs();
  const db = initializeAdmin();

  let bundleSpec: CreateJobOptions['bundles'];
  if (args.bundles === 'all' || args.bundles === 'standard') {
    bundleSpec = args.bundles;
  } else {
    bundleSpec = args.bundles;
  }

  console.log('=== Create Scenario Generation Job ===');
  console.log(`Bundles      : ${
    bundleSpec === 'all'
      ? 'all'
      : bundleSpec === 'standard'
      ? `standard (${STANDARD_BUNDLE_IDS.join(', ')})`
      : (bundleSpec as BundleId[]).join(', ')
  }`);
  console.log(`Count/bundle : ${args.count}`);
  console.log(`Mode         : ${args.mode}`);

  const { jobId, bundles, expectedScenarios } = await createGenerationJob(db, {
    bundles: bundleSpec,
    count: args.count,
    mode: args.mode,
    distributionConfig: { mode: 'auto', gameLength: 'medium' },
    requestedBy: args.requestedBy,
    priority: 'high',
    description: args.description ?? `CLI job: ${args.count} scenarios per bundle`,
  });

  console.log('\nJob created successfully.');
  console.log(`Job ID       : ${jobId}`);
  console.log(`Bundles used : ${bundles.join(', ')}`);
  console.log(`Approx. scenarios (acts) to generate: ${expectedScenarios}`);
  console.log(
    '\nThe Cloud Function `onScenarioJobCreated` will now generate scenarios in the background.'
  );
}

main().catch((err) => {
  console.error('[create-generation-job] FATAL:', err);
  process.exit(1);
});

