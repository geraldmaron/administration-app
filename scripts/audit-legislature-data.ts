/**
 * Audits all countries in the 'countries' collection for:
 *  - presence of 'legislature_initial_state' subdocument
 *  - presence of at least one document in 'parties' subcollection
 *
 * Usage: npx tsx scripts/audit-legislature-data.ts
 *
 * Output: For each country, lists missing data. Prints summary at end.
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
  console.log(`\n=== LEGISLATURE DATA AUDIT ===\n`);

  const countriesSnap = await db.collection('countries').get();
  if (countriesSnap.empty) {
    console.error('ERROR: countries/ collection is empty — run seed-countries.ts first.');
    process.exit(1);
  }

  let total = 0;
  let missingLegislature = 0;
  let missingParties = 0;
  const missingLegislatureIds: string[] = [];
  const missingPartiesIds: string[] = [];

  for (const doc of countriesSnap.docs) {
    total++;
    const countryId = doc.id;
    const data = doc.data();
    let hasLegislature = !!data.legislature_initial_state;
    let hasParties = false;
    try {
      const partiesSnap = await db.collection('countries').doc(countryId).collection('parties').limit(1).get();
      hasParties = !partiesSnap.empty;
    } catch (e) {
      hasParties = false;
    }

    let missing = [];
    if (!hasLegislature) {
      missingLegislature++;
      missingLegislatureIds.push(countryId);
      missing.push('legislature_initial_state');
    }
    if (!hasParties) {
      missingParties++;
      missingPartiesIds.push(countryId);
      missing.push('parties');
    }
    if (missing.length > 0) {
      console.log(`- ${countryId}: missing ${missing.join(' & ')}`);
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Total countries: ${total}`);
  console.log(`Missing legislature_initial_state: ${missingLegislature}`);
  console.log(`Missing parties: ${missingParties}`);
  if (missingLegislatureIds.length > 0) {
    console.log(`\nCountries missing legislature_initial_state:`);
    for (const id of missingLegislatureIds) console.log(`  - ${id}`);
  }
  if (missingPartiesIds.length > 0) {
    console.log(`\nCountries missing parties:`);
    for (const id of missingPartiesIds) console.log(`  - ${id}`);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
