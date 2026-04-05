import * as path from 'path';
import * as fs from 'fs';

const WRITE = process.argv.includes('--write');

const TOKEN_RENAMES: Record<string, string> = {
  ruling_party: 'governing_party',
  ruling_party_leader: 'governing_party_leader',
  ruling_party_ideology: 'governing_party_ideology',
  army_name: 'ground_forces_branch',
  naval_fleet: 'maritime_branch',
  air_wing: 'air_branch',
  cyber_agency: 'cyber_branch',
  military_branch: 'armed_forces_name',
};

const TOKENS_TO_REMOVE = [
  'ruling_party',
  'ruling_party_leader',
  'ruling_party_ideology',
  'opposition_leader',
  'ruling_party_short',
  'army_name',
  'naval_fleet',
  'air_wing',
  'cyber_agency',
  'military_branch',
];

function loadEnvFromFile(): void {
  const envPaths = ['.env.cli', '.env.local', '.env'].map(
    (f) => path.join(__dirname, '..', '..', f),
  );
  for (const envPath of envPaths) {
    if (!fs.existsSync(envPath)) continue;
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (!(key in process.env)) process.env[key] = val;
    }
  }
}

loadEnvFromFile();

const serviceAccountPath = path.join(__dirname, '..', '..', '..', 'serviceAccountKey.json');

async function initializeFirebase(): Promise<typeof import('firebase-admin')> {
  const admin = await import('firebase-admin');
  if (!admin.apps.length) {
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'the-administration-3a072',
      });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp({ projectId: 'the-administration-3a072' });
    } else {
      console.error('[migrate] No Firebase credentials found.');
      process.exit(1);
    }
  }
  return admin;
}

async function main(): Promise<void> {
  const admin = await initializeFirebase();
  const db = admin.firestore();

  console.log(`[migrate-token-renames] ${WRITE ? 'WRITE' : 'DRY RUN'} mode\n`);

  const snap = await db.collection('countries').get();
  let updated = 0;
  let skipped = 0;

  for (const doc of snap.docs) {
    const id = doc.id;
    const existing = (doc.data().tokens ?? {}) as Record<string, string | null>;
    const newTokens = { ...existing };
    const changes: string[] = [];

    for (const [oldKey, newKey] of Object.entries(TOKEN_RENAMES)) {
      if (oldKey in newTokens && !(newKey in newTokens)) {
        newTokens[newKey] = newTokens[oldKey];
        changes.push(`rename ${oldKey} → ${newKey}`);
      }
    }

    for (const key of TOKENS_TO_REMOVE) {
      if (key in newTokens) {
        delete newTokens[key];
        if (!changes.some(c => c.includes(key))) {
          changes.push(`remove ${key}`);
        }
      }
    }

    if (changes.length === 0) {
      skipped++;
      continue;
    }

    if (WRITE) {
      await doc.ref.update({ tokens: newTokens });
    }

    console.log(`  ${id}: ${changes.join(', ')}`);
    updated++;
  }

  console.log(`\nSummary: ${updated} countries updated, ${skipped} already clean`);
  if (!WRITE) {
    console.log('Dry run complete. Pass --write to apply changes.');
  } else {
    console.log('Write complete.');
  }
}

if (require.main === module) {
  main().catch(console.error).finally(() => process.exit(0));
}
