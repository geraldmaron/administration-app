/**
 * Deletes all documents in Firestore `scenarios` and `scenario_embeddings`,
 * and all files under Cloud Storage `scenarios/`. Destructive and irreversible.
 *
 * Run from web/functions/:
 *   pnpm dlx tsx src/tools/nuke-scenarios.ts --confirm
 */

import * as admin from 'firebase-admin';

const BATCH_SIZE = 100;
const BUCKET = 'the-administration-3a072.firebasestorage.app';

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID || 'the-administration-3a072';
  console.log(`[Nuke] Initializing Firebase Admin for project: ${projectId}`);
  admin.initializeApp({
    projectId,
    storageBucket: `${projectId}.firebasestorage.app`,
  });
}

const db = admin.firestore();
const storage = admin.storage();

async function deleteCollection(collectionPath: string): Promise<number> {
  const collRef = db.collection(collectionPath);
  let totalDeleted = 0;
  while (true) {
    const snapshot = await collRef.limit(BATCH_SIZE).get();
    if (snapshot.empty) break;
    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    totalDeleted += snapshot.size;
    console.log(`  Deleted ${totalDeleted} docs from ${collectionPath}...`);
  }
  return totalDeleted;
}

async function deleteStoragePrefix(prefix: string): Promise<number> {
  const bucket = storage.bucket(BUCKET);
  const [files] = await bucket.getFiles({ prefix });
  if (files.length === 0) {
    console.log(`  No files under ${prefix}`);
    return 0;
  }
  await Promise.all(files.map((f) => f.delete()));
  console.log(`  Deleted ${files.length} files under ${prefix}`);
  return files.length;
}

async function main() {
  const argv = process.argv.slice(2);
  if (!argv.includes('--confirm')) {
    console.error('This will permanently delete ALL scenarios. Run with --confirm to proceed.');
    process.exit(1);
  }

  console.log('=== NUKE SCENARIOS ===\n');

  console.log('1. Deleting Firestore `scenarios` collection...');
  const scenariosCount = await deleteCollection('scenarios');
  console.log(`   Done. ${scenariosCount} documents deleted.\n`);

  console.log('2. Deleting Firestore `scenario_embeddings` collection...');
  const embeddingsCount = await deleteCollection('scenario_embeddings');
  console.log(`   Done. ${embeddingsCount} documents deleted.\n`);

  console.log('3. Deleting Cloud Storage scenarios/ prefix...');
  const storageCount = await deleteStoragePrefix('scenarios/');
  console.log(`   Done. ${storageCount} files deleted.\n`);

  console.log('=== COMPLETE ===');
  console.log(`Firestore: ${scenariosCount} scenarios, ${embeddingsCount} embeddings | Storage: ${storageCount} files`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
