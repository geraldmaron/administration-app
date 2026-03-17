/**
 * Checks country party coverage against the canonical countries/ collection
 * (ISO-keyed). Exits with an error if countries/ is empty — run seed-countries.ts first.
 *
 * Usage: npx tsx scripts/check-country-parties.ts
 */
// @ts-nocheck
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import * as path from 'path';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceAccount = require(path.join(__dirname, '..', 'serviceAccountKey.json'));
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'the-administration-3a072',
  });
}

const db = admin.firestore();

async function main() {
  console.log(`\n=== COUNTRY PARTIES CHECK ===\n`);

  // countries/ is the single source of truth — no fallbacks
  const countriesSnap = await db.collection('countries').get();
  if (countriesSnap.empty) {
    console.error('ERROR: countries/ collection is empty — run seed-countries.ts first.');
    process.exit(1);
  }

  const countryMap = new Map<string, string>();
  for (const doc of countriesSnap.docs) {
    countryMap.set(doc.id, doc.data().name ?? doc.id);
  }

  console.log(`Total countries in collection: ${countryMap.size}`);

  // Enumerate all party docs via collection group
  const allPartiesSnap = await db.collectionGroup('parties').get();
  console.log(`Total party docs (collection group): ${allPartiesSnap.size}\n`);

  // Group parties by parent country doc ID
  const partiesByCountry = new Map<string, number>();
  for (const pdoc of allPartiesSnap.docs) {
    const countryId = pdoc.ref.parent.parent?.id;
    if (!countryId) continue;
    partiesByCountry.set(countryId, (partiesByCountry.get(countryId) ?? 0) + 1);
  }

  const withParties: { name: string; id: string; count: number }[] = [];
  const withoutParties: { name: string; id: string }[] = [];

  for (const [id, name] of countryMap) {
    const count = partiesByCountry.get(id) ?? 0;
    if (count > 0) {
      withParties.push({ name, id, count });
    } else {
      withoutParties.push({ name, id });
    }
  }

  // Orphaned: parties whose parent is not in countries/
  const orphanedCountryIds = [...partiesByCountry.keys()].filter(id => !countryMap.has(id));
  if (orphanedCountryIds.length > 0) {
    console.log(`--- Orphaned party groups (parent not in countries/) ---`);
    for (const id of orphanedCountryIds) {
      console.log(`  ${id}: ${partiesByCountry.get(id)} parties (no matching country doc)`);
    }
    console.log('');
  }

  withParties.sort((a, b) => a.name.localeCompare(b.name));
  withoutParties.sort((a, b) => a.name.localeCompare(b.name));

  console.log(`--- Countries WITH parties (${withParties.length}) ---`);
  for (const c of withParties) {
    console.log(`  ${c.name} (${c.id}): ${c.count} parties`);
  }

  console.log(`\n--- Countries WITHOUT parties (${withoutParties.length}) ---`);
  for (const c of withoutParties) {
    console.log(`  ${c.name} (${c.id})`);
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`  Total countries:                  ${countryMap.size}`);
  console.log(`  With parties:                     ${withParties.length}`);
  console.log(`  Without parties (gaps):           ${withoutParties.length}`);
  if (orphanedCountryIds.length > 0) {
    console.log(`  Orphaned party groups (no doc):   ${orphanedCountryIds.length}`);
  }
  console.log('');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
