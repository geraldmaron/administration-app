import * as path from 'path';
import * as fs from 'fs';

const WRITE = process.argv.includes('--write');
const FORCE = process.argv.includes('--force');

const TEMPLATES = [
  { name: 'drafter_details', file: 'drafter.prompt.md', version: '2.1.0', description: 'Drafter constraints prompt — token, voice, structure, and quality rules' },
  { name: 'architect_drafter', file: 'architect.prompt.md', version: '2.1.0', description: 'Architect concept generation prompt' },
  { name: 'reflection', file: 'reflection.prompt.md', version: '2.1.0', description: 'Drafter self-audit checklist before scenario submission' },
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
      console.error('[seed-prompts] No Firebase credentials found.');
      process.exit(1);
    }
  }
  return admin;
}

async function main(): Promise<void> {
  const promptsDir = path.join(__dirname, '..', 'prompts');
  const admin = await initializeFirebase();
  const db = admin.firestore();

  console.log(`[seed-prompt-templates] ${WRITE ? 'WRITE' : 'DRY RUN'} mode\n`);

  for (const tpl of TEMPLATES) {
    const filePath = path.join(promptsDir, tpl.file);
    if (!fs.existsSync(filePath)) {
      console.error(`  MISSING: ${tpl.file}`);
      continue;
    }
    const content = fs.readFileSync(filePath, 'utf8');

    const existing = await db.collection('prompt_templates')
      .where('name', '==', tpl.name)
      .where('active', '==', true)
      .limit(1)
      .get();

    if (!existing.empty && !FORCE) {
      const doc = existing.docs[0].data();
      console.log(`  SKIP ${tpl.name} (v${doc.version} active) — pass --force to overwrite`);
      continue;
    }

    if (!existing.empty && FORCE) {
      await existing.docs[0].ref.update({ active: false });
    }

    const now = admin.firestore.Timestamp.now();
    const doc = {
      name: tpl.name,
      version: tpl.version,
      description: tpl.description,
      active: true,
      createdAt: now,
      updatedAt: now,
      sections: {
        constraints: content,
        outputFormat: '',
      },
      metadata: {
        createdBy: 'seed-prompt-templates',
      },
    };

    if (WRITE) {
      await db.collection('prompt_templates').add(doc);
      console.log(`  WROTE ${tpl.name} v${tpl.version}`);
    } else {
      console.log(`  WOULD WRITE ${tpl.name} v${tpl.version} (${content.length} chars)`);
    }
  }

  if (!WRITE) {
    console.log('\nDry run complete. Pass --write to apply. Pass --force to overwrite existing active templates.');
  } else {
    console.log('\nDone.');
  }
}

if (require.main === module) {
  main().catch(console.error).finally(() => process.exit(0));
}
