/**
 * One-shot forensics: print latest generation_jobs document summary and event code histogram.
 * Run from repo root: cd functions && npx tsx src/tools/dump-last-generation-job.ts
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

function initDb(): admin.firestore.Firestore {
  if (admin.apps.length > 0) {
    return admin.firestore();
  }
  const keyPath = path.join(__dirname, '..', '..', '..', 'serviceAccountKey.json');
  if (fs.existsSync(keyPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8')) as admin.ServiceAccount;
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    return admin.firestore();
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
    return admin.firestore();
  }
  throw new Error('No serviceAccountKey.json at repo root and no GOOGLE_APPLICATION_CREDENTIALS');
}

async function main(): Promise<void> {
  const db = initDb();
  let snap: FirebaseFirestore.QuerySnapshot;
  try {
    snap = await db.collection('generation_jobs').orderBy('updatedAt', 'desc').limit(1).get();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(JSON.stringify({ ok: false, queryError: msg }, null, 2));
    return;
  }
  if (snap.empty) {
    console.log(JSON.stringify({ ok: true, empty: true }, null, 2));
    return;
  }
  const doc = snap.docs[0];
  const d = doc.data();
  const pick = {
    id: doc.id,
    status: d.status,
    bundles: d.bundles,
    count: d.count,
    completedCount: d.completedCount,
    failedCount: d.failedCount,
    error: d.error,
    failureSummary: d.failureSummary,
    currentPhase: d.currentPhase,
    currentMessage: d.currentMessage,
    errorsPreview: Array.isArray(d.errors) ? d.errors.slice(0, 5) : [],
    resultsCount: Array.isArray(d.results) ? d.results.length : 0,
  };
  const eventsSnap = await doc.ref.collection('events').orderBy('timestamp', 'asc').limit(500).get();
  const codeCounts: Record<string, number> = {};
  const levels: Record<string, number> = {};
  const allSamples: { code?: string; level?: string; message?: string; phase?: string }[] = [];
  eventsSnap.forEach((ev) => {
    const e = ev.data();
    const c = String(e.code ?? 'unknown');
    codeCounts[c] = (codeCounts[c] ?? 0) + 1;
    const lv = String(e.level ?? '?');
    levels[lv] = (levels[lv] ?? 0) + 1;
    allSamples.push({
      code: e.code,
      level: e.level,
      message: typeof e.message === 'string' ? e.message.slice(0, 240) : undefined,
      phase: e.phase,
    });
  });
  const topCodes = Object.entries(codeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);
  console.log(
    JSON.stringify(
      {
        ok: true,
        job: pick,
        eventsTotal: eventsSnap.size,
        eventLevelCounts: levels,
        topEventCodes: topCodes,
        firstEventsSample: allSamples.slice(0, 5),
        lastEventsSample: allSamples.slice(-8),
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, fatal: String(e) }, null, 2));
  process.exit(1);
});
