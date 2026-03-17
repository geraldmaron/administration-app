/**
 * Script to populate the world_state/metrics document in Firestore.
 *
 * This script creates the canonical metrics configuration used by the audit system
 * and scenario generation pipeline. It defines all 27 game metrics with their
 * properties including inverse flags, magnitude caps, and related cabinet roles.
 *
 * Usage: npx tsx scripts/seed-metrics.ts [--dry-run]
 */

import admin from 'firebase-admin';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import * as path from 'path';
import * as fs from 'fs';

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

// Metric configuration data
interface MetricConfig {
  id: string;
  inverse?: boolean;
  effectMagnitudeCap?: number;
  relatedRoles?: string[];
}

const METRICS_CONFIG: MetricConfig[] = [
  // Core metrics (18)
  { id: 'metric_approval', effectMagnitudeCap: 15, relatedRoles: ['role_executive', 'role_interior'] },
  { id: 'metric_economy', effectMagnitudeCap: 12, relatedRoles: ['role_economy', 'role_commerce'] },
  { id: 'metric_public_order', effectMagnitudeCap: 10, relatedRoles: ['role_interior', 'role_justice'] },
  { id: 'metric_health', effectMagnitudeCap: 8, relatedRoles: ['role_health'] },
  { id: 'metric_education', effectMagnitudeCap: 6, relatedRoles: ['role_education'] },
  { id: 'metric_infrastructure', effectMagnitudeCap: 8, relatedRoles: ['role_transport', 'role_energy'] },
  { id: 'metric_environment', effectMagnitudeCap: 7, relatedRoles: ['role_environment'] },
  { id: 'metric_foreign_relations', effectMagnitudeCap: 10, relatedRoles: ['role_diplomacy'] },
  { id: 'metric_military', effectMagnitudeCap: 9, relatedRoles: ['role_defense'] },
  { id: 'metric_liberty', effectMagnitudeCap: 8, relatedRoles: ['role_justice', 'role_interior'] },
  { id: 'metric_equality', effectMagnitudeCap: 7, relatedRoles: ['role_labor', 'role_justice'] },
  { id: 'metric_employment', effectMagnitudeCap: 9, relatedRoles: ['role_labor', 'role_economy'] },
  { id: 'metric_innovation', effectMagnitudeCap: 6, relatedRoles: ['role_education', 'role_commerce'] },
  { id: 'metric_trade', effectMagnitudeCap: 8, relatedRoles: ['role_commerce', 'role_diplomacy'] },
  { id: 'metric_energy', effectMagnitudeCap: 7, relatedRoles: ['role_energy'] },
  { id: 'metric_housing', effectMagnitudeCap: 6, relatedRoles: ['role_interior', 'role_labor'] },
  { id: 'metric_democracy', effectMagnitudeCap: 8, relatedRoles: ['role_executive', 'role_justice'] },
  { id: 'metric_sovereignty', effectMagnitudeCap: 9, relatedRoles: ['role_defense', 'role_diplomacy'] },
  { id: 'metric_immigration', effectMagnitudeCap: 7, relatedRoles: ['role_interior', 'role_diplomacy'] },

  // Inverse metrics (4) - lower is better
  { id: 'metric_corruption', inverse: true, effectMagnitudeCap: 12, relatedRoles: ['role_justice', 'role_executive'] },
  { id: 'metric_inflation', inverse: true, effectMagnitudeCap: 10, relatedRoles: ['role_economy', 'role_commerce'] },
  { id: 'metric_crime', inverse: true, effectMagnitudeCap: 11, relatedRoles: ['role_justice', 'role_interior'] },
  { id: 'metric_bureaucracy', inverse: true, effectMagnitudeCap: 9, relatedRoles: ['role_executive', 'role_interior'] },

  // Fiscal metric (1)
  { id: 'metric_budget', effectMagnitudeCap: 25, relatedRoles: ['role_economy', 'role_executive'] },

  // Hidden metrics (3)
  { id: 'metric_unrest', effectMagnitudeCap: 15, relatedRoles: ['role_interior', 'role_justice'] },
  { id: 'metric_economic_bubble', effectMagnitudeCap: 12, relatedRoles: ['role_economy', 'role_commerce'] },
  { id: 'metric_foreign_influence', effectMagnitudeCap: 10, relatedRoles: ['role_diplomacy', 'role_defense'] },
];

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log('🔧 Seeding world_state/metrics document...');
  console.log(`📊 Total metrics to configure: ${METRICS_CONFIG.length}`);

  if (isDryRun) {
    console.log('🏜️  DRY RUN MODE - No changes will be made');
  }

  try {
    // Check if document already exists
    const docRef = db.doc('world_state/metrics');
    const existingDoc = await docRef.get();

    if (existingDoc.exists) {
      const existingData = existingDoc.data();
      const existingMetrics = existingData?.metrics || [];
      console.log(`📋 Document exists with ${existingMetrics.length} metrics`);

      if (!isDryRun) {
        console.log('⚠️  Updating existing document...');
      }
    } else {
      console.log('📄 Document does not exist, will create new one');
    }

    // Prepare the document data
    const docData = {
      metrics: METRICS_CONFIG,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      version: '1.0',
      description: 'Canonical metrics configuration for The Administration game'
    };

    if (isDryRun) {
      console.log('📋 Would write the following data:');
      console.log(JSON.stringify(docData, null, 2));
    } else {
      // Write to Firestore
      await docRef.set(docData);
      console.log('✅ Successfully wrote metrics configuration to Firestore');

      // Verify the write
      const verifyDoc = await docRef.get();
      const verifyData = verifyDoc.data();
      const metricCount = verifyData?.metrics?.length || 0;

      if (metricCount === 27) {
        console.log(`✅ Verification passed: ${metricCount} metrics configured`);
        console.log('🎉 Metrics seeding complete!');
      } else {
        console.error(`❌ Verification failed: Expected 27 metrics, got ${metricCount}`);
        process.exit(1);
      }
    }

  } catch (error) {
    console.error('❌ Error seeding metrics:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

export { METRICS_CONFIG };