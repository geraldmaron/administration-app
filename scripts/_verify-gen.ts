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
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId: 'the-administration-3a072' });
}
const db = admin.firestore();

async function main() {
  for (const jobId of ['eSNm7JCYlYFFbVWJEWO7', 'ig7WIj7kezxYfcTCdJUz']) {
    const doc = await db.collection('generation_jobs').doc(jobId).get();
    if (!doc.exists) { console.log(jobId, '- not found'); continue; }
    const d = doc.data();
    console.log(`Job: ${jobId} | status: ${d.status} | saved: ${d.savedScenarioIds?.length ?? 0}${d.errors?.length ? ' | errors: ' + JSON.stringify(d.errors) : ''}`);
  }

  const scenSnap = await db.collection('scenarios').get();
  console.log(`\nTotal scenarios: ${scenSnap.size}`);
  for (const s of scenSnap.docs) {
    const opts = (s.data().options || []) as any[];
    console.log(`\nScenario: ${s.id} | ${s.data().title}`);
    for (const opt of opts) {
      const summary = (opt.outcomeSummary || '') as string;
      const context = (opt.outcomeContext || '') as string;
      const hasSecondPerson = /\byour\b/i.test(summary) || /\byou\b/i.test(summary) ||
                              /\byour\b/i.test(context) || /\byou\b/i.test(context);
      const preview = summary.substring(0, 90);
      console.log(`  ${opt.id}: ${hasSecondPerson ? '[BUG: second person]' : '[OK: third person]'} — ${preview}`);
    }
  }
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
