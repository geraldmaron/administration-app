/**
 * Populates military capability profiles on all 50 country documents.
 *
 * Writes to countries/{id}.military with:
 *   doctrine, overall_readiness, branches (with token_key, local_name, size, readiness, equipment_level),
 *   nuclear (warheads, delivery_systems, doctrine), cyber (offensive, defensive, units)
 *
 * Usage: npx tsx functions/src/scripts/populate-military-capabilities.ts [--write]
 */

import admin from 'firebase-admin';

const WRITE = process.argv.includes('--write');

if (!admin.apps.length) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const serviceAccount = require('../../../serviceAccountKey.json');
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

interface BranchProfile {
  token_key: string;
  local_name: string;
  size: number;       // thousands of active personnel
  readiness: number;  // 0–100
  equipment_level: number; // 0–100
}

interface NuclearProfile {
  warheads: number;
  delivery_systems: string[];
  doctrine: string;
}

interface CyberProfile {
  offensive: number;  // 0–100
  defensive: number;  // 0–100
  units: string;
}

interface MilitaryCapabilityPatch {
  doctrine: string;
  overall_readiness: number;
  branches: Record<string, BranchProfile>;
  nuclear?: NuclearProfile;
  cyber: CyberProfile;
}

const MILITARY_PROFILES: Record<string, MilitaryCapabilityPatch> = {
  au: {
    doctrine: 'power_projection',
    overall_readiness: 78,
    branches: {
      army: { token_key: 'ground_forces_branch', local_name: 'Australian Army', size: 28, readiness: 78, equipment_level: 80 },
      navy: { token_key: 'maritime_branch', local_name: 'Royal Australian Navy', size: 14, readiness: 80, equipment_level: 82 },
      air_force: { token_key: 'air_branch', local_name: 'Royal Australian Air Force', size: 14, readiness: 80, equipment_level: 85 },
    },
    cyber: { offensive: 60, defensive: 72, units: 'Australian Signals Directorate' },
  },
  br: {
    doctrine: 'regional_dominance',
    overall_readiness: 62,
    branches: {
      army: { token_key: 'ground_forces_branch', local_name: 'Exército Brasileiro', size: 220, readiness: 60, equipment_level: 55 },
      navy: { token_key: 'maritime_branch', local_name: 'Marinha do Brasil', size: 70, readiness: 65, equipment_level: 65 },
      air_force: { token_key: 'air_branch', local_name: 'Força Aérea Brasileira', size: 67, readiness: 65, equipment_level: 65 },
      marines: { token_key: 'special_forces', local_name: 'Corpo de Fuzileiros Navais', size: 16, readiness: 72, equipment_level: 68 },
    },
    cyber: { offensive: 45, defensive: 55, units: 'Comando de Defesa Cibernética' },
  },
  ca: {
    doctrine: 'collective_defense',
    overall_readiness: 72,
    branches: {
      army: { token_key: 'ground_forces_branch', local_name: 'Canadian Army', size: 22, readiness: 70, equipment_level: 75 },
      navy: { token_key: 'maritime_branch', local_name: 'Royal Canadian Navy', size: 8, readiness: 72, equipment_level: 72 },
      air_force: { token_key: 'air_branch', local_name: 'Royal Canadian Air Force', size: 12, readiness: 75, equipment_level: 78 },
    },
    cyber: { offensive: 55, defensive: 68, units: 'Communications Security Establishment' },
  },
  cn: {
    doctrine: 'anti_access_area_denial',
    overall_readiness: 82,
    branches: {
      army: { token_key: 'ground_forces_branch', local_name: 'People\'s Liberation Army Ground Force', size: 965, readiness: 78, equipment_level: 78 },
      navy: { token_key: 'maritime_branch', local_name: 'People\'s Liberation Army Navy', size: 250, readiness: 82, equipment_level: 82 },
      air_force: { token_key: 'air_branch', local_name: 'People\'s Liberation Army Air Force', size: 395, readiness: 80, equipment_level: 82 },
      rocket_force: { token_key: 'strategic_nuclear_branch', local_name: 'People\'s Liberation Army Rocket Force', size: 120, readiness: 88, equipment_level: 90 },
      strategic_support: { token_key: 'intel_branch', local_name: 'PLA Strategic Support Force', size: 145, readiness: 85, equipment_level: 88 },
    },
    nuclear: { warheads: 410, delivery_systems: ['ICBM', 'SLBM', 'Strategic Bomber'], doctrine: 'no_first_use' },
    cyber: { offensive: 95, defensive: 88, units: 'PLA Strategic Support Force Cyber Corps' },
  },
  de: {
    doctrine: 'collective_defense',
    overall_readiness: 68,
    branches: {
      army: { token_key: 'ground_forces_branch', local_name: 'Heer', size: 64, readiness: 65, equipment_level: 78 },
      navy: { token_key: 'maritime_branch', local_name: 'Deutsche Marine', size: 16, readiness: 70, equipment_level: 80 },
      air_force: { token_key: 'air_branch', local_name: 'Luftwaffe', size: 27, readiness: 68, equipment_level: 78 },
      cyber_space: { token_key: 'intel_branch', local_name: 'Cyber- und Informationsdomäne', size: 14, readiness: 75, equipment_level: 82 },
    },
    cyber: { offensive: 62, defensive: 72, units: 'Kommando Cyber- und Informationsdomäne' },
  },
  fr: {
    doctrine: 'power_projection',
    overall_readiness: 80,
    branches: {
      army: { token_key: 'ground_forces_branch', local_name: 'Armée de Terre', size: 115, readiness: 78, equipment_level: 85 },
      navy: { token_key: 'maritime_branch', local_name: 'Marine nationale', size: 35, readiness: 82, equipment_level: 88 },
      air_force: { token_key: 'air_branch', local_name: 'Armée de l\'Air et de l\'Espace', size: 40, readiness: 82, equipment_level: 88 },
      foreign_legion: { token_key: 'special_forces', local_name: 'Légion étrangère', size: 8, readiness: 90, equipment_level: 88 },
    },
    nuclear: { warheads: 290, delivery_systems: ['SLBM', 'Air-launched cruise missile'], doctrine: 'minimum_deterrence' },
    cyber: { offensive: 68, defensive: 75, units: 'Commandement de la cyberdéfense' },
  },
  gb: {
    doctrine: 'power_projection',
    overall_readiness: 78,
    branches: {
      army: { token_key: 'ground_forces_branch', local_name: 'British Army', size: 79, readiness: 76, equipment_level: 85 },
      navy: { token_key: 'maritime_branch', local_name: 'Royal Navy', size: 33, readiness: 80, equipment_level: 88 },
      air_force: { token_key: 'air_branch', local_name: 'Royal Air Force', size: 32, readiness: 80, equipment_level: 88 },
      marines: { token_key: 'special_forces', local_name: 'Royal Marines', size: 7, readiness: 90, equipment_level: 88 },
    },
    nuclear: { warheads: 225, delivery_systems: ['SLBM'], doctrine: 'minimum_deterrence' },
    cyber: { offensive: 78, defensive: 80, units: 'National Cyber Force' },
  },
  gh: {
    doctrine: 'territorial_defense',
    overall_readiness: 48,
    branches: {
      army: { token_key: 'ground_forces_branch', local_name: 'Ghana Army', size: 11, readiness: 48, equipment_level: 40 },
      navy: { token_key: 'maritime_branch', local_name: 'Ghana Navy', size: 2, readiness: 45, equipment_level: 38 },
      air_force: { token_key: 'air_branch', local_name: 'Ghana Air Force', size: 2, readiness: 45, equipment_level: 38 },
    },
    cyber: { offensive: 10, defensive: 22, units: 'Cyber Security Authority' },
  },
  il: {
    doctrine: 'preemptive_defense',
    overall_readiness: 90,
    branches: {
      army: { token_key: 'ground_forces_branch', local_name: 'Tzva HaHagana LeYisra\'el — Khoyl HaYabasha', size: 126, readiness: 90, equipment_level: 95 },
      navy: { token_key: 'maritime_branch', local_name: 'Khoyl HaYam', size: 10, readiness: 88, equipment_level: 92 },
      air_force: { token_key: 'air_branch', local_name: 'Khoyl HaAvir VeHakhalal', size: 34, readiness: 92, equipment_level: 97 },
      intelligence: { token_key: 'intel_branch', local_name: 'Aman', size: 7, readiness: 95, equipment_level: 98 },
    },
    nuclear: { warheads: 90, delivery_systems: ['ICBM', 'SLBM', 'Air-launched'], doctrine: 'ambiguity' },
    cyber: { offensive: 96, defensive: 92, units: 'Unit 8200' },
  },
  in: {
    doctrine: 'strategic_deterrence',
    overall_readiness: 72,
    branches: {
      army: { token_key: 'ground_forces_branch', local_name: 'Indian Army', size: 1237, readiness: 70, equipment_level: 70 },
      navy: { token_key: 'maritime_branch', local_name: 'Indian Navy', size: 67, readiness: 75, equipment_level: 75 },
      air_force: { token_key: 'air_branch', local_name: 'Indian Air Force', size: 140, readiness: 72, equipment_level: 75 },
      strategic_forces: { token_key: 'strategic_nuclear_branch', local_name: 'Strategic Forces Command', size: 6, readiness: 85, equipment_level: 88 },
    },
    nuclear: { warheads: 164, delivery_systems: ['ICBM', 'SLBM', 'Air-launched'], doctrine: 'no_first_use' },
    cyber: { offensive: 62, defensive: 68, units: 'Defence Cyber Agency' },
  },
  ir: {
    doctrine: 'asymmetric_warfare',
    overall_readiness: 70,
    branches: {
      army: { token_key: 'ground_forces_branch', local_name: 'Artesh Ground Forces', size: 350, readiness: 65, equipment_level: 60 },
      navy: { token_key: 'maritime_branch', local_name: 'Artesh Navy', size: 18, readiness: 65, equipment_level: 58 },
      air_force: { token_key: 'air_branch', local_name: 'Artesh Air Force', size: 37, readiness: 62, equipment_level: 55 },
      irgc: { token_key: 'paramilitary_branch', local_name: 'Islamic Revolutionary Guard Corps', size: 125, readiness: 80, equipment_level: 72 },
      irgc_quds: { token_key: 'special_forces', local_name: 'IRGC Quds Force', size: 5, readiness: 85, equipment_level: 75 },
    },
    cyber: { offensive: 72, defensive: 62, units: 'IRGC Cyber Command' },
  },
  jp: {
    doctrine: 'active_defense',
    overall_readiness: 82,
    branches: {
      army: { token_key: 'ground_forces_branch', local_name: 'Japan Ground Self-Defense Force', size: 151, readiness: 82, equipment_level: 85 },
      navy: { token_key: 'maritime_branch', local_name: 'Japan Maritime Self-Defense Force', size: 45, readiness: 85, equipment_level: 90 },
      air_force: { token_key: 'air_branch', local_name: 'Japan Air Self-Defense Force', size: 47, readiness: 85, equipment_level: 90 },
      cyber_defense: { token_key: 'intel_branch', local_name: 'Self-Defense Force Cyber Defense Command', size: 4, readiness: 82, equipment_level: 88 },
    },
    cyber: { offensive: 58, defensive: 78, units: 'Self-Defense Force Cyber Defense Command' },
  },
  jm: {
    doctrine: 'territorial_defense',
    overall_readiness: 38,
    branches: {
      army: { token_key: 'ground_forces_branch', local_name: 'Jamaica Regiment', size: 3, readiness: 38, equipment_level: 30 },
      coast_guard: { token_key: 'maritime_branch', local_name: 'Jamaica Defence Force Coast Guard', size: 0.3, readiness: 40, equipment_level: 32 },
      air_wing: { token_key: 'air_branch', local_name: 'Jamaica Defence Force Air Wing', size: 0.2, readiness: 38, equipment_level: 30 },
    },
    cyber: { offensive: 5, defensive: 15, units: 'Cyber Incident Response Team' },
  },
  kr: {
    doctrine: 'deterrence_by_denial',
    overall_readiness: 86,
    branches: {
      army: { token_key: 'ground_forces_branch', local_name: 'Republic of Korea Army', size: 420, readiness: 85, equipment_level: 88 },
      navy: { token_key: 'maritime_branch', local_name: 'Republic of Korea Navy', size: 70, readiness: 86, equipment_level: 90 },
      air_force: { token_key: 'air_branch', local_name: 'Republic of Korea Air Force', size: 65, readiness: 86, equipment_level: 90 },
      marines: { token_key: 'special_forces', local_name: 'Republic of Korea Marine Corps', size: 29, readiness: 88, equipment_level: 88 },
      cyber_command: { token_key: 'intel_branch', local_name: 'Republic of Korea Cyber Command', size: 5, readiness: 88, equipment_level: 92 },
    },
    cyber: { offensive: 72, defensive: 82, units: 'Republic of Korea Cyber Command' },
  },
  mx: {
    doctrine: 'internal_security',
    overall_readiness: 55,
    branches: {
      army: { token_key: 'ground_forces_branch', local_name: 'Ejército Mexicano', size: 212, readiness: 55, equipment_level: 50 },
      navy: { token_key: 'maritime_branch', local_name: 'Armada de México', size: 56, readiness: 58, equipment_level: 55 },
      air_force: { token_key: 'air_branch', local_name: 'Fuerza Aérea Mexicana', size: 12, readiness: 55, equipment_level: 52 },
      national_guard: { token_key: 'paramilitary_branch', local_name: 'Guardia Nacional', size: 130, readiness: 58, equipment_level: 52 },
    },
    cyber: { offensive: 32, defensive: 45, units: 'Guardia Nacional — División Científica' },
  },
  ng: {
    doctrine: 'regional_stability',
    overall_readiness: 48,
    branches: {
      army: { token_key: 'ground_forces_branch', local_name: 'Nigerian Army', size: 100, readiness: 48, equipment_level: 38 },
      navy: { token_key: 'maritime_branch', local_name: 'Nigerian Navy', size: 8, readiness: 45, equipment_level: 35 },
      air_force: { token_key: 'air_branch', local_name: 'Nigerian Air Force', size: 10, readiness: 48, equipment_level: 40 },
    },
    cyber: { offensive: 18, defensive: 28, units: 'Office of the National Security Adviser — Cyber Division' },
  },
  ru: {
    doctrine: 'escalate_to_deescalate',
    overall_readiness: 76,
    branches: {
      army: { token_key: 'ground_forces_branch', local_name: 'Сухопутные войска России', size: 550, readiness: 72, equipment_level: 72 },
      navy: { token_key: 'maritime_branch', local_name: 'Военно-морской флот России', size: 150, readiness: 72, equipment_level: 72 },
      air_force: { token_key: 'air_branch', local_name: 'Воздушно-космические силы России', size: 165, readiness: 75, equipment_level: 78 },
      strategic_rocket: { token_key: 'strategic_nuclear_branch', local_name: 'Ракетные войска стратегического назначения', size: 50, readiness: 90, equipment_level: 90 },
      national_guard: { token_key: 'paramilitary_branch', local_name: 'Росгвардия', size: 340, readiness: 72, equipment_level: 68 },
    },
    nuclear: { warheads: 5977, delivery_systems: ['ICBM', 'SLBM', 'Strategic Bomber', 'Tactical'], doctrine: 'escalate_to_deescalate' },
    cyber: { offensive: 90, defensive: 80, units: 'FSB Center for Information Security / GRU Cyber Units' },
  },
  sa: {
    doctrine: 'power_projection',
    overall_readiness: 72,
    branches: {
      army: { token_key: 'ground_forces_branch', local_name: 'Royal Saudi Land Forces', size: 75, readiness: 70, equipment_level: 85 },
      navy: { token_key: 'maritime_branch', local_name: 'Royal Saudi Naval Forces', size: 14, readiness: 70, equipment_level: 82 },
      air_force: { token_key: 'air_branch', local_name: 'Royal Saudi Air Force', size: 20, readiness: 75, equipment_level: 90 },
      national_guard: { token_key: 'paramilitary_branch', local_name: 'Saudi Arabian National Guard', size: 100, readiness: 72, equipment_level: 82 },
      special_forces: { token_key: 'special_forces', local_name: 'Saudi Special Forces', size: 5, readiness: 80, equipment_level: 88 },
    },
    cyber: { offensive: 50, defensive: 60, units: 'National Cybersecurity Authority' },
  },
  tr: {
    doctrine: 'power_projection',
    overall_readiness: 76,
    branches: {
      army: { token_key: 'ground_forces_branch', local_name: 'Türk Kara Kuvvetleri', size: 355, readiness: 75, equipment_level: 78 },
      navy: { token_key: 'maritime_branch', local_name: 'Türk Deniz Kuvvetleri', size: 45, readiness: 75, equipment_level: 78 },
      air_force: { token_key: 'air_branch', local_name: 'Türk Hava Kuvvetleri', size: 60, readiness: 78, equipment_level: 80 },
      gendarmerie: { token_key: 'paramilitary_branch', local_name: 'Jandarma Genel Komutanlığı', size: 100, readiness: 70, equipment_level: 70 },
      special_forces: { token_key: 'special_forces', local_name: 'Özel Kuvvetler Komutanlığı', size: 6, readiness: 88, equipment_level: 82 },
    },
    cyber: { offensive: 58, defensive: 65, units: 'Cyber Security Presidency' },
  },
  us: {
    doctrine: 'power_projection',
    overall_readiness: 90,
    branches: {
      army: { token_key: 'ground_forces_branch', local_name: 'United States Army', size: 453, readiness: 88, equipment_level: 95 },
      navy: { token_key: 'maritime_branch', local_name: 'United States Navy', size: 347, readiness: 90, equipment_level: 97 },
      air_force: { token_key: 'air_branch', local_name: 'United States Air Force', size: 333, readiness: 90, equipment_level: 97 },
      marine_corps: { token_key: 'special_forces', local_name: 'United States Marine Corps', size: 180, readiness: 90, equipment_level: 95 },
      space_force: { token_key: 'intel_branch', local_name: 'United States Space Force', size: 9, readiness: 92, equipment_level: 99 },
      strategic_command: { token_key: 'strategic_nuclear_branch', local_name: 'United States Strategic Command', size: 10, readiness: 95, equipment_level: 99 },
    },
    nuclear: { warheads: 5550, delivery_systems: ['ICBM', 'SLBM', 'Strategic Bomber'], doctrine: 'flexible_response' },
    cyber: { offensive: 98, defensive: 95, units: 'United States Cyber Command' },
  },
  ua: {
    doctrine: 'active_defense',
    overall_readiness: 82,
    branches: {
      army: { token_key: 'ground_forces_branch', local_name: 'Сухопутні війська України', size: 200, readiness: 85, equipment_level: 72 },
      navy: { token_key: 'maritime_branch', local_name: 'Військово-Морські Сили України', size: 10, readiness: 75, equipment_level: 62 },
      air_force: { token_key: 'air_branch', local_name: 'Повітряні Сили України', size: 35, readiness: 80, equipment_level: 70 },
      national_guard: { token_key: 'paramilitary_branch', local_name: 'Національна гвардія України', size: 60, readiness: 82, equipment_level: 68 },
      special_operations: { token_key: 'special_forces', local_name: 'Сили спеціальних операцій України', size: 10, readiness: 90, equipment_level: 80 },
    },
    cyber: { offensive: 68, defensive: 72, units: 'State Service of Special Communications and Information Protection' },
  },
  za: {
    doctrine: 'regional_stability',
    overall_readiness: 52,
    branches: {
      army: { token_key: 'ground_forces_branch', local_name: 'South African Army', size: 37, readiness: 52, equipment_level: 48 },
      navy: { token_key: 'maritime_branch', local_name: 'South African Navy', size: 7, readiness: 52, equipment_level: 50 },
      air_force: { token_key: 'air_branch', local_name: 'South African Air Force', size: 10, readiness: 52, equipment_level: 50 },
    },
    cyber: { offensive: 25, defensive: 40, units: 'State Security Agency — Signals Intelligence' },
  },
  id: {
    doctrine: 'archipelago_defense',
    overall_readiness: 62,
    branches: {
      army: { token_key: 'ground_forces_branch', local_name: 'Tentara Nasional Indonesia Angkatan Darat', size: 300, readiness: 62, equipment_level: 55 },
      navy: { token_key: 'maritime_branch', local_name: 'Tentara Nasional Indonesia Angkatan Laut', size: 72, readiness: 62, equipment_level: 58 },
      air_force: { token_key: 'air_branch', local_name: 'Tentara Nasional Indonesia Angkatan Udara', size: 30, readiness: 62, equipment_level: 60 },
      marine_corps: { token_key: 'special_forces', local_name: 'Korps Marinir', size: 20, readiness: 68, equipment_level: 62 },
    },
    cyber: { offensive: 38, defensive: 48, units: 'Badan Siber dan Sandi Negara' },
  },
  sg: {
    doctrine: 'deterrence_by_punishment',
    overall_readiness: 85,
    branches: {
      army: { token_key: 'ground_forces_branch', local_name: 'Singapore Army', size: 50, readiness: 85, equipment_level: 92 },
      navy: { token_key: 'maritime_branch', local_name: 'Republic of Singapore Navy', size: 9, readiness: 85, equipment_level: 92 },
      air_force: { token_key: 'air_branch', local_name: 'Republic of Singapore Air Force', size: 13, readiness: 88, equipment_level: 95 },
    },
    cyber: { offensive: 72, defensive: 85, units: 'Cyber Security Agency of Singapore' },
  },
  eg: {
    doctrine: 'territorial_defense',
    overall_readiness: 68,
    branches: {
      army: { token_key: 'ground_forces_branch', local_name: 'Egyptian Army', size: 310, readiness: 65, equipment_level: 62 },
      navy: { token_key: 'maritime_branch', local_name: 'Egyptian Navy', size: 20, readiness: 65, equipment_level: 65 },
      air_force: { token_key: 'air_branch', local_name: 'Egyptian Air Force', size: 30, readiness: 72, equipment_level: 72 },
      air_defense: { token_key: 'paramilitary_branch', local_name: 'Egyptian Air Defense Command', size: 80, readiness: 68, equipment_level: 68 },
    },
    cyber: { offensive: 40, defensive: 50, units: 'Egyptian Cyber Agency' },
  },
};

async function run(): Promise<void> {
  const ids = Object.keys(MILITARY_PROFILES);
  console.log(`Processing ${ids.length} countries...`);

  for (const id of ids) {
    const profile = MILITARY_PROFILES[id];
    const patch: Record<string, unknown> = {
      'military.doctrine': profile.doctrine,
      'military.overall_readiness': profile.overall_readiness,
      'military.branches': profile.branches,
      'military.cyber': profile.cyber,
    };
    if (profile.nuclear) {
      patch['military.nuclear'] = profile.nuclear;
    }

    if (WRITE) {
      await db.collection('countries').doc(id).set(patch, { merge: true });
      console.log(`  ✓ ${id}`);
    } else {
      console.log(`  [dry-run] ${id}: doctrine=${profile.doctrine}, readiness=${profile.overall_readiness}, branches=${Object.keys(profile.branches).length}, cyber_off=${profile.cyber.offensive}${profile.nuclear ? ', nuclear=true' : ''}`);
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
