"use strict";
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
exports.exportBundle = exportBundle;
exports.exportAllBundles = exportAllBundles;
/**
 * Bundle Exporter
 *
 * Aggregates per-bundle scenarios from Firestore into versioned JSON files in
 * Firebase Storage. The iOS client reads one Firestore manifest document, then
 * downloads only the bundle files that changed since its last session — replacing
 * a full collection scan (20k reads, 67 round trips, ~60 MB) with:
 *   • 1 Firestore read  (manifest)
 *   • N Storage GETs    (only changed bundles, ~2–4 MB each)
 *
 * Storage layout:
 *   scenario-bundles/{bundleId}.json     ← the payload the app downloads
 *
 * Manifest (world_state/scenario_manifest):
 *   {
 *     manifestVersion: number,
 *     lastUpdated: Timestamp,
 *     bundles: {
 *       [bundleId]: { version: number, count: number, sizeBytes: number, exportedAt: Timestamp }
 *     }
 *   }
 */
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
const bundleIds_1 = require("./data/schemas/bundleIds");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
const BUCKET_NAME = process.env.STORAGE_BUCKET || 'the-administration-3a072.firebasestorage.app';
const BUNDLE_PREFIX = 'scenario-bundles';
const MANIFEST_DOC = 'world_state/scenario_manifest';
// Fields written by the server that clients don't need — strip to reduce payload size.
const SERVER_ONLY_FIELDS = ['created_at', 'storage_path', '_embedding', 'embedding_model', 'embedding_version'];
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
/**
 * Export a single bundle to Storage and bump its manifest version.
 * Safe to call concurrently for different bundles.
 */
async function exportBundle(bundleId) {
    logger.info(`[BundleExporter] Exporting bundle: ${bundleId}`);
    const snapshot = await db
        .collection('scenarios')
        .where('metadata.bundle', '==', bundleId)
        .where('is_active', '==', true)
        .get();
    if (snapshot.empty) {
        logger.warn(`[BundleExporter] No active scenarios for bundle: ${bundleId}`);
        return 0;
    }
    const scenarios = snapshot.docs.map(doc => {
        const data = doc.data();
        SERVER_ONLY_FIELDS.forEach(f => delete data[f]);
        return Object.assign({ id: doc.id }, data);
    });
    const json = JSON.stringify(scenarios);
    const sizeBytes = Buffer.byteLength(json, 'utf8');
    const bucket = admin.storage().bucket(BUCKET_NAME);
    const file = bucket.file(`${BUNDLE_PREFIX}/${bundleId}.json`);
    await file.save(json, {
        resumable: false,
        metadata: {
            contentType: 'application/json',
            // private so only authenticated users can read via the Storage REST API
            cacheControl: 'private, max-age=3600',
            metadata: {
                bundle: bundleId,
                count: String(scenarios.length),
                exportedAt: new Date().toISOString(),
            },
        },
    });
    await bumpManifest(bundleId, scenarios.length, sizeBytes);
    logger.info(`[BundleExporter] ✓ ${bundleId}: ${scenarios.length} scenarios, ` +
        `${(sizeBytes / 1024).toFixed(1)} KB`);
    return scenarios.length;
}
/**
 * Export all 14 bundles concurrently (used after full generation runs or manual rebuild).
 * Returns a summary of { bundleId → count }.
 */
async function exportAllBundles() {
    logger.info('[BundleExporter] Rebuilding all bundles…');
    const results = await Promise.allSettled(bundleIds_1.ALL_BUNDLE_IDS.map(async (bundleId) => {
        const count = await exportBundle(bundleId);
        return { bundleId, count };
    }));
    const summary = {};
    for (const result of results) {
        if (result.status === 'fulfilled') {
            summary[result.value.bundleId] = result.value.count;
        }
        else {
            logger.error('[BundleExporter] Bundle export failed:', result.reason);
        }
    }
    const total = Object.values(summary).reduce((a, b) => a + b, 0);
    logger.info(`[BundleExporter] ✓ All bundles rebuilt. ` +
        `${total} scenarios across ${Object.keys(summary).length} bundles.`);
    return summary;
}
// ---------------------------------------------------------------------------
// Manifest helpers
// ---------------------------------------------------------------------------
async function bumpManifest(bundleId, count, sizeBytes) {
    const ref = db.doc(MANIFEST_DOC);
    await db.runTransaction(async (tx) => {
        var _a, _b, _c, _d, _e;
        const snap = await tx.get(ref);
        const data = snap.exists ? snap.data() : {};
        const currentBundleVersion = (_c = (_b = (_a = data === null || data === void 0 ? void 0 : data.bundles) === null || _a === void 0 ? void 0 : _a[bundleId]) === null || _b === void 0 ? void 0 : _b.version) !== null && _c !== void 0 ? _c : 0;
        const currentManifestVersion = (_d = data === null || data === void 0 ? void 0 : data.manifestVersion) !== null && _d !== void 0 ? _d : 0;
        tx.set(ref, {
            manifestVersion: currentManifestVersion + 1,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            bundles: Object.assign(Object.assign({}, ((_e = data === null || data === void 0 ? void 0 : data.bundles) !== null && _e !== void 0 ? _e : {})), { [bundleId]: {
                    version: currentBundleVersion + 1,
                    count,
                    sizeBytes,
                    exportedAt: admin.firestore.FieldValue.serverTimestamp(),
                } }),
        });
    });
}
//# sourceMappingURL=bundle-exporter.js.map