/*
 * Diagnostic: token usage audit across all scenarios
 * Usage: npx tsx scripts/token-usage-audit.ts
 */
import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');
if (!admin.apps.length) {
  const sa = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  admin.initializeApp({ credential: admin.credential.cert(sa), projectId: 'the-administration-3a072' });
}

const db = admin.firestore();

async function main() {
  const snap = await db.collection('scenarios').get();
  let playerCountryUses = 0;
  let thePlayerCountryUses = 0;
  let theAnyTokenUses = 0;
  const sampleDescriptions: string[] = [];

  for (const doc of snap.docs) {
    const d = doc.data() as any;
    const all = JSON.stringify(d);
    const pc = (all.match(/\{player_country\}/g) || []).length;
    const tpc = (all.match(/\{the_player_country\}/g) || []).length;
    const tany = (all.match(/\{the_[a-z_]+\}/g) || []).length;
    playerCountryUses += pc;
    thePlayerCountryUses += tpc;
    theAnyTokenUses += tany;

    if (sampleDescriptions.length < 5 && d.description) {
      sampleDescriptions.push(`[${doc.id.slice(0, 16)}] ${d.description.slice(0, 120)}`);
    }
  }

  console.log(JSON.stringify({
    totalScenarios: snap.size,
    player_country_uses: playerCountryUses,
    the_player_country_uses: thePlayerCountryUses,
    the_any_token_uses: theAnyTokenUses,
  }, null, 2));

  console.log('\nSample descriptions:');
  for (const d of sampleDescriptions) console.log(' ', d);
}

main().catch(e => { console.error(e); process.exit(1); });
