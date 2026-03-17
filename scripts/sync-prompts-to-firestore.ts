/**
 * sync-prompts-to-firestore.ts
 *
 * Reads the local .prompt.md files and pushes them to Firestore as active
 * prompt_templates. Also updates generation_config with latest settings.
 *
 * Run: npx tsx scripts/sync-prompts-to-firestore.ts
 */
// @ts-nocheck
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import * as path from 'path';
import * as fs from 'fs';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceAccount = require(path.join(__dirname, '..', 'serviceAccountKey.json'));
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'the-administration-3a072',
  });
}

const db = admin.firestore();

const PROMPT_MAP = [
  { name: 'architect_drafter', file: 'architect.prompt.md' },
  { name: 'drafter_details', file: 'drafter.prompt.md' },
  { name: 'reflection', file: 'reflection.prompt.md' },
];

const PROMPTS_DIR = path.join(__dirname, '..', 'functions', 'src', 'prompts');

async function main() {
  const version = `v1.2-${Date.now().toString(36)}`;

  for (const { name, file } of PROMPT_MAP) {
    const filePath = path.join(PROMPTS_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.error(`  SKIP: ${file} not found at ${filePath}`);
      continue;
    }
    const content = fs.readFileSync(filePath, 'utf8');

    // Deactivate all existing versions of this template
    const existing = await db.collection('prompt_templates')
      .where('name', '==', name)
      .where('active', '==', true)
      .get();
    
    const batch = db.batch();
    for (const doc of existing.docs) {
      batch.update(doc.ref, { active: false });
    }

    // Create new active version
    const docId = `${name}_${version}`;
    batch.set(db.collection('prompt_templates').doc(docId), {
      name,
      version,
      description: `Synced from local ${file} — improved advisor feedback quality`,
      active: true,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      sections: {
        constraints: content,
        outputFormat: '',
      },
      metadata: {
        createdBy: 'sync-prompts-to-firestore.ts',
      },
    });

    await batch.commit();
    console.log(`  ✅ ${name} → ${docId} (active)`);
  }

  // Update generation_config
  console.log('\nUpdating generation_config...');
  await db.collection('world_state').doc('generation_config').set({
    max_llm_repair_attempts: 3,
    llm_repair_enabled: true,
    content_quality_gate_enabled: true,
    audit_pass_threshold: 80,
    audit_warning_penalty: 4,
  }, { merge: true });
  console.log('  ✅ max_llm_repair_attempts: 3, llm_repair_enabled: true, content_quality_gate_enabled: true, audit_pass_threshold: 80, audit_warning_penalty: 4');

  console.log('\nDone.');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
