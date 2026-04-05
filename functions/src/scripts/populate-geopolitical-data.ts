/**
 * Populates geopolitical relationship profiles on all 50 country documents.
 *
 * Writes to countries/{id}.geopolitical with:
 *   allies, adversaries, neighbors, governmentCategory, regimeStability,
 *   tags, governmentType, governmentName, headOfState, headOfGovernment
 *
 * CountryRelationship: { countryId, type, strength (-100 to 100), treaty?, sharedBorder? }
 *
 * Usage: npx tsx functions/src/scripts/populate-geopolitical-data.ts [--write]
 */

import admin from 'firebase-admin';

const WRITE = process.argv.includes('--write');

if (!admin.apps.length) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const serviceAccount = require('../../../serviceAccountKey.json');
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

interface CountryRelationship {
  countryId: string;
  type: string;       // 'formal_ally' | 'strategic_partner' | 'rival' | 'adversary' | 'neutral' | 'conflict'
  strength: number;   // -100 to 100
  treaty?: string;
  sharedBorder?: boolean;
}

interface GeopoliticalPatch {
  allies: CountryRelationship[];
  adversaries: CountryRelationship[];
  neighbors: CountryRelationship[];
  governmentCategory: string;
  regimeStability: number;  // 0–100
  tags: string[];
  governmentType: string;
  governmentName: string;
}

