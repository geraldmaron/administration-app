/**
 * Populates security institution tokens and office title fields for all 50 countries.
 *
 * Writes to:
 *   - countries/{id}.tokens  (intelligence_agency, domestic_intelligence, security_council, police_force)
 *   - countries/{id}.facts.institutions.office_titles  (military_chief_title, press_secretary_title)
 *
 * Usage: npx tsx functions/src/scripts/populate-security-institutions.ts [--write]
 */

import admin from 'firebase-admin';

const WRITE = process.argv.includes('--write');

if (!admin.apps.length) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const serviceAccount = require('../../../serviceAccountKey.json');
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

interface SecurityData {
  tokens: {
    intelligence_agency: string | null;
    domestic_intelligence: string | null;
    security_council: string | null;
    police_force: string | null;
  };
  office_titles: {
    military_chief_title: string | null;
    press_secretary_title: string | null;
  };
}

const SECURITY_DATA: Record<string, SecurityData> = {
  au: {
    tokens: {
      intelligence_agency: 'Australian Secret Intelligence Service',
      domestic_intelligence: 'Australian Security Intelligence Organisation',
      security_council: 'National Security Committee',
      police_force: 'Australian Federal Police',
    },
    office_titles: { military_chief_title: 'Chief of the Defence Force', press_secretary_title: 'Prime Minister\'s Press Secretary' },
  },
  br: {
    tokens: {
      intelligence_agency: 'Brazilian Intelligence Agency',
      domestic_intelligence: 'Brazilian Intelligence Agency',
      security_council: 'National Defence Council',
      police_force: 'Federal Police',
    },
    office_titles: { military_chief_title: 'Chief of the Joint Staff of the Armed Forces', press_secretary_title: 'Presidential Press Secretary' },
  },
  ca: {
    tokens: {
      intelligence_agency: 'Canadian Security Intelligence Service',
      domestic_intelligence: 'Communications Security Establishment',
      security_council: 'Cabinet Committee on Global Affairs and Public Security',
      police_force: 'Royal Canadian Mounted Police',
    },
    office_titles: { military_chief_title: 'Chief of the Defence Staff', press_secretary_title: 'Director of Communications' },
  },
  cn: {
    tokens: {
      intelligence_agency: 'Ministry of State Security',
      domestic_intelligence: 'Ministry of Public Security',
      security_council: 'National Security Commission',
      police_force: 'People\'s Police',
    },
    office_titles: { military_chief_title: 'Chairman of the Central Military Commission', press_secretary_title: 'State Council Spokesperson' },
  },
  de: {
    tokens: {
      intelligence_agency: 'Federal Intelligence Service',
      domestic_intelligence: 'Federal Office for the Protection of the Constitution',
      security_council: 'Federal Security Council',
      police_force: 'Federal Police',
    },
    office_titles: { military_chief_title: 'Inspector General of the Bundeswehr', press_secretary_title: 'Government Spokesperson' },
  },
  fr: {
    tokens: {
      intelligence_agency: 'General Directorate for External Security',
      domestic_intelligence: 'General Directorate for Internal Security',
      security_council: 'Defence and National Security Council',
      police_force: 'National Police',
    },
    office_titles: { military_chief_title: 'Chief of the Defence Staff', press_secretary_title: 'Government Spokesperson' },
  },
  gb: {
    tokens: {
      intelligence_agency: 'Secret Intelligence Service',
      domestic_intelligence: 'Security Service',
      security_council: 'National Security Council',
      police_force: 'Metropolitan Police Service',
    },
    office_titles: { military_chief_title: 'Chief of the Defence Staff', press_secretary_title: 'Prime Minister\'s Official Spokesperson' },
  },
  gh: {
    tokens: {
      intelligence_agency: 'Bureau of National Investigations',
      domestic_intelligence: 'National Security Secretariat',
      security_council: 'National Security Council',
      police_force: 'Ghana Police Service',
    },
    office_titles: { military_chief_title: 'Chief of Defence Staff', press_secretary_title: 'Presidential Press Secretary' },
  },
  il: {
    tokens: {
      intelligence_agency: 'Mossad',
      domestic_intelligence: 'Shin Bet',
      security_council: 'National Security Council',
      police_force: 'Israel Police',
    },
    office_titles: { military_chief_title: 'Chief of the General Staff', press_secretary_title: 'Prime Minister\'s Spokesperson' },
  },
  ir: {
    tokens: {
      intelligence_agency: 'Ministry of Intelligence',
      domestic_intelligence: 'Ministry of Intelligence',
      security_council: 'Supreme National Security Council',
      police_force: 'Law Enforcement Command',
    },
    office_titles: { military_chief_title: 'Chief of Staff of the Iranian Armed Forces', press_secretary_title: 'Government Spokesperson' },
  },
  in: {
    tokens: {
      intelligence_agency: 'Research and Analysis Wing',
      domestic_intelligence: 'Intelligence Bureau',
      security_council: 'Cabinet Committee on Security',
      police_force: 'Central Reserve Police Force',
    },
    office_titles: { military_chief_title: 'Chief of Defence Staff', press_secretary_title: 'Principal Spokesperson' },
  },
  jm: {
    tokens: {
      intelligence_agency: 'Caribbean Intelligence Corps',
      domestic_intelligence: 'Jamaican Defence Force Intelligence Unit',
      security_council: 'National Security Council',
      police_force: 'Jamaica Constabulary Force',
    },
    office_titles: { military_chief_title: 'Chief of Defence Staff', press_secretary_title: 'Prime Minister\'s Press Secretary' },
  },
  jp: {
    tokens: {
      intelligence_agency: 'Cabinet Intelligence and Research Office',
      domestic_intelligence: 'Public Security Intelligence Agency',
      security_council: 'National Security Council',
      police_force: 'National Police Agency',
    },
    office_titles: { military_chief_title: 'Chief of Joint Staff', press_secretary_title: 'Chief Cabinet Secretary' },
  },
  kr: {
    tokens: {
      intelligence_agency: 'National Intelligence Service',
      domestic_intelligence: 'Defense Security Support Command',
      security_council: 'National Security Council',
      police_force: 'Korean National Police Agency',
    },
    office_titles: { military_chief_title: 'Chairman of the Joint Chiefs of Staff', press_secretary_title: 'Presidential Press Secretary' },
  },
  mx: {
    tokens: {
      intelligence_agency: 'National Intelligence Centre',
      domestic_intelligence: 'National Intelligence Centre',
      security_council: 'National Security Council',
      police_force: 'Federal Police',
    },
    office_titles: { military_chief_title: 'Secretary of National Defence', press_secretary_title: 'Presidential Press Secretary' },
  },
  ng: {
    tokens: {
      intelligence_agency: 'Department of State Services',
      domestic_intelligence: 'Department of State Services',
      security_council: 'National Security Council',
      police_force: 'Nigeria Police Force',
    },
    office_titles: { military_chief_title: 'Chief of Defence Staff', press_secretary_title: 'Presidential Spokesperson' },
  },
  ru: {
    tokens: {
      intelligence_agency: 'Foreign Intelligence Service',
      domestic_intelligence: 'Federal Security Service',
      security_council: 'Security Council',
      police_force: 'Ministry of Internal Affairs',
    },
    office_titles: { military_chief_title: 'Chief of the General Staff', press_secretary_title: 'Presidential Press Secretary' },
  },
  sa: {
    tokens: {
      intelligence_agency: 'General Intelligence Directorate',
      domestic_intelligence: 'General Directorate of Investigation',
      security_council: 'National Security Council',
      police_force: 'Saudi Police',
    },
    office_titles: { military_chief_title: 'Chief of General Staff', press_secretary_title: 'Royal Court Media Advisor' },
  },
  tr: {
    tokens: {
      intelligence_agency: 'National Intelligence Organisation',
      domestic_intelligence: 'National Intelligence Organisation',
      security_council: 'National Security Council',
      police_force: 'Turkish National Police',
    },
    office_titles: { military_chief_title: 'Chief of the General Staff', press_secretary_title: 'Presidential Communications Director' },
  },
  us: {
    tokens: {
      intelligence_agency: 'Central Intelligence Agency',
      domestic_intelligence: 'Federal Bureau of Investigation',
      security_council: 'National Security Council',
      police_force: 'Department of Homeland Security',
    },
    office_titles: { military_chief_title: 'Chairman of the Joint Chiefs of Staff', press_secretary_title: 'White House Press Secretary' },
  },
  ua: {
    tokens: {
      intelligence_agency: 'Security Service of Ukraine',
      domestic_intelligence: 'Department of Counterintelligence',
      security_council: 'National Security and Defence Council',
      police_force: 'National Police of Ukraine',
    },
    office_titles: {
      military_chief_title: 'Commander-in-Chief of the Armed Forces',
      press_secretary_title: 'Presidential Spokesperson',
    },
  },
  za: {
    tokens: {
      intelligence_agency: 'State Security Agency',
      domestic_intelligence: 'Domestic Branch — State Security Agency',
      security_council: 'National Security Council',
      police_force: 'South African Police Service',
    },
    office_titles: {
      military_chief_title: 'Chief of the South African National Defence Force',
      press_secretary_title: 'Presidential Spokesperson',
    },
  },
  id: {
    tokens: {
      intelligence_agency: 'Badan Intelijen Negara',
      domestic_intelligence: 'Badan Intelijen dan Keamanan POLRI',
      security_council: 'Dewan Ketahanan Nasional',
      police_force: 'Kepolisian Negara Republik Indonesia',
    },
    office_titles: {
      military_chief_title: 'Panglima Tentara Nasional Indonesia',
      press_secretary_title: 'Presidential Spokesperson',
    },
  },
  sg: {
    tokens: {
      intelligence_agency: 'Singapore Intelligence Service',
      domestic_intelligence: 'Internal Security Department',
      security_council: 'National Security Coordination Secretariat',
      police_force: 'Singapore Police Force',
    },
    office_titles: {
      military_chief_title: 'Chief of Defence Force',
      press_secretary_title: 'Press Secretary to the Prime Minister',
    },
  },
  eg: {
    tokens: {
      intelligence_agency: 'General Intelligence Service',
      domestic_intelligence: 'National Security Sector',
      security_council: 'National Defence Council',
      police_force: 'Egyptian National Police',
    },
    office_titles: {
      military_chief_title: 'Chief of Staff of the Armed Forces',
      press_secretary_title: 'Presidential Spokesperson',
    },
  },
};

