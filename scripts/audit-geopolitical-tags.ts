/*
 * Audit and backfill geopolitical metadata on scenarios.
 *
 * Usage:
 *   npx tsx scripts/audit-geopolitical-tags.ts
 *
 * This script is intentionally conservative: it does NOT try to fully infer
 * requiredGeopoliticalTags or governmentCategory gates from free text. Instead,
 * it performs simple structural checks and flags scenarios that:
 * - Are marked isNeighborEvent but lack involvedCountries
 * - Reference obvious nuclear-deterrence tags in their metadata.tags
 *
 * It prints findings to stdout so designers can review and adjust rules or run
 * more sophisticated offline tooling later.
 */

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import type { Scenario } from '../functions/src/types';

const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');
if (!admin.apps.length) {
  const sa = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  admin.initializeApp({ credential: admin.credential.cert(sa) });
}

const db = admin.firestore();

async function* iterateAllScenarios(): AsyncGenerator<{ ref: FirebaseFirestore.DocumentReference; data: Scenario }> {
  const bundlesSnap = await db.collection('library').get();
  for (const bundleDoc of bundlesSnap.docs) {
    const col = bundleDoc.ref.collection('scenarios');
    const snap = await col.get();
    for (const doc of snap.docs) {
      yield { ref: doc.ref, data: doc.data() as Scenario };
    }
  }
}

async function main() {
  let neighborIssues = 0;
  let nuclearIssues = 0;

  for await (const { ref, data } of iterateAllScenarios()) {
    const meta = data.metadata;
    if (!meta) continue;

    if (meta.isNeighborEvent && (!meta.involvedCountries || meta.involvedCountries.length === 0)) {
      console.log(`[NEIGHBOR_EVENT_WITHOUT_COUNTRIES] scenario=${data.id} path=${ref.path}`);
      neighborIssues++;
    }

    if (meta.tags?.some(t => /nuclear|warhead|deterrence/i.test(t)) && !meta.requiredGeopoliticalTags?.includes('nuclear_state' as any)) {
      console.log(`[NUCLEAR_TAG_WITHOUT_NUCLEAR_STATE_REQUIREMENT] scenario=${data.id} path=${ref.path}`);
      nuclearIssues++;
    }
  }

  console.log(`Audit complete. Neighbor-event issues: ${neighborIssues}, nuclear-tag issues: ${nuclearIssues}.`);
}

main().catch(err => {
  console.error('[audit-geopolitical-tags] Failed', err);
  process.exit(1);
});