const GEOPOLITICAL_PROFILES: Record<string, GeopoliticalPatch> = {
  au: {
    governmentCategory: 'constitutional_monarchy',
    governmentType: 'Federal Parliamentary Constitutional Monarchy',
    governmentName: 'Government of Australia',
    regimeStability: 82,
    tags: ['island_nation', 'regional_power', 'five_eyes', 'anglosphere', 'coastal', 'indo_pacific'],
    allies: [
      { countryId: 'us', type: 'formal_ally', strength: 88, treaty: 'ANZUS' },
      { countryId: 'gb', type: 'formal_ally', strength: 80, treaty: 'Five Eyes' },
      { countryId: 'nz', type: 'formal_ally', strength: 85, treaty: 'ANZUS' },
      { countryId: 'jp', type: 'strategic_partner', strength: 72 },
      { countryId: 'sg', type: 'strategic_partner', strength: 65 },
    ],
    adversaries: [
      { countryId: 'cn', type: 'rival', strength: -55 },
    ],
    neighbors: [],
  },
  br: {
    governmentCategory: 'liberal_democracy',
    governmentType: 'Federal Presidential Republic',
    governmentName: 'Government of Brazil',
    regimeStability: 58,
    tags: ['coastal', 'regional_power', 'mercosur_member', 'brics_member', 'portuguese_speaking'],
    allies: [
      { countryId: 'ar', type: 'strategic_partner', strength: 55, treaty: 'MERCOSUR' },
      { countryId: 'cn', type: 'strategic_partner', strength: 48 },
    ],
    adversaries: [],
    neighbors: [],
  },
  ca: {
    governmentCategory: 'constitutional_monarchy',
    governmentType: 'Federal Parliamentary Constitutional Monarchy',
    governmentName: 'Government of Canada',
    regimeStability: 84,
    tags: ['coastal', 'regional_power', 'nato_member', 'five_eyes', 'g7_member', 'anglosphere', 'landlocked_border'],
    allies: [
      { countryId: 'us', type: 'formal_ally', strength: 92, treaty: 'NATO, NORAD, CUSMA' },
      { countryId: 'gb', type: 'formal_ally', strength: 78, treaty: 'NATO, Five Eyes' },
      { countryId: 'au', type: 'formal_ally', strength: 72, treaty: 'Five Eyes' },
    ],
    adversaries: [
      { countryId: 'ru', type: 'adversary', strength: -60 },
      { countryId: 'cn', type: 'rival', strength: -35 },
    ],
    neighbors: [
      { countryId: 'us', type: 'formal_ally', strength: 92, sharedBorder: true },
    ],
  },
  cn: {
    governmentCategory: 'authoritarian',
    governmentType: 'Unitary One-Party Socialist Republic',
    governmentName: 'Government of the People\'s Republic of China',
    regimeStability: 78,
    tags: ['coastal', 'superpower', 'nuclear_state', 'brics_member', 'p5_member', 'great_power'],
    allies: [
      { countryId: 'ru', type: 'strategic_partner', strength: 70 },
      { countryId: 'ir', type: 'strategic_partner', strength: 55 },
    ],
    adversaries: [
      { countryId: 'us', type: 'rival', strength: -62 },
      { countryId: 'in', type: 'rival', strength: -48, sharedBorder: true },
      { countryId: 'jp', type: 'rival', strength: -45 },
      { countryId: 'au', type: 'rival', strength: -55 },
    ],
    neighbors: [
      { countryId: 'ru', type: 'strategic_partner', strength: 70, sharedBorder: true },
      { countryId: 'in', type: 'rival', strength: -48, sharedBorder: true },
    ],
  },
  de: {
    governmentCategory: 'liberal_democracy',
    governmentType: 'Federal Parliamentary Republic',
    governmentName: 'Government of Germany',
    regimeStability: 85,
    tags: ['coastal', 'great_power', 'nato_member', 'eu_member', 'g7_member', 'eu_founding_member'],
    allies: [
      { countryId: 'fr', type: 'formal_ally', strength: 82, treaty: 'NATO, EU' },
      { countryId: 'us', type: 'formal_ally', strength: 78, treaty: 'NATO' },
      { countryId: 'gb', type: 'formal_ally', strength: 75, treaty: 'NATO' },
    ],
    adversaries: [
      { countryId: 'ru', type: 'adversary', strength: -72 },
    ],
    neighbors: [
      { countryId: 'fr', type: 'formal_ally', strength: 82, sharedBorder: true },
    ],
  },
  fr: {
    governmentCategory: 'liberal_democracy',
    governmentType: 'Unitary Semi-Presidential Republic',
    governmentName: 'Government of France',
    regimeStability: 72,
    tags: ['coastal', 'great_power', 'nuclear_state', 'nato_member', 'eu_member', 'g7_member', 'p5_member'],
    allies: [
      { countryId: 'de', type: 'formal_ally', strength: 82, treaty: 'NATO, EU' },
      { countryId: 'gb', type: 'formal_ally', strength: 78, treaty: 'NATO' },
      { countryId: 'us', type: 'formal_ally', strength: 72, treaty: 'NATO' },
    ],
    adversaries: [
      { countryId: 'ru', type: 'adversary', strength: -68 },
    ],
    neighbors: [
      { countryId: 'de', type: 'formal_ally', strength: 82, sharedBorder: true },
    ],
  },
  gb: {
    governmentCategory: 'constitutional_monarchy',
    governmentType: 'Unitary Parliamentary Constitutional Monarchy',
    governmentName: 'Government of the United Kingdom',
    regimeStability: 78,
    tags: ['island_nation', 'great_power', 'nuclear_state', 'nato_member', 'five_eyes', 'g7_member', 'p5_member', 'anglosphere', 'coastal'],
    allies: [
      { countryId: 'us', type: 'formal_ally', strength: 90, treaty: 'NATO, Five Eyes, AUKUS' },
      { countryId: 'fr', type: 'formal_ally', strength: 78, treaty: 'NATO' },
      { countryId: 'de', type: 'formal_ally', strength: 75, treaty: 'NATO' },
      { countryId: 'au', type: 'formal_ally', strength: 80, treaty: 'AUKUS, Five Eyes' },
      { countryId: 'ca', type: 'formal_ally', strength: 78, treaty: 'NATO, Five Eyes' },
    ],
    adversaries: [
      { countryId: 'ru', type: 'adversary', strength: -70 },
    ],
    neighbors: [],
  },
  gh: {
    governmentCategory: 'liberal_democracy',
    governmentType: 'Unitary Presidential Republic',
    governmentName: 'Government of Ghana',
    regimeStability: 70,
    tags: ['coastal', 'small_state', 'african_union_member', 'ecowas_member', 'anglophone_africa'],
    allies: [
      { countryId: 'us', type: 'strategic_partner', strength: 42 },
      { countryId: 'gb', type: 'strategic_partner', strength: 45 },
    ],
    adversaries: [],
    neighbors: [],
  },
  il: {
    governmentCategory: 'liberal_democracy',
    governmentType: 'Unitary Parliamentary Republic',
    governmentName: 'Government of Israel',
    regimeStability: 65,
    tags: ['coastal', 'middle_power', 'nuclear_state', 'land_border_adversary'],
    allies: [
      { countryId: 'us', type: 'formal_ally', strength: 90 },
    ],
    adversaries: [
      { countryId: 'ir', type: 'adversary', strength: -90 },
    ],
    neighbors: [],
  },
  in: {
    governmentCategory: 'liberal_democracy',
    governmentType: 'Federal Parliamentary Republic',
    governmentName: 'Government of India',
    regimeStability: 68,
    tags: ['coastal', 'great_power', 'nuclear_state', 'brics_member', 'g20_member', 'land_border_adversary'],
    allies: [
      { countryId: 'us', type: 'strategic_partner', strength: 62 },
      { countryId: 'ru', type: 'strategic_partner', strength: 55 },
      { countryId: 'fr', type: 'strategic_partner', strength: 55 },
      { countryId: 'au', type: 'strategic_partner', strength: 58, treaty: 'Quad' },
      { countryId: 'jp', type: 'strategic_partner', strength: 55, treaty: 'Quad' },
    ],
    adversaries: [
      { countryId: 'pk', type: 'adversary', strength: -82, sharedBorder: true },
      { countryId: 'cn', type: 'rival', strength: -48, sharedBorder: true },
    ],
    neighbors: [
      { countryId: 'cn', type: 'rival', strength: -48, sharedBorder: true },
    ],
  },
  ir: {
    governmentCategory: 'authoritarian',
    governmentType: 'Unitary Islamic Republic',
    governmentName: 'Government of the Islamic Republic of Iran',
    regimeStability: 55,
    tags: ['coastal', 'middle_power', 'land_border_adversary', 'sanctioned_state', 'arab_adjacent'],
    allies: [
      { countryId: 'ru', type: 'strategic_partner', strength: 62 },
      { countryId: 'cn', type: 'strategic_partner', strength: 55 },
    ],
    adversaries: [
      { countryId: 'us', type: 'adversary', strength: -90 },
      { countryId: 'il', type: 'adversary', strength: -90 },
      { countryId: 'sa', type: 'adversary', strength: -72 },
    ],
    neighbors: [
      { countryId: 'tr', type: 'neutral', strength: -10, sharedBorder: true },
    ],
  },
  jp: {
    governmentCategory: 'constitutional_monarchy',
    governmentType: 'Unitary Parliamentary Constitutional Monarchy',
    governmentName: 'Government of Japan',
    regimeStability: 82,
    tags: ['island_nation', 'great_power', 'coastal', 'g7_member', 'quad_member', 'us_ally'],
    allies: [
      { countryId: 'us', type: 'formal_ally', strength: 88, treaty: 'Treaty of Mutual Cooperation and Security' },
      { countryId: 'au', type: 'strategic_partner', strength: 72, treaty: 'Quad' },
      { countryId: 'in', type: 'strategic_partner', strength: 55, treaty: 'Quad' },
      { countryId: 'kr', type: 'strategic_partner', strength: 42 },
    ],
    adversaries: [
      { countryId: 'cn', type: 'rival', strength: -45 },
      { countryId: 'ru', type: 'rival', strength: -35 },
    ],
    neighbors: [],
  },
  jm: {
    governmentCategory: 'constitutional_monarchy',
    governmentType: 'Unitary Parliamentary Constitutional Monarchy',
    governmentName: 'Government of Jamaica',
    regimeStability: 72,
    tags: ['island_nation', 'small_state', 'coastal', 'anglosphere', 'caricom_member'],
    allies: [
      { countryId: 'gb', type: 'strategic_partner', strength: 65 },
      { countryId: 'us', type: 'strategic_partner', strength: 60 },
    ],
    adversaries: [],
    neighbors: [],
  },
  kr: {
    governmentCategory: 'liberal_democracy',
    governmentType: 'Unitary Presidential Republic',
    governmentName: 'Government of the Republic of Korea',
    regimeStability: 72,
    tags: ['coastal', 'regional_power', 'us_ally', 'land_border_adversary', 'g20_member'],
    allies: [
      { countryId: 'us', type: 'formal_ally', strength: 85, treaty: 'Mutual Defense Treaty' },
      { countryId: 'jp', type: 'strategic_partner', strength: 42 },
      { countryId: 'au', type: 'strategic_partner', strength: 52 },
    ],
    adversaries: [
      { countryId: 'cn', type: 'rival', strength: -30 },
    ],
    neighbors: [],
  },
  mx: {
    governmentCategory: 'liberal_democracy',
    governmentType: 'Federal Presidential Republic',
    governmentName: 'Government of Mexico',
    regimeStability: 52,
    tags: ['coastal', 'regional_power', 'spanish_speaking', 'g20_member', 'north_america'],
    allies: [
      { countryId: 'us', type: 'strategic_partner', strength: 65, treaty: 'CUSMA' },
      { countryId: 'ca', type: 'strategic_partner', strength: 50, treaty: 'CUSMA' },
    ],
    adversaries: [],
    neighbors: [
      { countryId: 'us', type: 'strategic_partner', strength: 65, sharedBorder: true },
    ],
  },
  ng: {
    governmentCategory: 'liberal_democracy',
    governmentType: 'Federal Presidential Republic',
    governmentName: 'Government of Nigeria',
    regimeStability: 40,
    tags: ['coastal', 'regional_power', 'african_union_member', 'ecowas_member', 'fragile_state'],
    allies: [
      { countryId: 'us', type: 'strategic_partner', strength: 38 },
      { countryId: 'gb', type: 'strategic_partner', strength: 40 },
    ],
    adversaries: [],
    neighbors: [],
  },
  ru: {
    governmentCategory: 'authoritarian',
    governmentType: 'Federal Semi-Presidential Republic',
    governmentName: 'Government of the Russian Federation',
    regimeStability: 60,
    tags: ['coastal', 'superpower', 'nuclear_state', 'p5_member', 'great_power', 'arctic_state', 'sanctioned_state'],
    allies: [
      { countryId: 'cn', type: 'strategic_partner', strength: 70 },
      { countryId: 'ir', type: 'strategic_partner', strength: 62 },
    ],
    adversaries: [
      { countryId: 'us', type: 'adversary', strength: -82 },
      { countryId: 'gb', type: 'adversary', strength: -70 },
    ],
    neighbors: [
      { countryId: 'cn', type: 'strategic_partner', strength: 70, sharedBorder: true },
    ],
  },
  sa: {
    governmentCategory: 'absolute_monarchy',
    governmentType: 'Unitary Absolute Monarchy',
    governmentName: 'Government of Saudi Arabia',
    regimeStability: 72,
    tags: ['coastal', 'regional_power', 'arab_league_member', 'gcc_member', 'g20_member', 'arab_speaking', 'energy_exporter'],
    allies: [
      { countryId: 'us', type: 'strategic_partner', strength: 72 },
    ],
    adversaries: [
      { countryId: 'ir', type: 'adversary', strength: -72 },
    ],
    neighbors: [],
  },
  tr: {
    governmentCategory: 'authoritarian',
    governmentType: 'Unitary Presidential Republic',
    governmentName: 'Government of Turkey',
    regimeStability: 55,
    tags: ['coastal', 'regional_power', 'nato_member', 'g20_member', 'land_border_adversary'],
    allies: [],
    adversaries: [
      { countryId: 'ir', type: 'rival', strength: -25 },
    ],
    neighbors: [
      { countryId: 'ir', type: 'rival', strength: -25, sharedBorder: true },
    ],
  },
  us: {
    governmentCategory: 'liberal_democracy',
    governmentType: 'Federal Presidential Republic',
    governmentName: 'Government of the United States',
    regimeStability: 72,
    tags: ['coastal', 'superpower', 'nuclear_state', 'nato_member', 'g7_member', 'p5_member', 'great_power', 'five_eyes'],
    allies: [
      { countryId: 'gb', type: 'formal_ally', strength: 90, treaty: 'NATO, Five Eyes, AUKUS' },
      { countryId: 'jp', type: 'formal_ally', strength: 88, treaty: 'Treaty of Mutual Cooperation' },
      { countryId: 'kr', type: 'formal_ally', strength: 85, treaty: 'Mutual Defense Treaty' },
      { countryId: 'de', type: 'formal_ally', strength: 78, treaty: 'NATO' },
      { countryId: 'fr', type: 'formal_ally', strength: 72, treaty: 'NATO' },
      { countryId: 'ca', type: 'formal_ally', strength: 92, treaty: 'NATO, NORAD, CUSMA' },
      { countryId: 'au', type: 'formal_ally', strength: 88, treaty: 'ANZUS, AUKUS, Five Eyes' },
      { countryId: 'il', type: 'formal_ally', strength: 90 },
    ],
    adversaries: [
      { countryId: 'ru', type: 'adversary', strength: -82 },
      { countryId: 'cn', type: 'rival', strength: -62 },
      { countryId: 'ir', type: 'adversary', strength: -90 },
    ],
    neighbors: [
      { countryId: 'ca', type: 'formal_ally', strength: 92, sharedBorder: true },
      { countryId: 'mx', type: 'strategic_partner', strength: 65, sharedBorder: true },
    ],
  },
  ua: {
    governmentCategory: 'liberal_democracy',
    governmentType: 'Unitary Semi-Presidential Republic',
    governmentName: 'Government of Ukraine',
    regimeStability: 55,
    tags: ['coastal', 'middle_power', 'land_border_adversary', 'nato_candidate', 'eu_candidate', 'at_war'],
    allies: [
      { countryId: 'us', type: 'strategic_partner', strength: 80 },
      { countryId: 'gb', type: 'strategic_partner', strength: 78 },
      { countryId: 'de', type: 'strategic_partner', strength: 70 },
      { countryId: 'fr', type: 'strategic_partner', strength: 65 },
    ],
    adversaries: [
      { countryId: 'ru', type: 'adversary', strength: -95, sharedBorder: true },
    ],
    neighbors: [
      { countryId: 'ru', type: 'adversary', strength: -95, sharedBorder: true },
    ],
  },
  za: {
    governmentCategory: 'liberal_democracy',
    governmentType: 'Unitary Parliamentary Republic',
    governmentName: 'Government of South Africa',
    regimeStability: 52,
    tags: ['coastal', 'regional_power', 'brics_member', 'african_union_member', 'g20_member'],
    allies: [
      { countryId: 'cn', type: 'strategic_partner', strength: 52, treaty: 'BRICS' },
      { countryId: 'in', type: 'strategic_partner', strength: 45, treaty: 'BRICS' },
      { countryId: 'ru', type: 'strategic_partner', strength: 42, treaty: 'BRICS' },
    ],
    adversaries: [],
    neighbors: [],
  },
  id: {
    governmentCategory: 'liberal_democracy',
    governmentType: 'Unitary Presidential Republic',
    governmentName: 'Government of Indonesia',
    regimeStability: 65,
    tags: ['island_nation', 'regional_power', 'coastal', 'asean_member', 'g20_member'],
    allies: [
      { countryId: 'au', type: 'strategic_partner', strength: 48 },
      { countryId: 'us', type: 'strategic_partner', strength: 42 },
      { countryId: 'sg', type: 'strategic_partner', strength: 55 },
    ],
    adversaries: [
      { countryId: 'cn', type: 'rival', strength: -28 },
    ],
    neighbors: [
      { countryId: 'au', type: 'strategic_partner', strength: 48, sharedBorder: false },
      { countryId: 'sg', type: 'strategic_partner', strength: 55, sharedBorder: false },
    ],
  },
  sg: {
    governmentCategory: 'authoritarian',
    governmentType: 'Unitary Parliamentary Republic',
    governmentName: 'Government of Singapore',
    regimeStability: 85,
    tags: ['island_nation', 'small_state', 'coastal', 'asean_member', 'global_hub'],
    allies: [
      { countryId: 'us', type: 'strategic_partner', strength: 68 },
      { countryId: 'au', type: 'strategic_partner', strength: 65 },
      { countryId: 'id', type: 'strategic_partner', strength: 55 },
    ],
    adversaries: [],
    neighbors: [
      { countryId: 'id', type: 'strategic_partner', strength: 55, sharedBorder: false },
    ],
  },
  eg: {
    governmentCategory: 'authoritarian',
    governmentType: 'Unitary Presidential Republic',
    governmentName: 'Government of Egypt',
    regimeStability: 62,
    tags: ['coastal', 'middle_power', 'arab_league_member', 'african_union_member', 'arab_speaking'],
    allies: [
      { countryId: 'sa', type: 'strategic_partner', strength: 60 },
      { countryId: 'us', type: 'strategic_partner', strength: 52 },
    ],
    adversaries: [
      { countryId: 'ir', type: 'adversary', strength: -50 },
    ],
    neighbors: [
      { countryId: 'il', type: 'neutral', strength: 22, sharedBorder: true },
    ],
  },
};

