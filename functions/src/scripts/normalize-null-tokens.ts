/**
 * Replaces "N/A" string token values with null across all country documents.
 *
 * Usage: npx tsx functions/src/scripts/normalize-null-tokens.ts [--write]
 */

import admin from 'firebase-admin';

const WRITE = process.argv.includes('--write');

if (!admin.apps.length) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const serviceAccount = require('../../../serviceAccountKey.json');
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

async function run(): Promise<void> {
  const snap = await db.collection('countries').get();
  console.log(`Scanning ${snap.size} country documents — ${WRITE ? 'WRITING' : 'DRY RUN'}`);

  let totalNulled = 0;
  for (const doc of snap.docs) {
    const data = doc.data();
    const tokens: Record<string, unknown> = data.tokens ?? {};
    const updates: Record<string, null> = {};

    for (const [key, value] of Object.entries(tokens)) {
      if (value === 'N/A' || value === 'n/a' || value === 'NA' || value === '') {
        updates[`tokens.${key}`] = null;
      }
    }

    if (Object.keys(updates).length === 0) continue;

    console.log(`  ${doc.id}: nulling ${Object.keys(updates).length} tokens — ${Object.keys(updates).join(', ')}`);
    totalNulled += Object.keys(updates).length;

    if (WRITE) {
      await doc.ref.update(updates as Record<string, null>);
    }
  }

  console.log(`\nDone — ${totalNulled} token values ${WRITE ? 'set to null' : 'would be nulled (dry run)'}`);
}

run().catch(err => { console.error(err); process.exit(1); });
