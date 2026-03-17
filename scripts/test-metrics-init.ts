/**
 * Quick test script to verify that the audit config can initialize with the seeded metrics.
 *
 * Usage: npx tsx scripts/test-metrics-init.ts
 */

import admin from 'firebase-admin';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import * as path from 'path';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Firebase setup
const PROJECT_ID = 'the-administration-3a072';
const serviceAccount = require(path.join(__dirname, '..', 'serviceAccountKey.json'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: PROJECT_ID,
  });
}

const db = admin.firestore();

// Simplified version of initializeAuditConfig for testing
async function testAuditConfigInit() {
  console.log('🧪 Testing audit config initialization...');

  try {
    const [metricsSnap] = await Promise.all([
      db.doc('world_state/metrics').get(),
    ]);

    if (!metricsSnap.exists) {
      throw new Error('world_state/metrics document does not exist');
    }

    const metricsData: any[] = metricsSnap.data()?.metrics ?? [];

    if (metricsData.length === 0) {
      throw new Error('No metrics found in world_state/metrics document');
    }

    // Build metric index from Firebase
    const validMetricIds = new Set(metricsData.map((m: any) => m.id as string));
    const inverseMetrics = new Set(
      metricsData.filter((m: any) => m.inverse === true).map((m: any) => m.id as string)
    );

    console.log(`✅ Found ${validMetricIds.size} valid metric IDs`);
    console.log(`✅ Found ${inverseMetrics.size} inverse metrics`);

    // Check that we have exactly 27 metrics
    if (validMetricIds.size !== 27) {
      throw new Error(`Expected 27 metrics, found ${validMetricIds.size}`);
    }

    // Check that inverse metrics are correctly identified
    const expectedInverse = ['metric_corruption', 'metric_inflation', 'metric_crime', 'metric_bureaucracy'];
    const actualInverse = Array.from(inverseMetrics);
    const missingInverse = expectedInverse.filter(id => !inverseMetrics.has(id));
    const extraInverse = actualInverse.filter(id => !expectedInverse.includes(id));

    if (missingInverse.length > 0) {
      console.warn(`⚠️  Missing inverse flags for: ${missingInverse.join(', ')}`);
    }

    if (extraInverse.length > 0) {
      console.warn(`⚠️  Unexpected inverse flags for: ${extraInverse.join(', ')}`);
    }

    console.log('🎉 Audit config initialization test passed!');
    console.log(`📊 Config initialized: ${validMetricIds.size} metrics`);

  } catch (error) {
    console.error('❌ Audit config initialization test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testAuditConfigInit().catch(console.error);
}