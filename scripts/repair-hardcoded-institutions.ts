// @ts-nocheck
/**
 * repair-hardcoded-institutions.ts
 *
 * One-time Firestore migration: finds scenarios containing hardcoded
 * ministry/institution phrases and replaces them with the correct {token} forms.
 *
 * Run (dry run first):  npx tsx scripts/repair-hardcoded-institutions.ts --dry-run
 * Run (live):           npx tsx scripts/repair-hardcoded-institutions.ts
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

// Article-form patterns (with "the") must precede bare patterns so that
// "the Justice Ministry" doesn't get partially matched by the bare "justice ministry" rule first.
const INSTITUTION_REPLACEMENTS = [
  {
    label: 'justice_role',
    patterns: [
      { regex: /\bthe\s+justice\s+ministry\b/gi, replacement: '{the_justice_role}' },
      { regex: /\bthe\s+ministry\s+of\s+justice\b/gi, replacement: '{the_justice_role}' },
      { regex: /\bthe\s+(?:department\s+of\s+justice|justice\s+department)\b/gi, replacement: '{the_justice_role}' },
      { regex: /\bjustice\s+ministry\b/gi, replacement: '{justice_role}' },
      { regex: /\bministry\s+of\s+justice\b/gi, replacement: '{justice_role}' },
      { regex: /\b(?:department\s+of\s+justice|justice\s+department)\b/gi, replacement: '{justice_role}' },
    ],
  },
  {
    label: 'finance_role',
    patterns: [
      { regex: /\bthe\s+finance\s+ministry\b/gi, replacement: '{the_finance_role}' },
      { regex: /\bthe\s+ministry\s+of\s+finance\b/gi, replacement: '{the_finance_role}' },
      { regex: /\bthe\s+(?:treasury\s+department|department\s+of\s+the\s+treasury)\b/gi, replacement: '{the_finance_role}' },
      { regex: /\bfinance\s+ministry\b/gi, replacement: '{finance_role}' },
      { regex: /\bministry\s+of\s+finance\b/gi, replacement: '{finance_role}' },
      { regex: /\b(?:treasury\s+department|department\s+of\s+the\s+treasury)\b/gi, replacement: '{finance_role}' },
    ],
  },
  {
    label: 'defense_role',
    patterns: [
      { regex: /\bthe\s+(?:defense|defence)\s+ministry\b/gi, replacement: '{the_defense_role}' },
      { regex: /\bthe\s+ministry\s+of\s+(?:defense|defence)\b/gi, replacement: '{the_defense_role}' },
      { regex: /\bthe\s+department\s+of\s+(?:defense|defence)\b/gi, replacement: '{the_defense_role}' },
      { regex: /\b(?:defense|defence)\s+ministry\b/gi, replacement: '{defense_role}' },
      { regex: /\bministry\s+of\s+(?:defense|defence)\b/gi, replacement: '{defense_role}' },
      { regex: /\bdepartment\s+of\s+(?:defense|defence)\b/gi, replacement: '{defense_role}' },
    ],
  },
  {
    label: 'interior_role',
    patterns: [
      { regex: /\bthe\s+interior\s+ministry\b/gi, replacement: '{the_interior_role}' },
      { regex: /\bthe\s+ministry\s+of\s+(?:interior|the\s+interior)\b/gi, replacement: '{the_interior_role}' },
      { regex: /\bthe\s+home\s+office\b/gi, replacement: '{the_interior_role}' },
      { regex: /\bthe\s+department\s+of\s+homeland\s+security\b/gi, replacement: '{the_interior_role}' },
      { regex: /\binterior\s+ministry\b/gi, replacement: '{interior_role}' },
      { regex: /\bministry\s+of\s+(?:interior|the\s+interior)\b/gi, replacement: '{interior_role}' },
      { regex: /\bhome\s+office\b/gi, replacement: '{interior_role}' },
      { regex: /\bdepartment\s+of\s+homeland\s+security\b/gi, replacement: '{interior_role}' },
    ],
  },
  {
    label: 'foreign_affairs_role',
    patterns: [
      { regex: /\bthe\s+foreign\s+ministry\b/gi, replacement: '{the_foreign_affairs_role}' },
      { regex: /\bthe\s+ministry\s+of\s+foreign\s+affairs\b/gi, replacement: '{the_foreign_affairs_role}' },
      { regex: /\bthe\s+(?:state\s+department|department\s+of\s+state)\b/gi, replacement: '{the_foreign_affairs_role}' },
      { regex: /\bthe\s+foreign\s+office\b/gi, replacement: '{the_foreign_affairs_role}' },
      { regex: /\bforeign\s+ministry\b/gi, replacement: '{foreign_affairs_role}' },
      { regex: /\bministry\s+of\s+foreign\s+affairs\b/gi, replacement: '{foreign_affairs_role}' },
      { regex: /\b(?:state\s+department|department\s+of\s+state)\b/gi, replacement: '{foreign_affairs_role}' },
      { regex: /\bforeign\s+office\b/gi, replacement: '{foreign_affairs_role}' },
    ],
  },
  {
    label: 'health_role',
    patterns: [
      { regex: /\bthe\s+health\s+ministry\b/gi, replacement: '{the_health_role}' },
      { regex: /\bthe\s+ministry\s+of\s+health\b/gi, replacement: '{the_health_role}' },
      { regex: /\bthe\s+department\s+of\s+health\b/gi, replacement: '{the_health_role}' },
      { regex: /\bhealth\s+ministry\b/gi, replacement: '{health_role}' },
      { regex: /\bministry\s+of\s+health\b/gi, replacement: '{health_role}' },
      { regex: /\bdepartment\s+of\s+health\b/gi, replacement: '{health_role}' },
    ],
  },
  {
    label: 'education_role',
    patterns: [
      { regex: /\bthe\s+education\s+ministry\b/gi, replacement: '{the_education_role}' },
      { regex: /\bthe\s+ministry\s+of\s+education\b/gi, replacement: '{the_education_role}' },
      { regex: /\bthe\s+department\s+of\s+education\b/gi, replacement: '{the_education_role}' },
      { regex: /\beducation\s+ministry\b/gi, replacement: '{education_role}' },
      { regex: /\bministry\s+of\s+education\b/gi, replacement: '{education_role}' },
      { regex: /\bdepartment\s+of\s+education\b/gi, replacement: '{education_role}' },
    ],
  },
  {
    label: 'commerce_role',
    patterns: [
      { regex: /\bthe\s+commerce\s+ministry\b/gi, replacement: '{the_commerce_role}' },
      { regex: /\bthe\s+ministry\s+of\s+commerce\b/gi, replacement: '{the_commerce_role}' },
      { regex: /\bthe\s+department\s+of\s+commerce\b/gi, replacement: '{the_commerce_role}' },
      { regex: /\bcommerce\s+ministry\b/gi, replacement: '{commerce_role}' },
      { regex: /\bministry\s+of\s+commerce\b/gi, replacement: '{commerce_role}' },
      { regex: /\bdepartment\s+of\s+commerce\b/gi, replacement: '{commerce_role}' },
    ],
  },
  {
    label: 'labor_role',
    patterns: [
      { regex: /\bthe\s+labou?r\s+ministry\b/gi, replacement: '{the_labor_role}' },
      { regex: /\bthe\s+ministry\s+of\s+labou?r\b/gi, replacement: '{the_labor_role}' },
      { regex: /\bthe\s+department\s+of\s+labor\b/gi, replacement: '{the_labor_role}' },
      { regex: /\blabou?r\s+ministry\b/gi, replacement: '{labor_role}' },
      { regex: /\bministry\s+of\s+labou?r\b/gi, replacement: '{labor_role}' },
      { regex: /\bdepartment\s+of\s+labor\b/gi, replacement: '{labor_role}' },
    ],
  },
  {
    label: 'energy_role',
    patterns: [
      { regex: /\bthe\s+energy\s+ministry\b/gi, replacement: '{the_energy_role}' },
      { regex: /\bthe\s+ministry\s+of\s+energy\b/gi, replacement: '{the_energy_role}' },
      { regex: /\bthe\s+department\s+of\s+energy\b/gi, replacement: '{the_energy_role}' },
      { regex: /\benergy\s+ministry\b/gi, replacement: '{energy_role}' },
      { regex: /\bministry\s+of\s+energy\b/gi, replacement: '{energy_role}' },
      { regex: /\bdepartment\s+of\s+energy\b/gi, replacement: '{energy_role}' },
    ],
  },
  {
    label: 'environment_role',
    patterns: [
      { regex: /\bthe\s+environment\s+ministry\b/gi, replacement: '{the_environment_role}' },
      { regex: /\bthe\s+ministry\s+of\s+(?:environment|the\s+environment)\b/gi, replacement: '{the_environment_role}' },
      { regex: /\bthe\s+environmental\s+protection\s+agency\b/gi, replacement: '{the_environment_role}' },
      { regex: /\benvironment\s+ministry\b/gi, replacement: '{environment_role}' },
      { regex: /\bministry\s+of\s+(?:environment|the\s+environment)\b/gi, replacement: '{environment_role}' },
      { regex: /\benvironmental\s+protection\s+agency\b/gi, replacement: '{environment_role}' },
    ],
  },
  {
    label: 'transport_role',
    patterns: [
      { regex: /\bthe\s+transport\s+ministry\b/gi, replacement: '{the_transport_role}' },
      { regex: /\bthe\s+ministry\s+of\s+transportation?\b/gi, replacement: '{the_transport_role}' },
      { regex: /\bthe\s+department\s+of\s+transportation\b/gi, replacement: '{the_transport_role}' },
      { regex: /\btransport\s+ministry\b/gi, replacement: '{transport_role}' },
      { regex: /\bministry\s+of\s+transportation?\b/gi, replacement: '{transport_role}' },
      { regex: /\bdepartment\s+of\s+transportation\b/gi, replacement: '{transport_role}' },
    ],
  },
  {
    label: 'agriculture_role',
    patterns: [
      { regex: /\bthe\s+agriculture\s+ministry\b/gi, replacement: '{the_agriculture_role}' },
      { regex: /\bthe\s+ministry\s+of\s+agriculture\b/gi, replacement: '{the_agriculture_role}' },
      { regex: /\bthe\s+department\s+of\s+agriculture\b/gi, replacement: '{the_agriculture_role}' },
      { regex: /\bagriculture\s+ministry\b/gi, replacement: '{agriculture_role}' },
      { regex: /\bministry\s+of\s+agriculture\b/gi, replacement: '{agriculture_role}' },
      { regex: /\bdepartment\s+of\s+agriculture\b/gi, replacement: '{agriculture_role}' },
    ],
  },
];

function applyReplacements(text: string): { result: string; changes: string[] } {
  let result = text;
  const changes: string[] = [];
  for (const { label, patterns } of INSTITUTION_REPLACEMENTS) {
    for (const { regex, replacement } of patterns) {
      const before = result;
      result = result.replace(regex, replacement);
      if (result !== before) changes.push(`${label}: "${regex.source}" → ${replacement}`);
    }
  }
  return { result, changes };
}

function repairDoc(data: any): { repaired: any; changes: string[]; changed: boolean } {
  const allChanges: string[] = [];
  const repaired = JSON.parse(JSON.stringify(data));

  const fix = (val: any, fieldPath: string): any => {
    if (typeof val !== 'string') return val;
    const { result, changes } = applyReplacements(val);
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
  console.log(`=== Repair Hardcoded Institution Phrases${DRY_RUN ? ' [DRY RUN]' : ''} ===\n`);

  const PAGE_SIZE = 200;
  let cursor: any;
  let totalScanned = 0;
  let totalChanged = 0;
  let totalErrors = 0;
  const changeCounts: Record<string, number> = {};
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
          for (const c of changes) {
            const label = (c.match(/\[.*?\] ([^:]+):/) ?? [])[1]?.trim() ?? 'unknown';
            changeCounts[label] = (changeCounts[label] ?? 0) + 1;
          }
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
        console.error(`  ERROR ${doc.id}:`, err.message);
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
  if (Object.keys(changeCounts).length > 0) {
    console.log('\nChanges by token:');
    for (const [k, v] of Object.entries(changeCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${k}: ${v} scenario(s)`);
    }
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
