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

// Maps countryId → party ids that should have isMainOpposition: true.
// Two-party symmetric systems (US) list BOTH major parties so either can be
// found as opposition regardless of which the player governs as.
const MAIN_OPPOSITION: Record<string, string[]> = {
  us: ['usa_democratic', 'usa_republican'], // symmetric — either can be opposition
  gb: ['uk_conservative'],                  // Conservatives — official opposition to Labour
  ca: ['canada_liberal'],                   // Liberals — main opposition to Conservatives
  au: ['australia_lnp'],                    // Liberal–National Coalition — main opposition to Labor
  de: ['germany_afd'],                      // AfD — largest opposition bloc (SPD is coalition partner)
  fr: ['france_rassemblement_national'],    // RN — largest opposition bloc
  jp: ['japan_cdpj'],                       // CDPJ — main opposition to LDP/Komeito coalition
  br: ['brazil_pl'],                        // PL — main opposition to PT-led coalition
  mx: ['mexico_pan'],                       // PAN — main opposition to MORENA
  in: ['india_inc'],                        // INC — main opposition to BJP
};

// Coalition role corrections: isRuling must be true ONLY on the lead governing party.
// Junior coalition partners get isRuling: false, isCoalitionMember: true.
const COALITION_CORRECTIONS: Record<string, { partyId: string; fields: Record<string, boolean> }[]> = {
  de: [
    { partyId: 'germany_spd', fields: { isRuling: false, isCoalitionMember: true } },
  ],
  jp: [
    // LDP leads; Komeito is junior partner — remove its erroneous isRuling flag
    { partyId: 'japan_komeito', fields: { isRuling: false, isCoalitionMember: true } },
  ],
  br: [
    // PT (Lula) leads; MDB and União Brasil are coalition partners
    { partyId: 'brazil_mdb',   fields: { isRuling: false, isCoalitionMember: true } },
    { partyId: 'brazil_uniao', fields: { isRuling: false, isCoalitionMember: true } },
  ],
};

async function run(): Promise<void> {
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'APPLY'}`);

  const allCountries = new Set([...Object.keys(MAIN_OPPOSITION), ...Object.keys(COALITION_CORRECTIONS)]);

  for (const countryId of allCountries) {
    const partiesSnap = await db.collection('countries').doc(countryId).collection('parties').get();
    if (partiesSnap.empty) {
      console.warn(`Skipping ${countryId}: no parties subcollection`);
      continue;
    }

    const mainOppIds = new Set(MAIN_OPPOSITION[countryId] ?? []);
    const corrections = COALITION_CORRECTIONS[countryId] ?? [];

    const batch = db.batch();
    let changed = 0;

    for (const doc of partiesSnap.docs) {
      const data = doc.data();
      const updates: Record<string, boolean> = {};

      const shouldBeMainOpp = mainOppIds.has(doc.id);
      if (data.isMainOpposition !== shouldBeMainOpp) {
        updates.isMainOpposition = shouldBeMainOpp;
      }

      const correction = corrections.find(c => c.partyId === doc.id);
      if (correction) {
        for (const [field, value] of Object.entries(correction.fields)) {
          if (data[field] !== value) {
            updates[field] = value;
          }
        }
      }

      if (Object.keys(updates).length === 0) continue;

      if (isDryRun) {
        console.log(`[DRY RUN] ${countryId}/${doc.id}:`, updates);
      } else {
        batch.update(doc.ref, updates);
      }
      changed++;
    }

    if (!isDryRun && changed > 0) {
      await batch.commit();
      console.log(`Updated ${changed} parties in countries/${countryId}`);
    } else if (isDryRun && changed === 0) {
      console.log(`${countryId}: already correct`);
    }
  }

  console.log('Done.');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
