/**
 * Anonymize Party Documents — clears real names from parties subcollection.
 *
 * Usage:
 *   npx tsx scripts/anonymize-party-documents.ts --dry-run  # preview
 *   npx tsx scripts/anonymize-party-documents.ts --write    # commit
 *
 * Clears:
 *   currentLeader — used in scenario text; must be fictional
 *   description   — not used at runtime but contains real name references
 */

import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const WRITE = process.argv.includes('--write');
const DRY_RUN = !WRITE;

if (DRY_RUN) console.log('[DRY RUN] No changes will be written.\n');

initializeApp();
const db = getFirestore();

async function migrateCountryParties(countryId: string): Promise<number> {
  const snap = await db.collection(`countries/${countryId}/parties`).get();
  if (snap.empty) return 0;

  let updated = 0;
  for (const partyDoc of snap.docs) {
    const data = partyDoc.data();
    const updates: Record<string, unknown> = {};

    if (data.currentLeader !== undefined) {
      updates.currentLeader = null;
    }
    if (data.description !== undefined) {
      updates.description = null;
    }

    if (Object.keys(updates).length === 0) continue;

    if (WRITE) {
      await partyDoc.ref.update(updates);
    }
    updated++;
  }
  return updated;
}

async function main() {
  const countryIds = [
    'ar', 'au', 'bd', 'br', 'ca', 'cl', 'cn', 'co', 'cu', 'eg',
    'fr', 'de', 'gh', 'gr', 'hu', 'in', 'id', 'ir', 'il', 'it',
    'jm', 'jp', 'ke', 'kp', 'kr', 'mx', 'my', 'ng', 'nl', 'no',
    'nz', 'ph', 'pk', 'pl', 'pt', 'qa', 'ru', 'sa', 'se', 'sg',
    'th', 'tr', 'ua', 'gb', 'us', 've', 'vn', 'za', 'es', 'ch',
  ];

  let total = 0;
  for (const id of countryIds) {
    const changed = await migrateCountryParties(id);
    if (changed > 0) {
      total += changed;
      if (!WRITE) console.log(`  ${id}: ${changed} party doc(s) with real names`);
    }
  }

  if (WRITE) {
    console.log(`\n✅ Cleared currentLeader + description from ${total} party documents.`);
  } else {
    console.log(`\n${total} party documents need updating. Run with --write to apply.`);
  }
}

main().catch(console.error);
