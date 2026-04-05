/**
 * Deletes all country documents from Firestore whose ID is not in the
 * canonical 20-country list.
 *
 * Usage: npx tsx functions/src/scripts/delete-excess-countries.ts [--write]
 */

import admin from 'firebase-admin';

const WRITE = process.argv.includes('--write');

if (!admin.apps.length) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const serviceAccount = require('../../../serviceAccountKey.json');
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

const KEEP = new Set([
  'us', 'cn', 'ru', 'gb', 'fr', 'de', 'jp', 'in',
  'br', 'au', 'ca', 'sa', 'il', 'ir', 'kr', 'mx',
  'tr', 'ng', 'gh', 'jm', 'ua', 'za', 'id', 'sg', 'eg',
]);

async function run(): Promise<void> {
  const snap = await db.collection('countries').get();
  const toDelete = snap.docs.filter(d => !KEEP.has(d.id));

  if (toDelete.length === 0) {
    console.log('No excess countries found.');
    return;
  }

  console.log(`Found ${toDelete.length} countries to delete: ${toDelete.map(d => d.id).join(', ')}`);

  if (!WRITE) {
    console.log('\nDry run — pass --write to delete.');
    return;
  }

  for (const doc of toDelete) {
    await doc.ref.delete();
    console.log(`  ✓ deleted ${doc.id}`);
  }

  console.log(`\nDone. Deleted ${toDelete.length} countries.`);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
