/**
 * Backfill scenario timestamps.
 *
 * Fixes documents where `created_at` is an empty object `{}` (not a Firestore Timestamp).
 * Uses the Firestore document's native `createTime` metadata as the authoritative value.
 *
 * Run: npx ts-node scripts/backfill-scenario-timestamps.ts [--dry-run]
 */

import * as admin from 'firebase-admin';
import * as path from 'path';

const isDryRun = process.argv.includes('--dry-run');

const serviceAccount = require(path.resolve(__dirname, '../serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

function isBadTimestamp(value: unknown): boolean {
  if (!value) return false;
  if (typeof value !== 'object') return false;
  if (typeof (value as any).toDate === 'function') return false; // valid Timestamp
  return true; // plain object (e.g. {})
}

async function run() {
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`);
  let cursor: FirebaseFirestore.DocumentSnapshot | null = null;
  let totalScanned = 0;
  let totalFixed = 0;

  do {
    let query: FirebaseFirestore.Query = db.collection('scenarios').limit(500);
    if (cursor) query = query.startAfter(cursor);

    const snap = await query.get();
    if (snap.empty) break;
    cursor = snap.docs[snap.docs.length - 1];
    totalScanned += snap.size;

    const batch = db.batch();
    let batchCount = 0;

    for (const doc of snap.docs) {
      const data = doc.data();
      if (!isBadTimestamp(data.created_at)) continue;

      const createTime = doc.createTime;
      if (!createTime) {
        console.warn(`[SKIP] ${doc.id} — no createTime metadata available`);
        continue;
      }

      console.log(`[${isDryRun ? 'DRY' : 'FIX'}] ${doc.id} → ${createTime.toDate().toISOString()}`);
      if (!isDryRun) {
        batch.update(doc.ref, { created_at: createTime });
        batchCount++;
      }
      totalFixed++;
    }

    if (!isDryRun && batchCount > 0) {
      await batch.commit();
    }

    if (snap.size < 500) break;
  } while (true);

  console.log(`\nScanned: ${totalScanned} | Fixed: ${totalFixed}${isDryRun ? ' (dry run)' : ''}`);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
