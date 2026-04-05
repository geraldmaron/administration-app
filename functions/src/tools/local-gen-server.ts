import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';

function loadEnvFromFile(): void {
    const envPaths = ['.env.cli', '.env.local', '.env'].map(f => path.join(__dirname, '..', '..', f));
    for (const envPath of envPaths) {
        if (!fs.existsSync(envPath)) continue;
        const lines = fs.readFileSync(envPath, 'utf8').split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const eq = trimmed.indexOf('=');
            if (eq < 1) continue;
            const key = trimmed.slice(0, eq).trim();
            const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
            if (!(key in process.env)) process.env[key] = val;
        }
    }
}

loadEnvFromFile();

const PORT = parseInt(process.env.LOCAL_GEN_PORT || '3099', 10);
const serviceAccountPath = path.join(__dirname, '..', '..', '..', 'serviceAccountKey.json');

async function initializeFirebase() {
    const admin = await import('firebase-admin');
    if (!admin.apps.length) {
        if (fs.existsSync(serviceAccountPath)) {
            const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: 'the-administration-3a072',
                storageBucket: 'the-administration-3a072.firebasestorage.app',
            });
        } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            admin.initializeApp({
                projectId: 'the-administration-3a072',
                storageBucket: 'the-administration-3a072.firebasestorage.app',
            });
        } else {
            console.error('[local-gen-server] No Firebase credentials found.');
            console.error('  Provide serviceAccountKey.json at project root, or set GOOGLE_APPLICATION_CREDENTIALS.');
            process.exit(1);
        }
    }
    return admin;
}

function getIntakeSecret(): string | undefined {
    return process.env.GENERATION_INTAKE_SECRET || process.env.ADMIN_SECRET;
}

function isAuthorized(req: http.IncomingMessage): boolean {
    const secret = getIntakeSecret();
    const adminHeader = req.headers['x-admin-secret'] as string | undefined;
    const authHeader = req.headers['authorization'] as string | undefined;
    let bearerToken: string | undefined;
    if (authHeader) {
        const [scheme, token] = authHeader.split(' ', 2);
        if (scheme?.toLowerCase() === 'bearer' && token) bearerToken = token;
    }
    const provided = adminHeader ?? bearerToken;
    if (secret && provided === secret) return true;
    if (!secret) return true;
    return false;
}

function readBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        req.on('error', reject);
    });
}

interface QueueItem {
    jobId: string;
    bundle: string;
    totalBundles: number;
    body: any;
}

async function main() {
    const admin = await initializeFirebase();
    const db = admin.firestore();

    const configSnap = await db.doc('world_state/generation_config').get();
    const ollamaUrl = configSnap.data()?.ollama_base_url;
    if (ollamaUrl) {
        process.env.OLLAMA_BASE_URL = ollamaUrl;
        console.log(`[local-gen-server] OLLAMA_BASE_URL = ${ollamaUrl}`);
    }

    const { executeGenerationBundle } = await import('../generation-services');
    const { fetchOllamaModels } = await import('../lib/generation-models');

    if (ollamaUrl) {
        const models = await fetchOllamaModels(ollamaUrl);
        console.log(`[local-gen-server] Ollama models available: ${models.join(', ') || 'none'}`);
    }

    // Async queue with configurable concurrency.
    // Set LOCAL_GEN_CONCURRENCY env var to run multiple bundles in parallel.
    // For Ollama: concurrency > 1 requires enough VRAM to hold multiple models simultaneously.
    const CONCURRENCY = Math.max(1, parseInt(process.env.LOCAL_GEN_CONCURRENCY || '1', 10));
    console.log(`[local-gen-server] Concurrency: ${CONCURRENCY}`);

    const queue: QueueItem[] = [];
    const jobBundlesCompleted = new Map<string, number>();
    let activeWorkers = 0;

    async function finalizeJob(jobId: string): Promise<void> {
        const jobSnap = await db.collection('generation_jobs').doc(jobId).get();
        const data = jobSnap.data();
        if (!data) return;
        const completedCount = data.completedCount ?? 0;
        const failedCount = data.failedCount ?? 0;
        const status = completedCount > 0 ? 'completed' : 'failed';
        await db.collection('generation_jobs').doc(jobId).update({
            status,
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastHeartbeatAt: admin.firestore.FieldValue.serverTimestamp(),
            progress: 100,
            currentPhase: status,
            currentMessage: `Job ${status}: ${completedCount} saved, ${failedCount} failed`,
        });
        console.log(`[local-gen-server] Finalized job ${jobId}: ${status} (${completedCount} saved, ${failedCount} failed)`);
        jobBundlesCompleted.delete(jobId);
    }

    async function processItem(item: QueueItem): Promise<void> {
        try {
            const result = await executeGenerationBundle(item.body);
            console.log(`[local-gen-server] Bundle ${item.bundle} (job ${item.jobId}): ${result.completedCount} saved, ${result.failedCount} failed`);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            console.error(`[local-gen-server] Bundle ${item.bundle} (job ${item.jobId}) failed:`, message);
        }
        const done = (jobBundlesCompleted.get(item.jobId) ?? 0) + 1;
        jobBundlesCompleted.set(item.jobId, done);
        if (done >= item.totalBundles) {
            await finalizeJob(item.jobId).catch(e =>
                console.error(`[local-gen-server] Finalization failed for job ${item.jobId}:`, e?.message ?? e)
            );
        }
    }

    function drainQueue(): void {
        while (activeWorkers < CONCURRENCY && queue.length > 0) {
            const item = queue.shift()!;
            activeWorkers++;
            processItem(item).finally(() => {
                activeWorkers--;
                drainQueue(); // fill slot with next queued item
            });
        }
    }

    const server = http.createServer(async (req, res) => {
        const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);

        if (req.method === 'GET' && url.pathname === '/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, concurrency: CONCURRENCY, active: activeWorkers, queued: queue.length, pendingJobs: jobBundlesCompleted.size }));
            return;
        }

        if (!isAuthorized(req)) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
        }

        if (req.method !== 'POST' || url.pathname !== '/processGenerationBundle') {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Not found' }));
            return;
        }

        let body: any;
        try {
            const raw = await readBody(req);
            body = JSON.parse(raw);
        } catch {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid JSON body' }));
            return;
        }

        const { jobId, bundle } = body;
        if (!jobId || !bundle) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'jobId and bundle are required' }));
            return;
        }

        // totalBundles tells us when a job is fully dispatched so we can finalize it.
        // n8n passes this in the payload; fall back to reading from Firestore if absent.
        let totalBundles: number = typeof body.totalBundles === 'number' ? body.totalBundles : 0;
        if (totalBundles < 1) {
            const snap = await db.collection('generation_jobs').doc(jobId).get();
            const bundles = snap.data()?.bundles;
            totalBundles = Array.isArray(bundles) ? bundles.length : 1;
        }

        queue.push({ jobId, bundle, totalBundles, body });
        console.log(`[local-gen-server] Queued bundle ${bundle} (job ${jobId}) — queue depth: ${queue.length}`);

        res.writeHead(202, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ queued: true, jobId, bundle, queuePosition: queue.length }));

        drainQueue();
    });

    server.timeout = 0; // No timeout — individual requests return immediately (202)

    server.listen(PORT, '0.0.0.0', () => {
        console.log(`[local-gen-server] Listening on http://0.0.0.0:${PORT}`);
        console.log(`[local-gen-server] POST /processGenerationBundle  (async queue)`);
        console.log(`[local-gen-server] GET  /health`);
    });
}

main().catch((err) => {
    console.error('[local-gen-server] Fatal:', err?.message ?? err);
    process.exit(1);
});
