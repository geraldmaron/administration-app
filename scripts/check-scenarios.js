const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'the-administration-3a072',
  });
}

const db = admin.firestore();

async function checkScenarios() {
  try {
    // Get recent scenarios
    const scenariosSnap = await db.collection('scenarios')
      .orderBy('createdAt', 'desc')
      .limit(8)
      .get();

    console.log('Recent scenarios:');
    scenariosSnap.forEach(doc => {
      const data = doc.data();
      const bundle = data.metadata?.bundle || 'unknown';
      const created = data.createdAt ? data.createdAt.toDate().toISOString() : 'unknown';
      console.log(`  ${doc.id}: ${bundle} - ${created}`);
    });

    // Get recent jobs
    const jobsSnap = await db.collection('generation_jobs')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();

    console.log('\nRecent generation jobs:');
    jobsSnap.forEach(doc => {
      const data = doc.data();
      const status = data.status || 'unknown';
      const bundleId = data.bundleId || 'unknown';
      const created = data.createdAt ? data.createdAt.toDate().toISOString() : 'unknown';
      const completed = data.completedScenarios || 0;
      const total = data.totalScenarios || 0;
      console.log(`  ${doc.id}: ${bundleId} - ${status} - ${completed}/${total} - ${created}`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

checkScenarios();