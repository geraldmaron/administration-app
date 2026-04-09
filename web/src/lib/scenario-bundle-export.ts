import { FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { db } from '@/lib/firebase-admin';

const BUCKET_NAME = process.env.STORAGE_BUCKET || 'the-administration-3a072.firebasestorage.app';
const BUNDLE_PREFIX = 'scenario-bundles';
const MANIFEST_DOC = 'world_state/scenario_manifest';
const CHUNK_SIZE = 250;
const SERVER_ONLY_FIELDS = new Set(['created_at', 'storage_path', '_embedding', 'embedding_model', 'embedding_version']);

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

async function fetchExistingChunkVersions(bundleId: string): Promise<Record<number, number>> {
  const snap = await db.doc(MANIFEST_DOC).get();
  if (!snap.exists) return {};
  const data = snap.data() as Record<string, unknown>;
  const existing = (data?.bundles as Record<string, { chunks?: ChunkMeta[] }>)?.[bundleId]?.chunks ?? [];
  return Object.fromEntries(existing.map((c) => [c.idx, c.version]));
}

export async function exportScenarioBundle(bundleId: string): Promise<number> {
  const snapshot = await db
    .collection('scenarios')
    .where('metadata.bundle', '==', bundleId)
    .where('is_active', '==', true)
    .get();

  if (snapshot.empty) {
    return 0;
  }

  const scenarios = snapshot.docs.map((doc) => {
    const data: Record<string, unknown> = { id: doc.id, ...doc.data() };
    SERVER_ONLY_FIELDS.forEach((field) => delete data[field]);
    return data;
  });

  const chunks = chunkArray(scenarios, CHUNK_SIZE);
  const bucket = getStorage().bucket(BUCKET_NAME);
  const existingChunkVersions = await fetchExistingChunkVersions(bundleId);
  const chunkMetas: ChunkMeta[] = [];

  await Promise.all(
    chunks.map(async (chunk, idx) => {
      const json = JSON.stringify(chunk);
      const sizeBytes = Buffer.byteLength(json, 'utf8');
      const filePath = `${BUNDLE_PREFIX}/${bundleId}/${chunkFilename(idx)}`;

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

  const ref = db.doc(MANIFEST_DOC);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const existing = snap.exists ? (snap.data() as Record<string, unknown>) : {};
    const bundles = (existing?.bundles as Record<string, unknown>) ?? {};
    const currentBundleVersion = ((bundles[bundleId] as { version?: number })?.version) ?? 0;
    const currentManifestVersion = (existing?.manifestVersion as number) ?? 0;
    const totalCount = chunkMetas.reduce((sum, c) => sum + c.count, 0);

    const bundleEntry: BundleManifestEntry = {
      version: currentBundleVersion + 1,
      totalCount,
      chunkSize: CHUNK_SIZE,
      chunks: chunkMetas,
    };

    tx.set(ref, {
      manifestVersion: currentManifestVersion + 1,
      lastUpdated: FieldValue.serverTimestamp(),
      bundles: {
        ...bundles,
        [bundleId]: bundleEntry,
      },
    });
  });

  return scenarios.length;
}

export async function exportScenarioBundles(bundleIds: Iterable<string>): Promise<Record<string, number>> {
  const uniqueBundleIds = Array.from(new Set(Array.from(bundleIds).filter(Boolean)));
  const results = await Promise.allSettled(
    uniqueBundleIds.map(async (bundleId) => ({
      bundleId,
      count: await exportScenarioBundle(bundleId),
    }))
  );

  const summary: Record<string, number> = {};
  const failures: string[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      summary[result.value.bundleId] = result.value.count;
    } else {
      failures.push(String(result.reason));
    }
  }

  if (failures.length > 0) {
    throw new Error(`Bundle export failed: ${failures.join('; ')}`);
  }

  return summary;
}
