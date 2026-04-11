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
  throw new Error('No serviceAccountKey.json found');
}

async function main(): Promise<void> {
  const db = initDb();
  const jobId = 'nw0Y9OGTeygjWAQOeZkE';
  
  const docRef = db.collection('generation_jobs').doc(jobId);
  const doc = await docRef.get();
  
  if (!doc.exists) {
    console.log(JSON.stringify({ ok: false, error: 'Job not found' }, null, 2));
    return;
  }
  
  const jobData = doc.data()!;
  
  // Get all events
  const allEventsSnap = await docRef.collection('events').orderBy('timestamp', 'asc').get();
  
  const events = allEventsSnap.docs.map(ev => {
    const e = ev.data();
    return {
      id: ev.id,
      timestamp: e.timestamp?.toDate?.()?.toISOString?.(),
      level: e.level,
      code: e.code,
      message: e.message,
      bundle: e.bundle,
      phase: e.phase,
      scenarioId: e.scenarioId,
      data: e.data,
    };
  });
  
  // Extract audit_fail and scenario_rejected events
  const auditFailures = events.filter(e => e.code === 'audit_fail');
  const scenarioRejections = events.filter(e => e.code === 'scenario_rejected');
  const generationFailures = events.filter(e => e.code === 'generation_attempt_failed');
  
  // Get scenario IDs and fetch their details
  const savedScenarioIds = jobData.savedScenarioIds || [];
  const scenarioDocs = await Promise.all(
    savedScenarioIds.slice(0, 10).map((id: string) => db.collection('scenarios').doc(id).get())
  );
  
  const savedScenarios = scenarioDocs
    .filter(d => d.exists)
    .map(d => {
      const s = d.data()!;
      return {
        id: d.id,
        title: s.title,
        bundle: s.metadata?.bundle,
        scopeTier: s.metadata?.scopeTier,
      };
    });
  
  console.log(JSON.stringify({
    ok: true,
    job: {
      id: jobId,
      status: jobData.status,
      bundles: jobData.bundles,
      count: jobData.count,
      completedCount: jobData.completedCount,
      failedCount: jobData.failedCount,
      currentPhase: jobData.currentPhase,
      currentMessage: jobData.currentMessage,
    },
    auditFailures,
    scenarioRejections,
    generationFailures,
    savedScenarios,
    totalEvents: events.length,
  }, null, 2));
}

main().catch(e => {
  console.error(JSON.stringify({ ok: false, fatal: String(e) }, null, 2));
  process.exit(1);
});
