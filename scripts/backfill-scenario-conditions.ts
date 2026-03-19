// @ts-nocheck
/**
 * backfill-scenario-conditions.ts
 *
 * One-time Firestore migration: infers and writes `conditions` arrays to existing
 * scenarios that lack them, based on keyword matching against title + description.
 *
 * Only adds conditions to scenarios where conditions is currently empty/missing.
 * Non-destructive — will not overwrite existing conditions.
 *
 * Run (dry run):  npx tsx scripts/backfill-scenario-conditions.ts
 * Run (apply):    npx tsx scripts/backfill-scenario-conditions.ts --apply
 */
import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PROJECT_ID = 'the-administration-3a072';
const sa = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'serviceAccountKey.json'), 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(sa), projectId: PROJECT_ID });
const db = admin.firestore();

const APPLY = process.argv.includes('--apply');

interface Condition {
  metricId: string;
  min?: number;
  max?: number;
}

interface Rule {
  patterns: string[];
  condition: Condition;
}

// Canonical inference rules — ordered from most specific to least.
// First matching rule wins. Maximum 2 conditions applied per scenario.
const RULES: Rule[] = [
  {
    patterns: ['unemployment', 'jobless', 'mass layoff', 'mass layoffs', 'out of work', 'job losses', 'workers out'],
    condition: { metricId: 'metric_employment', max: 42 },
  },
  {
    patterns: ['labor shortage', 'labour shortage', 'worker shortage', 'full employment', 'overheating labor', 'tight labor'],
    condition: { metricId: 'metric_employment', min: 70 },
  },
  {
    patterns: ['economic collapse', 'recession', 'fiscal collapse', 'budget crisis', 'economic crisis', 'financial collapse', 'economic depression'],
    condition: { metricId: 'metric_economy', max: 38 },
  },
  {
    patterns: ['economic boom', 'growth boom', 'growth surge', 'budget surplus', 'economic surplus', 'record growth'],
    condition: { metricId: 'metric_economy', min: 62 },
  },
  {
    patterns: ['inflation crisis', 'price crisis', 'cost of living crisis', 'soaring prices', 'price surge', 'hyperinflation', 'rising inflation'],
    condition: { metricId: 'metric_inflation', min: 58 },
  },
  {
    patterns: ['crime wave', 'lawlessness', 'gang violence', 'crime surge', 'crime crisis', 'rising crime'],
    condition: { metricId: 'metric_crime', min: 60 },
  },
  {
    patterns: ['civil unrest', 'widespread unrest', 'riots', 'mass protests', 'street protests', 'public disorder'],
    condition: { metricId: 'metric_public_order', max: 40 },
  },
  {
    patterns: ['corruption scandal', 'systemic bribery', 'embezzlement', 'kickback', 'bribery ring', 'graft scandal'],
    condition: { metricId: 'metric_corruption', min: 55 },
  },
];

function inferConditions(data: Record<string, unknown>): Condition[] {
  const text = [
    typeof data.title === 'string' ? data.title : '',
    typeof data.description === 'string' ? data.description : '',
  ]
    .join(' ')
    .toLowerCase();

  const matched: Condition[] = [];
  const seenMetrics = new Set<string>();

  for (const rule of RULES) {
    if (matched.length >= 2) break;
    if (seenMetrics.has(rule.condition.metricId)) continue;
    if (rule.patterns.some((p) => text.includes(p))) {
      matched.push(rule.condition);
      seenMetrics.add(rule.condition.metricId);
    }
  }

  return matched;
}

async function main() {
  console.log(`=== Backfill Scenario Conditions${APPLY ? '' : ' [DRY RUN — pass --apply to write]'} ===\n`);

  const PAGE_SIZE = 200;
  let cursor: admin.firestore.QueryDocumentSnapshot | undefined;
  let totalScanned = 0;
  let totalSkipped = 0;
  let totalMatched = 0;
  let totalErrors = 0;
  const pendingWrites: { ref: admin.firestore.DocumentReference; data: Record<string, unknown> }[] = [];
  let pageCount = 0;

  const flushWrites = async () => {
    if (!APPLY || pendingWrites.length === 0) return;
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
        const data = doc.data();

        // Skip if already has conditions
        if (Array.isArray(data.conditions) && data.conditions.length > 0) {
          totalSkipped++;
          continue;
        }

        const inferred = inferConditions(data);
        if (inferred.length === 0) continue;

        totalMatched++;

        if (APPLY) {
          pendingWrites.push({ ref: doc.ref, data: { conditions: inferred } });
          if (pendingWrites.length >= 400) await flushWrites();
        } else {
          const labels = inferred.map((c) => {
            const parts = [c.metricId];
            if (c.min !== undefined) parts.push(`min:${c.min}`);
            if (c.max !== undefined) parts.push(`max:${c.max}`);
            return parts.join(' ');
          });
          console.log(`  [WOULD UPDATE] ${doc.id}`);
          console.log(`    title: ${String(data.title ?? '').slice(0, 60)}`);
          console.log(`    conditions: ${labels.join(', ')}`);
        }
      } catch (err) {
        totalErrors++;
        console.error(`  ERROR ${doc.id}:`, (err as Error)?.message ?? err);
      }
    }

    cursor = snap.docs[snap.docs.length - 1];
    if (snap.size < PAGE_SIZE) break;
  }

  await flushWrites();

  console.log('\n=== Summary ===');
  console.log(`Scanned:  ${totalScanned}`);
  console.log(`Skipped (already had conditions): ${totalSkipped}`);
  console.log(`Matched (inferred conditions):    ${totalMatched}`);
  if (totalErrors > 0) console.log(`Errors:   ${totalErrors}`);
  if (!APPLY) console.log('\nRun with --apply to write changes.');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
