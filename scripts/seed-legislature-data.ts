/**
 * Script to seed legislature_initial_state for all countries.
 *
 * For each country:
 * - Fetches parties from 'parties' subcollection
 * - Assigns ruling, opposition, minor blocs based on party properties
 * - Sets predefined values for seatShare, approvalOfPlayer, gridlockLevel
 * - Updates country document with legislature_initial_state
 *
 * Usage: npx tsx scripts/seed-legislature-data.ts [--dry-run]
 */

import admin from 'firebase-admin';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import * as path from 'path';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Firebase setup
const PROJECT_ID = 'the-administration-3a072';
const serviceAccount = require(path.join(__dirname, '..', 'serviceAccountKey.json'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: PROJECT_ID,
  });
}

const db = admin.firestore();

interface Party {
  id: string;
  isRuling?: boolean;
  coalition?: boolean;
  name?: string;
}

interface Bloc {
  partyId: string;
  seatShare: number;
  approvalOfPlayer: number;
}

interface LegislatureState {
  blocs: Bloc[];
  gridlockLevel: number;
}

async function generateLegislatureState(parties: Party[]): Promise<LegislatureState> {
  if (parties.length === 0) throw new Error('No parties found');

  // Find ruling: first isRuling or first party
  const ruling = parties.find(p => p.isRuling) || parties[0];

  let opposition: Party;
  let minor: Party;

  if (parties.length === 1) {
    // Only one party, use it for all or generic for others
    opposition = { id: 'party_generic_opposition' };
    minor = { id: 'party_generic_minor' };
  } else if (parties.length === 2) {
    // Two parties: ruling and opposition, minor generic
    opposition = parties.find(p => p !== ruling) || parties[1];
    minor = { id: 'party_generic_minor' };
  } else {
    // Three or more
    opposition = parties.find(p => p !== ruling && !p.isRuling && !p.coalition) || parties.find(p => p !== ruling && !p.isRuling) || parties.find(p => p !== ruling);
    minor = parties.find(p => p !== ruling && p !== opposition && !p.isRuling && !p.coalition) || parties.find(p => p !== ruling && p !== opposition && !p.isRuling) || parties.find(p => p !== ruling && p !== opposition) || { id: 'party_generic_minor' };
  }

  const blocs: Bloc[] = [
    { partyId: ruling.id, seatShare: 0.52, approvalOfPlayer: 60 },
    { partyId: opposition.id, seatShare: 0.42, approvalOfPlayer: 35 },
    { partyId: minor.id, seatShare: 0.06, approvalOfPlayer: 50 },
  ];

  return {
    blocs,
    gridlockLevel: 30,
  };
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  console.log(`\n=== SEED LEGISLATURE DATA ${isDryRun ? '(DRY RUN)' : ''} ===\n`);

  const countriesSnap = await db.collection('countries').get();
  if (countriesSnap.empty) {
    console.error('ERROR: countries/ collection is empty — run seed-countries.ts first.');
    process.exit(1);
  }

  let total = 0;
  let updated = 0;
  let errors = 0;

  for (const doc of countriesSnap.docs) {
    total++;
    const countryId = doc.id;
    console.log(`Processing ${countryId}...`);

    try {
      const partiesSnap = await db.collection('countries').doc(countryId).collection('parties').get();
      if (partiesSnap.empty) {
        console.log(`  Skipping ${countryId}: no parties found`);
        continue;
      }

      const parties: Party[] = partiesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const legislatureState = await generateLegislatureState(parties);

      if (!isDryRun) {
        await db.collection('countries').doc(countryId).update({
          legislature_initial_state: legislatureState,
        });
      }

      updated++;
      console.log(`  Updated ${countryId} with legislature state`);
    } catch (e) {
      errors++;
      console.error(`  Error processing ${countryId}: ${e.message}`);
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Total countries: ${total}`);
  console.log(`Updated: ${updated}`);
  console.log(`Errors: ${errors}`);
  if (isDryRun) {
    console.log('\nDry run complete. Run without --dry-run to apply changes.');
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });