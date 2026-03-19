// @ts-nocheck
/**
 * repair-scenario-text-quality.ts
 *
 * One-time Firestore migration: normalizes stored scenario narrative text for
 * capitalization, token casing, whitespace/punctuation defects, and duplicated text.
 *
 * Run (dry run first):  npx tsx scripts/repair-scenario-text-quality.ts --dry-run
 * Run (live):           npx tsx scripts/repair-scenario-text-quality.ts
 */
import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { normalizeScenarioTextFields } from '../functions/src/lib/audit-rules.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PROJECT_ID = 'the-administration-3a072';
const sa = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'serviceAccountKey.json'), 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(sa), projectId: PROJECT_ID });
const db = admin.firestore();

const DRY_RUN = process.argv.includes('--dry-run');

function cloneDoc(data) {
  return JSON.parse(JSON.stringify(data));
}

function repairDoc(data) {
  const repaired = cloneDoc(data);
  const { fixed, fixes } = normalizeScenarioTextFields(repaired);
  const changedFields = {};

  if (data.title !== repaired.title) {
    changedFields.title = repaired.title;
  }
  if (data.description !== repaired.description) {
    changedFields.description = repaired.description;
  }
  if (JSON.stringify(data.options) !== JSON.stringify(repaired.options)) {
    changedFields.options = repaired.options;
  }

  return {
    fixes,
    changed: Object.keys(changedFields).length > 0,
    changedFields,
  };
}

async function main() {
  console.log(`=== Repair Scenario Text Quality${DRY_RUN ? ' [DRY RUN]' : ''} ===\n`);

  const PAGE_SIZE = 200;
  let cursor;
  let totalScanned = 0;
  let totalChanged = 0;
  let totalErrors = 0;
  const changeCounts = {};
  const pendingWrites = [];
  let pageCount = 0;

  const flushWrites = async () => {
    if (DRY_RUN || pendingWrites.length === 0) return;
    for (let i = 0; i < pendingWrites.length; i += 499) {
      const batch = db.batch();
      for (const { ref, data } of pendingWrites.slice(i, i + 499)) batch.update(ref, data);
      await batch.commit();
    }
    pendingWrites.length = 0;
  };

  while (true) {
    let query = db.collection('scenarios').orderBy('__name__').limit(PAGE_SIZE);
    if (cursor) query = query.startAfter(cursor);
    const snap = await query.get();
    if (snap.empty) break;
    pageCount += 1;
    console.log(`-- page ${pageCount}: ${snap.docs[0]?.id} -> ${snap.docs[snap.docs.length - 1]?.id}`);

    for (const doc of snap.docs) {
      totalScanned++;
      try {
        const { fixes, changed, changedFields } = repairDoc(doc.data());
        if (!changed) continue;

        totalChanged++;
        for (const fix of fixes) {
          changeCounts[fix] = (changeCounts[fix] || 0) + 1;
        }

        if (DRY_RUN) {
          console.log(`  [WOULD UPDATE] ${doc.id}`);
          for (const fix of fixes.slice(0, 8)) console.log(`    ${fix}`);
          const changedPaths = Object.keys(changedFields);
          if (changedPaths.length > 0) {
            console.log(`    fields: ${changedPaths.slice(0, 8).join(', ')}`);
            if (changedPaths.length > 8) console.log(`    ... and ${changedPaths.length - 8} more fields`);
          }
          if (fixes.length > 8) console.log(`    ... and ${fixes.length - 8} more`);
        } else {
          pendingWrites.push({ ref: doc.ref, data: changedFields });
          if (pendingWrites.length >= 400) await flushWrites();
        }
      } catch (err) {
        totalErrors++;
        console.error(`  ERROR ${doc.id}:`, err?.message ?? err);
      }
    }

    cursor = snap.docs[snap.docs.length - 1];
    if (snap.size < PAGE_SIZE) break;
  }

  await flushWrites();

  console.log('\n=== Summary ===');
  console.log(`Scanned:  ${totalScanned}`);
  console.log(`Updated:  ${totalChanged}${DRY_RUN ? ' (dry run — no writes made)' : ''}`);
  console.log(`Errors:   ${totalErrors}`);
  console.log('Top fixes:');
  for (const [fix, count] of Object.entries(changeCounts).sort((a, b) => b[1] - a[1]).slice(0, 20)) {
    console.log(`  ${count}x ${fix}`);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });