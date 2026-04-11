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
 *         version: number,         ← bumped when any chunk changes
 *         totalCount: number,
 *         chunkSize: number,
 *         chunks: [{ idx, version, count, sizeBytes }],
 *         scenarioHashes: {        ← NEW: scenarioId → SHA-256 of stable content
 *           [scenarioId]: string
 *         }
 *       }
 *     }
 *   }
 *
 * iOS Bundle Delta Contract (scenario-level granularity)
 * ────────────────────────────────────────────────────────
 * When `scenarioHashes` is present in the bundle manifest entry:
 *
 *   1. On first load, download all chunks as before.
 *   2. On subsequent loads:
 *      a. Fetch the manifest (1 Firestore read).
 *      b. Diff `manifest.bundles[bundleId].scenarioHashes` against the locally
 *         stored `scenarioHashes` dictionary (persisted in UserDefaults or a
 *         local JSON file alongside the chunk cache).
 *      c. If the hash for a given scenarioId changed (or is new), mark the
 *         containing chunk stale. The chunk index is deterministic:
 *           chunkIdx = floor(sortedScenarioIndex / CHUNK_SIZE)
 *         Alternatively, iOS can re-download any chunk whose containing
 *         scenario hashes differ, using the existing chunk-version mechanism
 *         as a coarser fallback.
 *      d. Download only the stale chunks.
 *      e. After decoding, replace individual scenarios in the local pool by
 *         scenarioId rather than replacing entire chunks.
 *   3. The bundle `version` field continues to bump atomically on any export,
 *      so clients that predate `scenarioHashes` remain compatible.
 *   4. `scenarioHashes` excludes volatile fields: `updatedAt`, `createdAt`,
 *      `metadata.generatedAt`, `metadata.auditMetadata.lastAudited`,
 *      `metadata.acceptanceMetadata.acceptedAt`. The hash is computed over
 *      the scenario's stable narrative and structural content only.
 *   5. Persist the received `scenarioHashes` map locally (keyed by bundleId)
 *      so the next launch can diff without a full re-download.
 */
import * as crypto from 'crypto';
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
    scenarioHashes: Record<string, string>;
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

    const scenarioHashes: Record<string, string> = {};
    for (const scenario of scenarios) {
        const id = scenario['id'] as string;
        if (id) scenarioHashes[id] = computeScenarioContentHash(scenario);
    }

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

    await updateBundleManifest(bundleId, chunkMetas, scenarioHashes);

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

async function updateBundleManifest(
    bundleId: string,
    chunkMetas: ChunkMeta[],
    scenarioHashes: Record<string, string>,
): Promise<void> {
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
            scenarioHashes,
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
// Scenario content hash
// ---------------------------------------------------------------------------

/**
 * Computes a SHA-256 hash over the stable content fields of a scenario document.
 * Volatile fields (timestamps, audit metadata timestamps, generation provenance)
 * are excluded so that administrative re-stamps do not invalidate iOS caches.
 */
export function computeScenarioContentHash(scenario: Record<string, unknown>): string {
    const stable = extractStableFields(scenario);
    const canonical = JSON.stringify(stable, sortedReplacer);
    return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}

const VOLATILE_METADATA_KEYS: ReadonlySet<string> = new Set([
    'generatedAt',
    'lastAudited',
    'acceptedAt',
]);

const VOLATILE_TOP_LEVEL_KEYS: ReadonlySet<string> = new Set([
    'createdAt',
    'updatedAt',
    '_embedding',
    'embedding_model',
    'embedding_version',
    'created_at',
]);

function extractStableFields(doc: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(doc)) {
        if (VOLATILE_TOP_LEVEL_KEYS.has(key)) continue;
        if (key === 'metadata' && value !== null && typeof value === 'object') {
            result[key] = stripVolatileMetadataKeys(value as Record<string, unknown>);
            continue;
        }
        result[key] = value;
    }
    return result;
}

function stripVolatileMetadataKeys(meta: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(meta)) {
        if (VOLATILE_METADATA_KEYS.has(key)) continue;
        if (key === 'generationProvenance' || key === 'acceptanceMetadata' || key === 'auditMetadata') {
            if (value !== null && typeof value === 'object') {
                result[key] = stripVolatileMetadataKeys(value as Record<string, unknown>);
                continue;
            }
        }
        result[key] = value;
    }
    return result;
}

function sortedReplacer(_key: string, value: unknown): unknown {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))
        );
    }
    return value;
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
