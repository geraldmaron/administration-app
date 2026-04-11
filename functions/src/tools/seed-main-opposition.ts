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
// Two-party symmetric systems list BOTH major parties so either can serve as opposition.
// Single-party states (cn, cu, kp, vn) have no opposition — omitted.
const MAIN_OPPOSITION: Record<string, string[]> = {
  // Americas
  us: ['usa_democratic', 'usa_republican'],   // symmetric two-party system
  ca: ['canada_liberal'],                      // Liberals — main opposition to Conservatives
  mx: ['mexico_pan'],                          // PAN — main opposition to MORENA
  br: ['brazil_pl'],                           // PL — main opposition to PT-led coalition
  ar: ['argentina_ump'],                       // Union por la Patria — main opposition to Milei
  cl: ['chile_chile_vamos'],                   // Vamos Chile — main opposition to Boric coalition
  co: ['colombia_centro_democratico'],         // Centro Democrático — main opposition to Petro
  ve: ['venezuela_pud'],                       // Plataforma Unitaria — main opposition to PSUV
  jm: ['jamaica_pnp'],                         // PNP — main opposition to JLP

  // Europe
  gb: ['uk_conservative'],                     // Conservatives — official opposition to Labour
  de: ['germany_afd'],                         // AfD — largest opposition bloc
  fr: ['france_rassemblement_national'],       // RN — largest opposition bloc
  it: ['italy_pd'],                            // PD — main opposition to FdI-led coalition
  es: ['spain_partido_popular'],               // PP — main opposition to PSOE
  pl: ['poland_pis'],                          // PiS — main opposition to Tusk coalition
  nl: ['netherlands_vvd'],                     // VVD — main opposition to PVV-led coalition
  se: ['sweden_socialdemokraterna'],           // Social Democrats — main opposition to right coalition
  no: ['norway_hoyre'],                        // Høyre — main opposition to Labour
  pt: ['portugal_psd'],                        // PSD — main opposition to Socialists
  gr: ['greece_syriza'],                       // SYRIZA — main opposition to ND
  hu: ['hungary_tisza'],                       // Tisza — main opposition to Fidesz
  ch: ['switzerland_sp'],                      // SP — main left opposition to SVP-FDP coalition
  ua: ['ukraine_european_solidarity'],         // European Solidarity — main opposition

  // Asia-Pacific
  jp: ['japan_cdpj'],                          // CDPJ — main opposition to LDP/Komeito
  kr: ['korea_ppp'],                           // PPP — symmetric (either can oppose)
  au: ['australia_lnp'],                       // LNP — main opposition to Labor
  nz: ['newzealand_labour'],                   // Labour — main opposition to National-led coalition
  in: ['india_inc'],                           // INC — main opposition to BJP
  id: ['indonesia_pdip'],                      // PDIP — main opposition to Prabowo coalition
  sg: ['singapore_workers_party'],             // Workers' Party — main opposition to PAP
  my: ['malaysia_perikatan'],                  // PN — main opposition to Pakatan
  ph: ['philippines_liberal'],                 // Liberal Party — main opposition
  bd: ['bangladesh_bnp'],                      // BNP — main opposition to Awami League
  pk: ['pakistan_pti'],                        // PTI — main opposition to PML-N coalition
  th: ['thailand_peoples_party'],              // People's Party — main opposition to Pheu Thai
  vn: [],                                      // single-party state
  kp: [],                                      // single-party state

  // Africa & Middle East
  za: ['southafrica_da'],                      // DA — main opposition to ANC-led coalition
  ng: ['nigeria_pdp'],                         // PDP — main opposition to APC
  gh: ['ghana_ndc'],                           // NDC — symmetric (either can oppose)
  ke: ['kenya_azimio'],                        // Azimio — main opposition to Kenya Kwanza
  eg: ['egypt_wafd'],                          // Wafd — main (limited) opposition
  il: ['israel_national_unity'],               // National Unity — main opposition to Likud coalition
  sa: [],                                      // absolute monarchy, no parties
  ir: [],                                      // theocratic state, no formal opposition parties
  tr: ['turkey_chp'],                          // CHP — main opposition to AKP
  qa: [],                                      // absolute monarchy, no parties
};

// Coalition role corrections: isRuling must be true ONLY on the lead governing party.
// Junior coalition partners get isRuling: false, isCoalitionMember: true.
const COALITION_CORRECTIONS: Record<string, { partyId: string; fields: Record<string, boolean> }[]> = {
  de: [
    { partyId: 'germany_spd', fields: { isRuling: false, isCoalitionMember: true } },
  ],
  jp: [
    { partyId: 'japan_komeito', fields: { isRuling: false, isCoalitionMember: true } },
  ],
  br: [
    { partyId: 'brazil_mdb',   fields: { isRuling: false, isCoalitionMember: true } },
    { partyId: 'brazil_uniao', fields: { isRuling: false, isCoalitionMember: true } },
  ],
  it: [
    { partyId: 'italy_lega',   fields: { isRuling: false, isCoalitionMember: true } },
    { partyId: 'italy_fi',     fields: { isRuling: false, isCoalitionMember: true } },
  ],
  il: [
    { partyId: 'israel_shas',          fields: { isRuling: false, isCoalitionMember: true } },
    { partyId: 'israel_utm',           fields: { isRuling: false, isCoalitionMember: true } },
    { partyId: 'israel_religious_zionism', fields: { isRuling: false, isCoalitionMember: true } },
  ],
  nz: [
    { partyId: 'newzealand_act',  fields: { isRuling: false, isCoalitionMember: true } },
    { partyId: 'newzealand_nzfirst', fields: { isRuling: false, isCoalitionMember: true } },
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
