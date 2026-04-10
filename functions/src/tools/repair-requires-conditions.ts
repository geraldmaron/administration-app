import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

const isDryRun = process.argv.includes('--mode=dry-run');

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID || 'the-administration-3a072';
  const saKeyPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    path.join(__dirname, '../../../../serviceAccountKey.json');

  const appOptions: admin.AppOptions = { projectId };
  if (fs.existsSync(saKeyPath)) {
    const sa = JSON.parse(fs.readFileSync(saKeyPath, 'utf8'));
    appOptions.credential = admin.credential.cert(sa);
  }
  admin.initializeApp(appOptions);
}

const db = admin.firestore();

// Mirrors REQUIRES_CONDITION_MAP in scenario-audit.ts
const REQUIRES_CONDITION_MAP: Record<string, { metricId: string; op: 'min' | 'max'; threshold: number }> = {
  democratic_regime:    { metricId: 'metric_democracy', op: 'min', threshold: 40 },
  authoritarian_regime: { metricId: 'metric_democracy', op: 'max', threshold: 40 },
};

interface Condition {
  metricId: string;
  min?: number;
  max?: number;
}

async function run() {
  const snap = await db.collection('scenarios')
    .where('is_active', '==', true)
    .limit(500)
    .get();

  console.log(`Checking ${snap.size} active scenarios…`);

  const batches: admin.firestore.WriteBatch[] = [];
  let batch = db.batch();
  let batchOps = 0;
  let fixed = 0;
  let skipped = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const requires = (data.metadata?.requires ?? {}) as Record<string, boolean>;
    const conditions: Condition[] = Array.isArray(data.conditions) ? data.conditions : [];

    const toAdd: Condition[] = [];

    for (const [requiresKey, rule] of Object.entries(REQUIRES_CONDITION_MAP)) {
      if (!requires[requiresKey]) continue;
      const covered = conditions.some(
        (c) => c.metricId === rule.metricId && (rule.op === 'max' ? c.max !== undefined : c.min !== undefined),
      );
      if (!covered) {
        toAdd.push(rule.op === 'min'
          ? { metricId: rule.metricId, min: rule.threshold }
          : { metricId: rule.metricId, max: rule.threshold },
        );
      }
    }

    if (toAdd.length === 0) { skipped++; continue; }

    const updated = [...conditions, ...toAdd];
    console.log(`${isDryRun ? '[DRY] ' : ''}${doc.id}: adding ${toAdd.map((c) => `${c.metricId} ${c.min !== undefined ? `>= ${c.min}` : `<= ${c.max}`}`).join(', ')}`);

    if (!isDryRun) {
      batch.update(doc.ref, { conditions: updated });
      batchOps++;
      if (batchOps === 499) {
        batches.push(batch);
        batch = db.batch();
        batchOps = 0;
      }
    }
    fixed++;
  }

  if (!isDryRun && batchOps > 0) batches.push(batch);

  if (!isDryRun) {
    for (const b of batches) await b.commit();
  }

  console.log(`\nDone. Fixed: ${fixed}, Already correct: ${skipped}${isDryRun ? ' (dry run — no writes)' : ''}`);
  process.exit(0);
}

run().catch((e) => { console.error(e); process.exit(1); });
