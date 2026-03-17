/*
 * Health-check diagnostic for the generation job system.
 * Queries Firestore directly and reports on stuck/zombie jobs.
 * Usage: cd scripts && npx ts-node health-check.ts
 */
import admin from 'firebase-admin';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'the-administration-3a072',
  });
}

const db = admin.firestore();

const STUCK_PENDING_MINUTES = 2;
const ZOMBIE_RUNNING_MINUTES = 15;

async function main(): Promise<void> {
  let hasIssues = false;

  // Status counts
  const allSnap = await db.collection('generation_jobs').get();
  const countsByStatus: Record<string, number> = {};
  for (const doc of allSnap.docs) {
    const s = String(doc.data().status ?? 'unknown');
    countsByStatus[s] = (countsByStatus[s] ?? 0) + 1;
  }

  console.log('\n=== Job counts by status ===');
  for (const [status, count] of Object.entries(countsByStatus)) {
    console.log(`  ${status}: ${count}`);
  }
  if (Object.keys(countsByStatus).length === 0) console.log('  (no jobs found)');

  // Stuck pending — trigger not firing. Query single field, filter in memory.
  const pendingCutoffMs = Date.now() - STUCK_PENDING_MINUTES * 60 * 1000;
  const pendingSnap = await db.collection('generation_jobs')
    .where('status', '==', 'pending')
    .get();
  const stuckPendingDocs = pendingSnap.docs.filter((doc) => {
    const ts = doc.data().requestedAt?.toDate?.();
    return ts && ts.getTime() < pendingCutoffMs;
  });

  if (stuckPendingDocs.length > 0) {
    hasIssues = true;
    console.log(`\n⚠️  ${stuckPendingDocs.length} job(s) stuck in PENDING for >${STUCK_PENDING_MINUTES}min:`);
    for (const doc of stuckPendingDocs) {
      const d = doc.data();
      console.log(`  - ${doc.id}  requestedAt=${d.requestedAt?.toDate?.()?.toISOString()}`);
    }
    console.log('  → onScenarioJobCreated trigger may not be deployed.');
    console.log('    Run: firebase deploy --only functions');
    console.log('    Then verify: firebase functions:list | grep onScenarioJobCreated');
  }

  // Zombie running jobs. Query single field, filter in memory.
  const zombieCutoffMs = Date.now() - ZOMBIE_RUNNING_MINUTES * 60 * 1000;
  const runningSnap = await db.collection('generation_jobs')
    .where('status', '==', 'running')
    .get();
  const zombieDocs = runningSnap.docs.filter((doc) => {
    const ts = doc.data().startedAt?.toDate?.();
    return ts && ts.getTime() < zombieCutoffMs;
  });

  if (zombieDocs.length > 0) {
    hasIssues = true;
    console.log(`\n⚠️  ${zombieDocs.length} job(s) stuck in RUNNING for >${ZOMBIE_RUNNING_MINUTES}min (zombie):`);
    for (const doc of zombieDocs) {
      const d = doc.data();
      console.log(`  - ${doc.id}  startedAt=${d.startedAt?.toDate?.()?.toISOString()}`);
    }
    console.log('  → recoverZombieJobs not deployed or generation_jobs composite index is missing.');
    console.log('    Run: firebase deploy --only functions,firestore:indexes');
  }

  // Most recent 5 jobs
  const recent = await db.collection('generation_jobs')
    .orderBy('requestedAt', 'desc')
    .limit(5)
    .get();

  console.log('\n=== Most recent 5 jobs ===');
  if (recent.empty) {
    console.log('  (none)');
  }
  for (const doc of recent.docs) {
    const d = doc.data();
    const bundles = Array.isArray(d.bundles) ? d.bundles.join(', ') : String(d.bundles ?? '?');
    const requestedAt = d.requestedAt?.toDate?.()?.toISOString() ?? '?';
    const tail = d.completedAt
      ? `completedAt=${d.completedAt.toDate?.()?.toISOString()}`
      : d.error
        ? `error=${String(d.error).slice(0, 80)}`
        : '';
    console.log(`  ${doc.id}  status=${d.status}  [${bundles}]  ${requestedAt}  ${tail}`);
  }

  if (!hasIssues) {
    console.log('\n✅ Job system looks healthy.');
    process.exit(0);
  } else {
    console.log('\n❌ Issues found — see above for remediation steps.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('health-check failed:', err);
  process.exit(1);
});
