/**
 * Populates metricBiases, popularBase, and coalitionWillingness on PoliticalParty documents.
 *
 * Queries the `parties` collection, matches by countryId + name, and writes gameplay data.
 * Usage: npx tsx functions/src/scripts/populate-party-profiles.ts [--write]
 *
 * metricBiases: -1 to +1. Positive = party base cares strongly and rewards aligned decisions.
 *   Negative = party base actively opposes decisions in this domain.
 * coalitionWillingness: 0–1. 1 = fully supportive of player, 0 = total opposition.
 */

import admin from 'firebase-admin';
import type { MetricId } from '../data/schemas/metricIds';

const WRITE = process.argv.includes('--write');

if (!admin.apps.length) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const serviceAccount = require('../../../serviceAccountKey.json');
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

interface PartyGameplayProfile {
  metricBiases: Partial<Record<MetricId, number>>;
  popularBase: string[];
  coalitionWillingness: number;
}

// Keyed by countryId → array of party profile patches matched by name substring
const PARTY_DATA: Record<string, Array<{ nameContains: string } & PartyGameplayProfile>> = {
  us: [
    {
      nameContains: 'Democratic',
      metricBiases: {
        metric_equality: 0.35, metric_environment: 0.30, metric_health: 0.25,
        metric_liberty: 0.20, metric_education: 0.20, metric_immigration: 0.15,
        metric_military: -0.10, metric_sovereignty: -0.10,
      },
      popularBase: ['urban', 'youth', 'minority', 'educated', 'coastal'],
      coalitionWillingness: 0.8,
    },
    {
      nameContains: 'Republican',
      metricBiases: {
        metric_economy: 0.30, metric_military: 0.30, metric_sovereignty: 0.25,
        metric_corruption: -0.15, metric_immigration: -0.20, metric_trade: 0.20,
        metric_equality: -0.15, metric_environment: -0.15,
      },
      popularBase: ['rural', 'religious', 'business', 'veterans', 'suburban'],
      coalitionWillingness: 0.8,
    },
  ],
  gb: [
    {
      nameContains: 'Labour',
      metricBiases: {
        metric_equality: 0.35, metric_health: 0.30, metric_education: 0.25,
        metric_employment: 0.25, metric_housing: 0.20, metric_liberty: 0.15,
        metric_trade: -0.10,
      },
      popularBase: ['urban', 'youth', 'labor', 'minority', 'public_sector'],
      coalitionWillingness: 0.75,
    },
    {
      nameContains: 'Conservative',
      metricBiases: {
        metric_economy: 0.30, metric_sovereignty: 0.25, metric_trade: 0.20,
        metric_military: 0.20, metric_corruption: -0.10, metric_equality: -0.10,
      },
      popularBase: ['rural', 'business', 'elderly', 'homeowners', 'suburban'],
      coalitionWillingness: 0.75,
    },
    {
      nameContains: 'Liberal Democrat',
      metricBiases: {
        metric_liberty: 0.35, metric_environment: 0.30, metric_equality: 0.25,
        metric_education: 0.20, metric_democracy: 0.20,
      },
      popularBase: ['urban', 'educated', 'youth', 'professionals'],
      coalitionWillingness: 0.65,
    },
  ],
  de: [
    {
      nameContains: 'Social Democrat',
      metricBiases: {
        metric_equality: 0.30, metric_employment: 0.30, metric_health: 0.25,
        metric_education: 0.20, metric_housing: 0.20,
      },
      popularBase: ['labor', 'urban', 'public_sector', 'youth'],
      coalitionWillingness: 0.75,
    },
    {
      nameContains: 'Christian Democrat',
      metricBiases: {
        metric_economy: 0.25, metric_sovereignty: 0.20, metric_trade: 0.20,
        metric_military: 0.15, metric_immigration: -0.15,
      },
      popularBase: ['rural', 'religious', 'business', 'elderly'],
      coalitionWillingness: 0.75,
    },
    {
      nameContains: 'Green',
      metricBiases: {
        metric_environment: 0.45, metric_liberty: 0.30, metric_equality: 0.25,
        metric_energy: 0.30, metric_immigration: 0.15,
      },
      popularBase: ['urban', 'youth', 'educated', 'environmental'],
      coalitionWillingness: 0.65,
    },
    {
      nameContains: 'Free Democrat',
      metricBiases: {
        metric_economy: 0.35, metric_liberty: 0.30, metric_innovation: 0.25,
        metric_trade: 0.25, metric_corruption: -0.15,
      },
      popularBase: ['business', 'professionals', 'urban', 'educated'],
      coalitionWillingness: 0.60,
    },
    {
      nameContains: 'Alternative',
      metricBiases: {
        metric_sovereignty: 0.40, metric_immigration: -0.40, metric_democracy: -0.20,
        metric_liberty: -0.15, metric_environment: -0.20,
      },
      popularBase: ['rural', 'eastern_germany', 'economically_anxious'],
      coalitionWillingness: 0.20,
    },
  ],
  fr: [
    {
      nameContains: 'Renaissance',
      metricBiases: {
        metric_economy: 0.25, metric_trade: 0.25, metric_innovation: 0.20,
        metric_equality: 0.15, metric_sovereignty: 0.15,
      },
      popularBase: ['urban', 'educated', 'professionals', 'centrist'],
      coalitionWillingness: 0.70,
    },
    {
      nameContains: 'Rassemblement National',
      metricBiases: {
        metric_sovereignty: 0.45, metric_immigration: -0.45, metric_public_order: 0.25,
        metric_democracy: -0.20, metric_liberty: -0.20, metric_foreign_relations: -0.25,
      },
      popularBase: ['rural', 'suburban', 'working_class', 'economically_anxious'],
      coalitionWillingness: 0.25,
    },
    {
      nameContains: 'Socialiste',
      metricBiases: {
        metric_equality: 0.35, metric_health: 0.30, metric_education: 0.25,
        metric_employment: 0.25, metric_environment: 0.20,
      },
      popularBase: ['urban', 'labor', 'public_sector', 'youth'],
      coalitionWillingness: 0.55,
    },
  ],
  jp: [
    {
      nameContains: 'Liberal Democratic',
      metricBiases: {
        metric_economy: 0.30, metric_trade: 0.25, metric_military: 0.20,
        metric_sovereignty: 0.20, metric_innovation: 0.20, metric_equality: -0.10,
      },
      popularBase: ['business', 'rural', 'elderly', 'corporate'],
      coalitionWillingness: 0.80,
    },
    {
      nameContains: 'Constitutional Democratic',
      metricBiases: {
        metric_liberty: 0.30, metric_democracy: 0.30, metric_equality: 0.25,
        metric_environment: 0.20, metric_health: 0.20,
      },
      popularBase: ['urban', 'youth', 'educated', 'labor'],
      coalitionWillingness: 0.60,
    },
  ],
  cn: [
    {
      nameContains: 'Communist',
      metricBiases: {
        metric_economy: 0.25, metric_sovereignty: 0.40, metric_military: 0.30,
        metric_public_order: 0.30, metric_democracy: -0.40, metric_liberty: -0.40,
        metric_innovation: 0.20, metric_equality: 0.10,
      },
      popularBase: ['party_members', 'urban', 'military', 'state_enterprise'],
      coalitionWillingness: 0.90,
    },
  ],
  ru: [
    {
      nameContains: 'United Russia',
      metricBiases: {
        metric_sovereignty: 0.45, metric_military: 0.40, metric_public_order: 0.30,
        metric_democracy: -0.30, metric_liberty: -0.30, metric_foreign_relations: -0.20,
      },
      popularBase: ['military', 'government_workers', 'elderly', 'rural'],
      coalitionWillingness: 0.85,
    },
    {
      nameContains: 'Communist',
      metricBiases: {
        metric_equality: 0.35, metric_employment: 0.30, metric_health: 0.25,
        metric_sovereignty: 0.20, metric_economy: -0.10,
      },
      popularBase: ['elderly', 'industrial_workers', 'rural'],
      coalitionWillingness: 0.45,
    },
  ],
  in: [
    {
      nameContains: 'Bharatiya Janata',
      metricBiases: {
        metric_sovereignty: 0.35, metric_economy: 0.25, metric_military: 0.25,
        metric_immigration: -0.20, metric_liberty: -0.15, metric_equality: -0.10,
      },
      popularBase: ['hindu_nationalist', 'urban_middle_class', 'rural', 'business'],
      coalitionWillingness: 0.75,
    },
    {
      nameContains: 'Indian National Congress',
      metricBiases: {
        metric_equality: 0.30, metric_health: 0.25, metric_education: 0.25,
        metric_democracy: 0.25, metric_liberty: 0.20, metric_employment: 0.20,
      },
      popularBase: ['minority', 'rural_poor', 'youth', 'educated', 'urban'],
      coalitionWillingness: 0.65,
    },
  ],
  br: [
    {
      nameContains: 'Workers',
      metricBiases: {
        metric_equality: 0.40, metric_employment: 0.35, metric_health: 0.30,
        metric_education: 0.25, metric_housing: 0.25, metric_corruption: -0.15,
      },
      popularBase: ['labor', 'urban_poor', 'youth', 'northeast'],
      coalitionWillingness: 0.70,
    },
    {
      nameContains: 'Liberal',
      metricBiases: {
        metric_economy: 0.30, metric_sovereignty: 0.25, metric_public_order: 0.20,
        metric_environment: -0.20, metric_equality: -0.15, metric_liberty: -0.10,
      },
      popularBase: ['agribusiness', 'evangelical', 'military', 'rural'],
      coalitionWillingness: 0.65,
    },
  ],
  ca: [
    {
      nameContains: 'Liberal',
      metricBiases: {
        metric_equality: 0.25, metric_environment: 0.25, metric_health: 0.20,
        metric_immigration: 0.20, metric_innovation: 0.15, metric_trade: 0.15,
      },
      popularBase: ['urban', 'immigrant', 'youth', 'educated'],
      coalitionWillingness: 0.70,
    },
    {
      nameContains: 'Conservative',
      metricBiases: {
        metric_economy: 0.30, metric_trade: 0.25, metric_energy: 0.25,
        metric_sovereignty: 0.20, metric_immigration: -0.15, metric_environment: -0.15,
      },
      popularBase: ['rural', 'business', 'western_canada', 'religious'],
      coalitionWillingness: 0.70,
    },
    {
      nameContains: 'New Democratic',
      metricBiases: {
        metric_equality: 0.40, metric_health: 0.35, metric_employment: 0.30,
        metric_housing: 0.25, metric_environment: 0.25,
      },
      popularBase: ['labor', 'youth', 'urban', 'indigenous'],
      coalitionWillingness: 0.55,
    },
  ],
  au: [
    {
      nameContains: 'Australian Labor',
      metricBiases: {
        metric_equality: 0.30, metric_health: 0.30, metric_employment: 0.25,
        metric_education: 0.25, metric_environment: 0.20,
      },
      popularBase: ['labor', 'urban', 'youth', 'public_sector'],
      coalitionWillingness: 0.75,
    },
    {
      nameContains: 'Liberal',
      metricBiases: {
        metric_economy: 0.30, metric_trade: 0.25, metric_military: 0.20,
        metric_sovereignty: 0.20, metric_environment: -0.10,
      },
      popularBase: ['business', 'suburban', 'elderly', 'rural'],
      coalitionWillingness: 0.75,
    },
    {
      nameContains: 'Greens',
      metricBiases: {
        metric_environment: 0.50, metric_equality: 0.30, metric_liberty: 0.25,
        metric_housing: 0.25, metric_democracy: 0.20,
      },
      popularBase: ['urban', 'youth', 'educated', 'environmental'],
      coalitionWillingness: 0.50,
    },
  ],
  kr: [
    {
      nameContains: 'Democratic',
      metricBiases: {
        metric_democracy: 0.30, metric_equality: 0.25, metric_liberty: 0.25,
        metric_foreign_relations: 0.20, metric_corruption: -0.20,
      },
      popularBase: ['urban', 'youth', 'educated', 'labor'],
      coalitionWillingness: 0.70,
    },
    {
      nameContains: 'People Power',
      metricBiases: {
        metric_economy: 0.25, metric_military: 0.25, metric_sovereignty: 0.25,
        metric_trade: 0.20, metric_foreign_relations: 0.15,
      },
      popularBase: ['business', 'elderly', 'conservative', 'suburban'],
      coalitionWillingness: 0.70,
    },
  ],
  il: [
    {
      nameContains: 'Likud',
      metricBiases: {
        metric_sovereignty: 0.40, metric_military: 0.35, metric_public_order: 0.25,
        metric_democracy: -0.15, metric_foreign_relations: -0.10,
      },
      popularBase: ['religious', 'sephardic', 'security_hawks', 'settlers'],
      coalitionWillingness: 0.75,
    },
    {
      nameContains: 'National Unity',
      metricBiases: {
        metric_military: 0.30, metric_democracy: 0.25, metric_economy: 0.20,
        metric_foreign_relations: 0.15, metric_sovereignty: 0.20,
      },
      popularBase: ['military_veterans', 'centrist', 'secular'],
      coalitionWillingness: 0.65,
    },
  ],
  sa: [
    {
      nameContains: 'no_parties',
      metricBiases: {
        metric_sovereignty: 0.50, metric_public_order: 0.35, metric_military: 0.25,
        metric_democracy: -0.50, metric_liberty: -0.40, metric_equality: -0.20,
        metric_economy: 0.20, metric_energy: 0.30,
      },
      popularBase: ['royal_family', 'religious_establishment', 'military', 'tribal_leaders'],
      coalitionWillingness: 0.95,
    },
  ],
  tr: [
    {
      nameContains: 'Justice and Development',
      metricBiases: {
        metric_sovereignty: 0.40, metric_public_order: 0.30, metric_economy: 0.20,
        metric_democracy: -0.25, metric_liberty: -0.25, metric_foreign_relations: -0.10,
      },
      popularBase: ['conservative', 'religious', 'rural', 'working_class'],
      coalitionWillingness: 0.80,
    },
    {
      nameContains: 'Republican People',
      metricBiases: {
        metric_democracy: 0.35, metric_liberty: 0.30, metric_equality: 0.25,
        metric_education: 0.20, metric_sovereignty: 0.15,
      },
      popularBase: ['urban', 'secular', 'educated', 'youth'],
      coalitionWillingness: 0.60,
    },
  ],
  ir: [
    {
      nameContains: 'Principlist',
      metricBiases: {
        metric_sovereignty: 0.50, metric_military: 0.40, metric_public_order: 0.35,
        metric_democracy: -0.45, metric_liberty: -0.50, metric_foreign_relations: -0.30,
      },
      popularBase: ['revolutionary_guard', 'religious_clergy', 'basij', 'conservative_rural'],
      coalitionWillingness: 0.90,
    },
  ],
  ng: [
    {
      nameContains: 'All Progressives Congress',
      metricBiases: {
        metric_economy: 0.25, metric_public_order: 0.20, metric_sovereignty: 0.20,
        metric_corruption: -0.15,
      },
      popularBase: ['northern', 'business', 'military_veterans'],
      coalitionWillingness: 0.70,
    },
    {
      nameContains: "People's Democratic",
      metricBiases: {
        metric_equality: 0.25, metric_employment: 0.20, metric_health: 0.20,
        metric_education: 0.20,
      },
      popularBase: ['southern', 'christian', 'urban', 'youth'],
      coalitionWillingness: 0.65,
    },
  ],
  mx: [
    {
      nameContains: 'Morena',
      metricBiases: {
        metric_equality: 0.35, metric_corruption: -0.40, metric_health: 0.25,
        metric_sovereignty: 0.25, metric_democracy: 0.15, metric_economy: -0.05,
      },
      popularBase: ['urban_poor', 'indigenous', 'youth', 'labor'],
      coalitionWillingness: 0.80,
    },
    {
      nameContains: 'PAN',
      metricBiases: {
        metric_economy: 0.30, metric_democracy: 0.25, metric_liberty: 0.20,
        metric_trade: 0.20, metric_corruption: -0.20,
      },
      popularBase: ['business', 'educated', 'urban_middle_class', 'northern'],
      coalitionWillingness: 0.60,
    },
  ],
  gh: [
    {
      nameContains: 'National Democratic Congress',
      metricBiases: { metric_equality: 0.30, metric_health: 0.25, metric_economy: 0.20, metric_employment: 0.25, metric_environment: 0.20 },
      popularBase: ['urban', 'youth', 'lower_income', 'volta_region'],
      coalitionWillingness: 0.65,
    },
    {
      nameContains: 'New Patriotic Party',
      metricBiases: { metric_economy: 0.35, metric_innovation: 0.25, metric_foreign_relations: 0.20, metric_employment: 0.20, metric_military: 0.10 },
      popularBase: ['business', 'ashanti_region', 'middle_class', 'diaspora'],
      coalitionWillingness: 0.55,
    },
  ],
  jm: [
    {
      nameContains: 'Jamaica Labour Party',
      metricBiases: { metric_economy: 0.35, metric_foreign_relations: 0.25, metric_innovation: 0.20, metric_employment: 0.20 },
      popularBase: ['business', 'rural', 'middle_class', 'tourism_sector'],
      coalitionWillingness: 0.55,
    },
    {
      nameContains: "People's National Party",
      metricBiases: { metric_equality: 0.35, metric_health: 0.30, metric_employment: 0.25, metric_liberty: 0.20, metric_environment: 0.15 },
      popularBase: ['urban', 'youth', 'lower_income', 'labour_unions'],
      coalitionWillingness: 0.65,
    },
  ],
  ua: [
    {
      nameContains: 'Servant of the People',
      metricBiases: { metric_sovereignty: 0.40, metric_military: 0.35, metric_foreign_relations: 0.35, metric_economy: 0.20, metric_democracy: 0.25 },
      popularBase: ['urban', 'youth', 'pro_european', 'middle_class'],
      coalitionWillingness: 0.70,
    },
    {
      nameContains: 'European Solidarity',
      metricBiases: { metric_democracy: 0.35, metric_foreign_relations: 0.40, metric_liberty: 0.30, metric_economy: 0.25, metric_sovereignty: 0.30 },
      popularBase: ['pro_european', 'educated', 'urban', 'diaspora'],
      coalitionWillingness: 0.75,
    },
  ],
  za: [
    {
      nameContains: 'African National Congress',
      metricBiases: { metric_equality: 0.35, metric_employment: 0.30, metric_health: 0.25, metric_economy: 0.20, metric_foreign_relations: 0.15 },
      popularBase: ['black_african', 'rural', 'labour_unions', 'lower_income'],
      coalitionWillingness: 0.60,
    },
    {
      nameContains: 'Democratic Alliance',
      metricBiases: { metric_economy: 0.40, metric_corruption: -0.40, metric_innovation: 0.25, metric_foreign_relations: 0.20, metric_liberty: 0.25 },
      popularBase: ['white', 'coloured', 'urban', 'business', 'middle_class'],
      coalitionWillingness: 0.65,
    },
    {
      nameContains: 'Economic Freedom Fighters',
      metricBiases: { metric_equality: 0.45, metric_employment: 0.40, metric_foreign_influence: -0.35, metric_economy: 0.20 },
      popularBase: ['youth', 'black_african', 'lower_income', 'radical_left'],
      coalitionWillingness: 0.30,
    },
  ],
  id: [
    {
      nameContains: 'Gerindra',
      metricBiases: { metric_military: 0.30, metric_sovereignty: 0.35, metric_economy: 0.30, metric_public_order: 0.25, metric_foreign_relations: 0.15 },
      popularBase: ['nationalist', 'military_veterans', 'rural', 'middle_class'],
      coalitionWillingness: 0.65,
    },
    {
      nameContains: 'PDIP',
      metricBiases: { metric_equality: 0.30, metric_employment: 0.30, metric_economy: 0.25, metric_democracy: 0.25, metric_health: 0.20 },
      popularBase: ['secular_nationalist', 'urban', 'labour_unions', 'lower_income'],
      coalitionWillingness: 0.55,
    },
  ],
  sg: [
    {
      nameContains: "People's Action Party",
      metricBiases: { metric_economy: 0.40, metric_innovation: 0.35, metric_foreign_relations: 0.35, metric_public_order: 0.30, metric_infrastructure: 0.30 },
      popularBase: ['business', 'educated', 'middle_class', 'establishment'],
      coalitionWillingness: 0.40,
    },
    {
      nameContains: 'Workers Party',
      metricBiases: { metric_equality: 0.35, metric_liberty: 0.30, metric_health: 0.25, metric_employment: 0.25, metric_democracy: 0.30 },
      popularBase: ['urban', 'youth', 'lower_income', 'educated'],
      coalitionWillingness: 0.60,
    },
  ],
  eg: [
    {
      nameContains: 'Nation Future Party',
      metricBiases: { metric_public_order: 0.35, metric_military: 0.30, metric_economy: 0.30, metric_foreign_relations: 0.25, metric_sovereignty: 0.30 },
      popularBase: ['military_aligned', 'establishment', 'rural', 'nationalist'],
      coalitionWillingness: 0.50,
    },
    {
      nameContains: 'Wafd Party',
      metricBiases: { metric_economy: 0.30, metric_foreign_relations: 0.25, metric_liberty: 0.20, metric_democracy: 0.20 },
      popularBase: ['liberal', 'urban', 'business', 'educated'],
      coalitionWillingness: 0.65,
    },
  ],
};

async function run(): Promise<void> {
  console.log(`Processing party profiles — ${WRITE ? 'WRITING' : 'DRY RUN'}`);

  const partiesSnap = await db.collection('parties').get();
  console.log(`Found ${partiesSnap.size} party documents`);

  let updated = 0;
  let skipped = 0;

  for (const doc of partiesSnap.docs) {
    const party = doc.data();
    const countryId: string = party.countryId ?? '';
    const partyName: string = party.name ?? '';

    const countryProfiles = PARTY_DATA[countryId];
    if (!countryProfiles) { skipped++; continue; }

    const profile = countryProfiles.find(p =>
      partyName.toLowerCase().includes(p.nameContains.toLowerCase()),
    );
    if (!profile) { skipped++; continue; }

    const { nameContains: _, ...updates } = profile;
    console.log(`  ${countryId}/${partyName}: applying ${Object.keys(updates.metricBiases).length} biases`);

    if (WRITE) {
      await doc.ref.update(updates);
      updated++;
    }
  }

  console.log(`\nDone — ${WRITE ? `updated ${updated}` : `would update (dry run)`}, skipped ${skipped}`);
}

run().catch(err => { console.error(err); process.exit(1); });