async function run(): Promise<void> {
  const ids = Object.keys(GEOPOLITICAL_PROFILES);
  console.log(`Processing ${ids.length} countries...`);

  for (const id of ids) {
    const profile = GEOPOLITICAL_PROFILES[id];
    const patch = {
      'geopolitical.allies': profile.allies,
      'geopolitical.adversaries': profile.adversaries,
      'geopolitical.neighbors': profile.neighbors,
      'geopolitical.governmentCategory': profile.governmentCategory,
      'geopolitical.regimeStability': profile.regimeStability,
      'geopolitical.tags': profile.tags,
      'geopolitical.governmentType': profile.governmentType,
      'geopolitical.governmentName': profile.governmentName,
    };

    if (WRITE) {
      await db.collection('countries').doc(id).set(patch, { merge: true });
      console.log(`  ✓ ${id}`);
    } else {
      const adversaryList = profile.adversaries.map(a => a.countryId).join(', ') || 'none';
      const allyList = profile.allies.map(a => a.countryId).join(', ') || 'none';
      console.log(`  [dry-run] ${id}: gov=${profile.governmentCategory}, stability=${profile.regimeStability}, allies=[${allyList}], adversaries=[${adversaryList}]`);
    }
  }

  if (!WRITE) {
    console.log('\nDry run complete. Pass --write to apply changes.');
  } else {
    console.log(`\nDone. Updated ${ids.length} countries.`);
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
