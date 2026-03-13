import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';
const sa = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'serviceAccountKey.json'), 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(sa), projectId: 'the-administration-3a072' });
const db = admin.firestore();
async function main() {
  const snap = await db.collection('scenarios').get();
  console.log('Deleting ' + snap.size + ' scenarios...');
  const batch = db.batch();
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
  const verify = await db.collection('scenarios').get();
  console.log('Done. Remaining: ' + verify.size);
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