async function run(): Promise<void> {
  const countryIds = Object.keys(SECURITY_DATA);
  console.log(`Processing ${countryIds.length} countries — ${WRITE ? 'WRITING' : 'DRY RUN'}`);

  let updated = 0;
  for (const countryId of countryIds) {
    const data = SECURITY_DATA[countryId];
    const ref = db.collection('countries').doc(countryId);
    const snap = await ref.get();
    if (!snap.exists) {
      console.warn(`  ${countryId}: document not found — skipping`);
      continue;
    }

    const tokenUpdates: Record<string, string | null> = {};
    for (const [key, value] of Object.entries(data.tokens)) {
      tokenUpdates[`tokens.${key}`] = value;
    }
    const officeTitleUpdates: Record<string, string | null> = {};
    for (const [key, value] of Object.entries(data.office_titles)) {
      if (value !== null) {
        officeTitleUpdates[`facts.institutions.office_titles.${key}`] = value;
      }
    }

    const allUpdates = { ...tokenUpdates, ...officeTitleUpdates };
    console.log(`  ${countryId}: ${Object.keys(allUpdates).length} fields`);

    if (WRITE) {
      await ref.update(allUpdates);
      updated++;
    }
  }

  console.log(`\nDone — ${WRITE ? `updated ${updated}` : 'no writes (dry run)'}`);
}

run().catch(err => { console.error(err); process.exit(1); });
