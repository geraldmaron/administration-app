/**
 * Fix scenario conditions in Firestore.
 * Many scenarios were generated with crisis-only conditions (approval<=25, public_order<=35)
 * that prevent them from ever appearing at game start or during normal play.
 * This script applies targeted fixes per bundle and scenario type.
 */
import * as admin from 'firebase-admin';
import * as fs from 'fs';

const sa = JSON.parse(fs.readFileSync('/Users/gerald/Git/admin-app/serviceAccountKey.json', 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

interface Condition { metricId: string; min?: number; max?: number; }

// Bundles/scenarios where public_order<=35 should be relaxed to <=60
const RELAX_PUBLIC_ORDER = new Set([
  'health', 'infrastructure', 'diplomacy',
]);

// Scenarios where approval<=25 should be relaxed to <=50
const RELAX_APPROVAL = new Set([
  'infrastructure', 'politics', 'tech',
]);

// Scenarios where economy<=38/40/45 should be relaxed to <=65
const RELAX_ECONOMY = new Set([
  'economy', 'resources',
]);

// Keep strict conditions for crisis-specific scenarios
const KEEP_STRICT = new Set([
  'corruption', 'justice', 'social', 'dick_mode', 'military',
]);

async function run() {
  const snap = await db.collection('scenarios').where('is_active', '==', true).limit(500).get();
  console.log(`Processing ${snap.size} active scenarios...`);

  const batch = db.batch();
  let updateCount = 0;

  for (const doc of snap.docs) {
    const d = doc.data();
    const bundle: string = d.metadata?.bundle ?? '';
    const conditions: Condition[] = d.conditions ?? [];
    if (conditions.length === 0) continue;
    if (KEEP_STRICT.has(bundle)) continue;

    let newConditions: Condition[] = conditions.map(cond => {
      let c = { ...cond };

      // Relax metric_public_order <= 35 → <= 60 for applicable bundles
      if (c.metricId === 'metric_public_order' && c.max !== undefined && c.max <= 35) {
        if (RELAX_PUBLIC_ORDER.has(bundle)) {
          c = { metricId: c.metricId, max: 60 };
        }
      }

      // Relax metric_approval <= 25 → <= 50 for applicable bundles
      if (c.metricId === 'metric_approval' && c.max !== undefined && c.max <= 25) {
        if (RELAX_APPROVAL.has(bundle) || RELAX_PUBLIC_ORDER.has(bundle)) {
          c = { metricId: c.metricId, max: 50 };
        }
      }

      // Relax metric_economy <= 38/40/45 → <= 65 for applicable bundles
      if (c.metricId === 'metric_economy' && c.max !== undefined && c.max <= 45) {
        if (RELAX_ECONOMY.has(bundle)) {
          c = { metricId: c.metricId, max: 65 };
        }
      }

      // Relax metric_health <= 38 → <= 60 for health bundle
      if (c.metricId === 'metric_health' && c.max !== undefined && c.max <= 38) {
        if (bundle === 'health') {
          c = { metricId: c.metricId, max: 60 };
        }
      }

      return c;
    });

    // For diplomacy, politics, environment: remove approval/public_order conditions entirely
    // (these events can happen under any political climate)
    if (['diplomacy', 'environment', 'culture'].includes(bundle)) {
      newConditions = newConditions.filter(c =>
        c.metricId !== 'metric_approval' && c.metricId !== 'metric_public_order'
      );
    }

    const changed = JSON.stringify(conditions) !== JSON.stringify(newConditions);
    if (changed) {
      console.log(`  Updating ${doc.id} (${bundle}): ${JSON.stringify(conditions)} → ${JSON.stringify(newConditions)}`);
      batch.update(doc.ref, { conditions: newConditions });
      updateCount++;
    }
  }

  if (updateCount === 0) {
    console.log('No changes needed.');
  } else {
    await batch.commit();
    console.log(`\nUpdated ${updateCount} scenarios.`);
  }
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
