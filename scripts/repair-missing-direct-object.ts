// @ts-nocheck
/**
 * repair-missing-direct-object.ts
 *
 * One-time Firestore migration: finds scenarios containing
 * “You direct to” / “you direct to” / “You directed to” / “you directed to”
 * without a direct object, and patches those phrases to include a default
 * recipient: “your cabinet”.
 *
 * Run (dry run first):  npx tsx scripts/repair-missing-direct-object.ts --dry-run
 * Run (live):           npx tsx scripts/repair-missing-direct-object.ts
 */
import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PROJECT_ID = 'the-administration-3a072';
const sa = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'serviceAccountKey.json'), 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(sa), projectId: PROJECT_ID });
const db = admin.firestore();

const DRY_RUN = process.argv.includes('--dry-run');

const MISSING_DIRECT_OBJECT_REGEX = /\b(You|you) direct(?:ed)? to\b/g;

function repairText(text: string): { result: string; changes: string[] } {
  if (typeof text !== 'string') return { result: text, changes: [] };

  const changes: string[] = [];

  const result = text.replace(MISSING_DIRECT_OBJECT_REGEX, (match, p1, offset, full) => {
    const after = full.slice(offset + match.length);
    const nextNonSpaceMatch = after.match(/\S/);

    const shouldAdd = (() => {
      // Nothing after the phrase -> missing object
      if (!nextNonSpaceMatch) return true;

      const rest = after.slice(nextNonSpaceMatch.index);
      // Already has the default recipient
      if (/^your\b/i.test(rest)) return false;

      // If the next non-space character is punctuation, we assume no object is present
      if (/^[.!?;,]/.test(rest)) return true;

      return false;
    })();

    if (!shouldAdd) return match;

    changes.push(`Added "your cabinet" after \"${match}\"`);
    return `${match} your cabinet`;
  });

  return { result, changes };
}

function repairDoc(data: any): { repaired: any; changes: string[]; changed: boolean } {
  const allChanges: string[] = [];
  const repaired = JSON.parse(JSON.stringify(data));

  const fix = (val: any, fieldPath: string): any => {
    if (typeof val !== 'string') return val;
    const { result, changes } = repairText(val);
    if (changes.length > 0) allChanges.push(...changes.map(c => `[${fieldPath}] ${c}`));
    return result;
  };

  repaired.title = fix(repaired.title, 'title');
  repaired.description = fix(repaired.description, 'description');

  for (let i = 0; i < (repaired.options ?? []).length; i++) {
    const opt = repaired.options[i];
    const oid = `options[${i}]`;
    opt.text = fix(opt.text, `${oid}.text`);
    opt.outcomeHeadline = fix(opt.outcomeHeadline, `${oid}.outcomeHeadline`);
    opt.outcomeSummary = fix(opt.outcomeSummary, `${oid}.outcomeSummary`);
    opt.outcomeContext = fix(opt.outcomeContext, `${oid}.outcomeContext`);

    for (let j = 0; j < (opt.advisorFeedback ?? []).length; j++) {
      const fb = opt.advisorFeedback[j];
      fb.feedback = fix(fb.feedback, `${oid}.advisorFeedback[${j}].feedback`);
    }
  }

  return { repaired, changes: allChanges, changed: allChanges.length > 0 };
}

async function main() {
  console.log(`=== Repair missing direct object ("your cabinet")${DRY_RUN ? ' [DRY RUN]' : ''} ===\n`);

  const PAGE_SIZE = 200;
  let cursor: any;
  let totalScanned = 0;
  let totalChanged = 0;
  let totalErrors = 0;
  const pendingWrites: Array<{ ref: any; data: any }> = [];

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

    for (const doc of snap.docs) {
      totalScanned++;
      try {
        const { repaired, changes, changed } = repairDoc(doc.data());
        if (changed) {
          totalChanged++;
          if (DRY_RUN) {
            console.log(`  [WOULD UPDATE] ${doc.id}`);
            for (const c of changes.slice(0, 5)) console.log(`    ${c}`);
            if (changes.length > 5) console.log(`    ... and ${changes.length - 5} more`);
          } else {
            pendingWrites.push({ ref: doc.ref, data: repaired });
            if (pendingWrites.length >= 400) await flushWrites();
          }
        }
      } catch (err: any) {
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
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
