/*
 * Seeds the training_scenarios collection with top-scoring scenarios per bundle.
 * These golden examples are used as few-shot seeds during generation to improve
 * output quality and style consistency.
 *
 * Selects the top 2 scenarios per bundle by auditScore (minimum 88).
 * Marks them with isGolden: true and writes to training_scenarios/{id}.
 *
 * Usage: pnpm -s tsx scripts/seed-golden-examples.ts [--dry-run]
 */

import admin from 'firebase-admin';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const serviceAccount = require('../serviceAccountKey.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { initializeAuditConfig, auditScenario, scoreScenario } = require('../functions/lib/lib/audit-rules.js');

const DRY_RUN = process.argv.includes('--dry-run');
const MIN_SCORE = 88;
const TOP_N_PER_BUNDLE = 2;

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'the-administration-3a072',
  });
}

const db = admin.firestore();

async function main() {
  await initializeAuditConfig(db);

  const snap = await db.collection('scenarios').get();
  console.log(`Loaded ${snap.docs.length} scenarios`);

  const byBundle: Record<string, { id: string; score: number; data: admin.firestore.DocumentData }[]> = {};

  for (const doc of snap.docs) {
    const data = doc.data();
    const bundle: string = data?.metadata?.bundle || 'unknown';
    const isNews = data?.metadata?.source === 'news';

    const issues = auditScenario(data, bundle, isNews);
    const score = scoreScenario(issues) as number;

    if (score < MIN_SCORE) continue;

    if (!byBundle[bundle]) byBundle[bundle] = [];
    byBundle[bundle].push({ id: doc.id, score, data });
  }

  let totalWritten = 0;
  const batch = db.batch();

  for (const [bundle, candidates] of Object.entries(byBundle)) {
    candidates.sort((a, b) => b.score - a.score);
    const top = candidates.slice(0, TOP_N_PER_BUNDLE);

    for (const { id, score, data } of top) {
      const ref = db.collection('training_scenarios').doc(id);
      const payload = {
        ...data,
        isGolden: true,
        goldenBundle: bundle,
        auditScore: score,
        seededAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (DRY_RUN) {
        console.log(`[dry-run] Would write training_scenarios/${id} (bundle=${bundle}, score=${score})`);
      } else {
        batch.set(ref, payload);
      }
      totalWritten++;
    }
  }

  if (!DRY_RUN && totalWritten > 0) {
    await batch.commit();
  }

  const bundleCount = Object.keys(byBundle).length;
  console.log(
    DRY_RUN
      ? `[dry-run] Would seed ${totalWritten} golden examples across ${bundleCount} bundles`
      : `Seeded ${totalWritten} golden examples across ${bundleCount} bundles into training_scenarios`
  );

  const missing = Object.entries(byBundle)
    .filter(([, candidates]) => candidates.length < TOP_N_PER_BUNDLE)
    .map(([b, candidates]) => `${b} (${candidates.length}/${TOP_N_PER_BUNDLE})`);
  if (missing.length > 0) {
    console.warn(`Bundles with fewer than ${TOP_N_PER_BUNDLE} qualifying scenarios: ${missing.join(', ')}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
