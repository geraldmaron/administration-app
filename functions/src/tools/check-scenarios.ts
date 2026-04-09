import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

const saPath = path.join(__dirname, '..', '..', '..', 'serviceAccountKey.json');
if (fs.existsSync(saPath)) {
  const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
  admin.initializeApp({ credential: admin.credential.cert(sa), projectId: 'the-administration-3a072' });
} else {
  admin.initializeApp({ projectId: 'the-administration-3a072' });
}

const db = admin.firestore();
db.collection('scenarios')
  .orderBy('metadata.generatedAt', 'desc')
  .limit(10)
  .get()
  .then((snap) => {
    console.log(`Total: ${snap.size} scenarios`);
    for (const d of snap.docs) {
      const data = d.data() as Record<string, any>;
      const conditions: any[] = data.conditions ?? [];
      const pass = conditions.every((c: any) => {
        if (c.min !== undefined && c.min > 55) return false;
        if (c.max !== undefined && c.max < 40) return false;
        return true;
      });
      console.log(`${pass ? '✓' : '✗'} ${d.id} | ${data.metadata?.bundle} | ${data.title}`);
      if (conditions.length > 0) console.log(`  conditions: ${JSON.stringify(conditions)}`);
    }
    process.exit(0);
  })
  .catch((e: Error) => { console.error(e.message); process.exit(1); });
