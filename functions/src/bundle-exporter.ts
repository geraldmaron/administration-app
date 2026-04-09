/**
 * Bundle Exporter
 *
 * Aggregates per-bundle scenarios from Firestore into versioned JSON chunk
 * files in Firebase Storage. The iOS client reads one Firestore manifest
 * document, then downloads only the chunk files that changed since its last
 * session.
 *
 * Storage layout:
 *   scenario-bundles/{bundleId}/chunk-{0000}.json   ← 250 scenarios per chunk
 *   scenario-bundles/by-country/{countryId}/{bundleId}/chunk-{0000}.json
 *
 * Manifest (world_state/scenario_manifest):
 *   {
 *     manifestVersion: number,
 *     lastUpdated: Timestamp,
 *     bundles: {
 *       [bundleId]: {
 *         version: number,      ← bumped when any chunk changes
 *         totalCount: number,
 *         chunkSize: number,
 *         chunks: [{ idx, version, count, sizeBytes }]
 *       }
 *     }
 *   }
 */
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { ALL_BUNDLE_IDS, type BundleId } from './data/schemas/bundleIds';

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();
const BUCKET_NAME = process.env.STORAGE_BUCKET || 'the-administration-3a072.firebasestorage.app';
const BUNDLE_PREFIX = 'scenario-bundles';
const MANIFEST_DOC = 'world_state/scenario_manifest';
const CHUNK_SIZE = 250;

const SERVER_ONLY_FIELDS = ['created_at', '_embedding', 'embedding_model', 'embedding_version'];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChunkMeta {
    idx: number;
    version: number;
    count: number;
    sizeBytes: number;
}

interface BundleManifestEntry {
    version: number;
    totalCount: number;
    chunkSize: number;
    chunks: ChunkMeta[];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Export a single bundle as chunks to Storage and update the manifest.
 * Returns the total number of scenarios exported.
 */
export async function exportBundle(bundleId: BundleId): Promise<number> {
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
        const data: Record<string, unknown> = { id: doc.id, ...doc.data() };
        SERVER_ONLY_FIELDS.forEach(f => delete data[f]);
        return data;
    });

    const chunks = chunkArray(scenarios, CHUNK_SIZE);
    const bucket = admin.storage().bucket(BUCKET_NAME);

    const existingChunkVersions = await fetchExistingChunkVersions(bundleId);
    const chunkMetas: ChunkMeta[] = [];

    await Promise.all(
        chunks.map(async (chunk, idx) => {
            const json = JSON.stringify(chunk);
            const sizeBytes = Buffer.byteLength(json, 'utf8');
            const filename = chunkFilename(idx);
            const filePath = `${BUNDLE_PREFIX}/${bundleId}/${filename}`;

            await bucket.file(filePath).save(json, {
                resumable: false,
                metadata: {
                    contentType: 'application/json',
                    cacheControl: 'private, max-age=3600',
                    metadata: {
                        bundle: bundleId,
                        chunkIdx: String(idx),
                        count: String(chunk.length),
                        exportedAt: new Date().toISOString(),
                    },
                },
            });

            const prevVersion = existingChunkVersions[idx] ?? 0;
            chunkMetas[idx] = { idx, version: prevVersion + 1, count: chunk.length, sizeBytes };
        })
    );

    await updateBundleManifest(bundleId, chunkMetas);

    const total = scenarios.length;
    logger.info(`[BundleExporter] ✓ ${bundleId}: ${total} scenarios in ${chunks.length} chunks`);
    return total;
}

/**
 * Export all 14 bundles concurrently. Returns a summary of { bundleId → count }.
 */
export async function exportAllBundles(): Promise<Record<string, number>> {
    logger.info('[BundleExporter] Rebuilding all bundles…');

    const results = await Promise.allSettled(
        ALL_BUNDLE_IDS.map(async (bundleId) => {
            const count = await exportBundle(bundleId);
            return { bundleId, count };
        })
    );

    const summary: Record<string, number> = {};
    for (const result of results) {
        if (result.status === 'fulfilled') {
            summary[result.value.bundleId] = result.value.count;
        } else {
            logger.error('[BundleExporter] Bundle export failed:', result.reason);
        }
    }

    const total = Object.values(summary).reduce((a, b) => a + b, 0);
    logger.info(`[BundleExporter] ✓ All bundles rebuilt. ${total} scenarios across ${Object.keys(summary).length} bundles.`);
    return summary;
}

// ---------------------------------------------------------------------------
// Manifest helpers
// ---------------------------------------------------------------------------

async function fetchExistingChunkVersions(bundleId: string): Promise<Record<number, number>> {
    const snap = await db.doc(MANIFEST_DOC).get();
    if (!snap.exists) return {};
    const data = snap.data() as Record<string, any>;
    const existing: ChunkMeta[] = data?.bundles?.[bundleId]?.chunks ?? [];
    return Object.fromEntries(existing.map(c => [c.idx, c.version]));
}

async function updateBundleManifest(bundleId: string, chunkMetas: ChunkMeta[]): Promise<void> {
    const ref = db.doc(MANIFEST_DOC);
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const data = snap.exists ? (snap.data() as Record<string, any>) : {};
        const currentManifestVersion: number = data?.manifestVersion ?? 0;
        const currentBundleVersion: number = data?.bundles?.[bundleId]?.version ?? 0;
        const totalCount = chunkMetas.reduce((sum, c) => sum + c.count, 0);

        const bundleEntry: BundleManifestEntry = {
            version: currentBundleVersion + 1,
            totalCount,
            chunkSize: CHUNK_SIZE,
            chunks: chunkMetas,
        };

        tx.set(ref, {
            manifestVersion: currentManifestVersion + 1,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            bundles: {
                ...(data?.bundles ?? {}),
                [bundleId]: bundleEntry,
            },
        });
    });
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function chunkArray<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}

function chunkFilename(idx: number): string {
    return `chunk-${String(idx).padStart(4, '0')}.json`;
}
