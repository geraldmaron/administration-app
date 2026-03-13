/*
 * Patches missing judicial_role (and military_branch for Barbados) tokens
 * for countries that have fallbacks in processScenario but no Firebase-seeded values.
 *
 * Dry-run by default. Pass --write to apply changes.
 * Usage: pnpm -s tsx scripts/patch-missing-country-tokens.ts [--write]
 */

import admin from 'firebase-admin';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const serviceAccount = require('../serviceAccountKey.json');

const WRITE = process.argv.includes('--write');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'the-administration-3a072',
  });
}

const db = admin.firestore();

// Country-specific judicial role names sourced from each country's constitution / judiciary
const JUDICIAL_ROLE_PATCHES: Record<string, { judicial_role: string; military_branch?: string }> = {
  bb: { judicial_role: 'Supreme Court', military_branch: 'Barbados Defence Force' },
  tt: { judicial_role: 'Supreme Court' },
  tz: { judicial_role: 'Court of Appeal' },
  do: { judicial_role: 'Supreme Court' },
  ht: { judicial_role: 'Supreme Court' },
  hu: { judicial_role: 'Constitutional Court' },
  ug: { judicial_role: 'Supreme Court' },
  ec: { judicial_role: 'Constitutional Court' },
  uy: { judicial_role: 'Supreme Court' },
  ro: { judicial_role: 'Constitutional Court' },
  np: { judicial_role: 'Supreme Court' },
  jm: { judicial_role: 'Supreme Court' },
  fj: { judicial_role: 'Supreme Court' },
  nz: { judicial_role: 'Supreme Court' },
  bo: { judicial_role: 'Constitutional Tribunal' },
  bs: { judicial_role: 'Supreme Court' },
  ke: { judicial_role: 'Supreme Court' },
  sn: { judicial_role: 'Constitutional Council' },
  gh: { judicial_role: 'Supreme Court' },
  cm: { judicial_role: 'Supreme Court' },
  cr: { judicial_role: 'Supreme Court' },
  pa: { judicial_role: 'Supreme Court' },
  cu: { judicial_role: 'Supreme Court' },
  cz: { judicial_role: 'Constitutional Court' },
  pg: { judicial_role: 'Supreme Court' },
  tn: { judicial_role: 'Constitutional Court' },
  lk: { judicial_role: 'Supreme Court' },
  pt: { judicial_role: 'Constitutional Court' },
  ie: { judicial_role: 'Supreme Court' },
  at: { judicial_role: 'Constitutional Court' },
};

async function main() {
  const snap = await db.doc('world_state/countries').get();
  if (!snap.exists) throw new Error('world_state/countries not found');

  const data = snap.data() as Record<string, any>;
  const updates: Record<string, any> = {};
  const summary: string[] = [];

  for (const [countryId, patch] of Object.entries(JUDICIAL_ROLE_PATCHES)) {
    const country = data[countryId];
    if (!country) {
      console.warn(`Country ${countryId} not found in world_state/countries — skipping`);
      continue;
    }

    const tokens = country.tokens || {};
    const tokenUpdates: Record<string, string> = {};

    if (!tokens.judicial_role && patch.judicial_role) {
      tokenUpdates.judicial_role = patch.judicial_role;
    }
    if (patch.military_branch && !tokens.military_branch) {
      tokenUpdates.military_branch = patch.military_branch;
    }

    if (Object.keys(tokenUpdates).length === 0) continue;

    for (const [field, value] of Object.entries(tokenUpdates)) {
      updates[`${countryId}.tokens.${field}`] = value;
      summary.push(`${countryId} (${country.name}): tokens.${field} = "${value}"`);
    }
  }

  if (summary.length === 0) {
    console.log('No missing tokens found — all countries already patched.');
    return;
  }

  console.log(`\n${WRITE ? 'Applying' : '[dry-run] Would apply'} ${summary.length} token patches:\n`);
  summary.forEach(s => console.log(' ', s));

  if (WRITE) {
    await db.doc('world_state/countries').update(updates);
    console.log(`\n✓ Patched ${summary.length} tokens in world_state/countries`);
  } else {
    console.log('\nRun with --write to apply these patches.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
