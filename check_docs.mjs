import admin from 'firebase-admin';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import * as path from 'path';
const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ID = 'the-administration-3a072';
const serviceAccount = require(path.join(__dirname, 'serviceAccountKey.json'));
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: PROJECT_ID,
  });
}
const db = admin.firestore();
async function check() {
  const docs = ['world_state/metrics', 'world_state/content_rules', 'world_state/generation_config'];
  for (const d of docs) {
    const snap = await db.doc(d).get();
    console.log(`${d}: ${snap.exists ? 'EXISTS' : 'MISSING'}`);
  }
}
check().catch(console.error);
