/**
 * Populates the judicial_role token on all game country documents in Firestore.
 *
 * The judicial_role token represents the name of the country's highest court or
 * primary judicial body used in scenario text (e.g. "the Supreme Court ruled…").
 *
 * Runs as a dry-run by default; pass --write to commit to Firestore.
 * Never overwrites an existing non-null judicial_role value.
 */

import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const WRITE = process.argv.includes('--write');

const JUDICIAL_ROLES: Record<string, string> = {
  au: 'High Court of Australia',
  br: 'Supreme Federal Tribunal',
  ca: 'Supreme Court of Canada',
  cn: 'Supreme People\'s Court',
  de: 'Federal Constitutional Court',
  eg: 'Supreme Constitutional Court',
  fr: 'Constitutional Council',
  gb: 'Supreme Court of the United Kingdom',
  gh: 'Supreme Court of Ghana',
  id: 'Supreme Court of Indonesia',
  il: 'Supreme Court of Israel',
  in: 'Supreme Court of India',
  ir: 'Guardian Council',
  jm: 'Supreme Court of Jamaica',
  jp: 'Supreme Court of Japan',
  kr: 'Constitutional Court of Korea',
  mx: 'Supreme Court of Justice of the Nation',
  ng: 'Supreme Court of Nigeria',
  ru: 'Constitutional Court of Russia',
  sa: 'Supreme Court of Saudi Arabia',
  sg: 'Supreme Court of Singapore',
  tr: 'Constitutional Court of Turkey',
  ua: 'Constitutional Court of Ukraine',
  us: 'Supreme Court',
  za: 'Constitutional Court of South Africa',
};

async function main(): Promise<void> {
  initializeApp();
  const db = getFirestore();

  const snap = await db.collection('countries').get();
  console.log(`Found ${snap.size} countries. Mode: ${WRITE ? 'WRITE' : 'DRY RUN'}`);

  let updated = 0;
  let skipped = 0;
  const missing: string[] = [];

  for (const doc of snap.docs) {
    const id = doc.id;
    const judicialRole = JUDICIAL_ROLES[id];

    if (!judicialRole) {
      missing.push(id);
      continue;
    }

    const existing = (doc.data().tokens ?? {}) as Record<string, string | null>;

    if (existing['judicial_role']) {
      skipped++;
      continue;
    }

    if (WRITE) {
      await doc.ref.update({ [`tokens.judicial_role`]: judicialRole });
      console.log(`  ${id}: set judicial_role = "${judicialRole}"`);
    } else {
      console.log(`  ${id}: would set judicial_role = "${judicialRole}"`);
    }
    updated++;
  }

  console.log(`\nSummary: ${updated} countries to update, ${skipped} already have judicial_role`);
  if (missing.length > 0) {
    console.warn(`WARNING: no judicial_role defined for country IDs: ${missing.join(', ')}`);
  }
  if (!WRITE) {
    console.log('\nDry run complete. Pass --write to apply changes.');
  } else {
    console.log('Write complete.');
  }
}

if (require.main === module) {
  main().catch(console.error).finally(() => process.exit(0));
}
