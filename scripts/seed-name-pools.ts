/*
 * Seeds Firestore `world_state/names` with regional pools for iOS cabinet / candidate name generation.
 * Usage: cd scripts && pnpm exec tsx seed-name-pools.ts [--dry-run]
 *
 * Requires `serviceAccountKey.json` at repo root (same as other seed scripts).
 */

import admin from 'firebase-admin';

import { REGION_NAME_POOLS } from './lib/world-name-pools';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id ?? 'the-administration-3a072',
  });
}

const db = admin.firestore();
const isDryRun = process.argv.includes('--dry-run');

const MIN_FIRST = 50;
const MIN_LAST = 40;

function validatePools(): void {
  for (const [region, pool] of Object.entries(REGION_NAME_POOLS)) {
    if (pool.first_male.length < MIN_FIRST) throw new Error(`${region}: first_male need ${MIN_FIRST}, got ${pool.first_male.length}`);
    if (pool.first_female.length < MIN_FIRST) throw new Error(`${region}: first_female need ${MIN_FIRST}, got ${pool.first_female.length}`);
    if (pool.first_neutral.length < MIN_FIRST) throw new Error(`${region}: first_neutral need ${MIN_FIRST}, got ${pool.first_neutral.length}`);
    if (pool.last.length < MIN_LAST) throw new Error(`${region}: last need ${MIN_LAST}, got ${pool.last.length}`);
  }
}

async function main(): Promise<void> {
  validatePools();

  const regions: Record<string, Record<string, unknown>> = {};
  for (const [regionId, pool] of Object.entries(REGION_NAME_POOLS)) {
    regions[regionId] = {
      first_male: pool.first_male,
      first_female: pool.first_female,
      first_neutral: pool.first_neutral,
      last: pool.last,
    };
  }

  const doc = { regions };

  if (isDryRun) {
    console.log('[dry-run] Would write world_state/names with regions:', Object.keys(regions).join(', '));
    return;
  }

  await db.collection('world_state').doc('names').set(doc, { merge: true });
  console.log('Updated world_state/names with', Object.keys(regions).length, 'regions.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
