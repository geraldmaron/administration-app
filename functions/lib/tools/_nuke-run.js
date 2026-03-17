"use strict";
/**
 * Temporary runner — explicit credential passthrough for nuke-scenarios.
 * Deletes: Firestore `scenarios`, `scenario_embeddings`, Storage `scenarios/`.
 * Run: npx tsx src/tools/_nuke-run.ts --confirm
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const admin = __importStar(require("firebase-admin"));
const path = __importStar(require("path"));
const BATCH_SIZE = 100;
const PROJECT_ID = 'the-administration-3a072';
const BUCKET = `${PROJECT_ID}.firebasestorage.app`;
const SA_PATH = path.resolve(__dirname, '../../../serviceAccountKey.json');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(SA_PATH),
        projectId: PROJECT_ID,
        storageBucket: BUCKET,
    });
}
const db = admin.firestore();
const storage = admin.storage();
async function deleteCollection(collectionPath) {
    const collRef = db.collection(collectionPath);
    let totalDeleted = 0;
    while (true) {
        const snapshot = await collRef.limit(BATCH_SIZE).get();
        if (snapshot.empty)
            break;
        const batch = db.batch();
        snapshot.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        totalDeleted += snapshot.size;
        console.log(`  Deleted ${totalDeleted} docs from ${collectionPath}...`);
    }
    return totalDeleted;
}
async function deleteStoragePrefix(prefix) {
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
        console.error('Run with --confirm to proceed.');
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
//# sourceMappingURL=_nuke-run.js.map