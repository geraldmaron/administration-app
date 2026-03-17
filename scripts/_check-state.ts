import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

const PROJECT_ID = 'the-administration-3a072';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sa = JSON.parse(fs.readFileSync(path.join(__dirname, '../serviceAccountKey.json'), 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(sa), projectId: PROJECT_ID });
const db = admin.firestore();

async function countCollection(col: string): Promise<number> {
  const snap = await db.collection(col).count().get();
  return snap.data().count;
}

async function docSummary(docPath: string): Promise<string> {
  const snap = await db.doc(docPath).get();
  if (!snap.exists) return 'MISSING';
  const data = snap.data() || {};
  const keys = Object.keys(data);
  return `EXISTS (${keys.length} keys)`;
}

async function main() {
  console.log('=== FIREBASE STATE CHECK ===\n');

  console.log('--- world_state documents ---');
  const worldStateDocs = [
    'world_state/countries',
    'world_state/secondary_impact_rules',
    'world_state/feedback_loops',
    'world_state/names',
    'world_state/scenario_manifest',
    'world_state/generation_config',
  ];
  for (const d of worldStateDocs) {
    console.log(`  ${d}: ${await docSummary(d)}`);
  }

  console.log('\n--- countries collection & sub-docs (sample 5) ---');
  const countriesSnap = await db.collection('countries').limit(5).get();
  if (countriesSnap.empty) {
    console.log('  countries collection: EMPTY');
  } else {
    for (const doc of countriesSnap.docs) {
      const mil = await db.doc(`countries/${doc.id}/military_state/current`).get();
      const leg = await db.doc(`countries/${doc.id}/legislature_state/current`).get();
      console.log(`  ${doc.id}: military=${mil.exists ? 'OK' : 'MISSING'}  legislature=${leg.exists ? 'OK' : 'MISSING'}`);
    }
    const total = await countCollection('countries');
    console.log(`  (${total} total country docs)`);
  }

  console.log('\n--- Collections that should be empty after nuke ---');
  const nukeCols = [
    'scenarios',
    'scenario_embeddings',
    'generation_jobs',
    'generation_tracking',
    'generation_metrics',
    'failure_analysis',
    'admin_audit_runs',
    'performance_summary',
    'training_scenarios',
    'news_ingestion_logs',
    'prompt_templates',
  ];
  for (const col of nukeCols) {
    const count = await countCollection(col);
    console.log(`  ${col}: ${count} docs${count > 0 ? ' ⚠️  NOT EMPTY' : ''}`);
  }

  console.log('\n=== DONE ===');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
