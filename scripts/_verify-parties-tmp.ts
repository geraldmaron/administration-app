// @ts-nocheck
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import * as path from 'path';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sa = require(path.join(__dirname, '..', 'serviceAccountKey.json'));
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(sa), projectId: 'the-administration-3a072' });
}
const db = admin.firestore();

async function main() {
  const parties = await db.collectionGroup('parties').get();
  const countries = await db.collection('countries').get();
  let withParties = 0;
  for (const c of countries.docs) {
    const s = await c.ref.collection('parties').limit(1).get();
    if (!s.empty) withParties++;
  }
  const pool = await db.doc('world_state/parties_pool').get();
  const poolCountries = Object.keys((pool.data() || {}).country_parties || {}).length;

  console.log('TOTAL_PARTY_DOCS=' + parties.size);
  console.log('COUNTRIES_COLLECTION_DOCS=' + countries.size);
  console.log('COUNTRIES_WITH_PARTIES=' + withParties);
  console.log('PARTIES_POOL_COUNTRIES=' + poolCountries);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
