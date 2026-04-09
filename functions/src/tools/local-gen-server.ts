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
    // Track jobs that have a bundle actively processing so the queue heartbeat
    // doesn't overwrite their "generate" phase with "queued_local".
    const activeJobIds = new Set<string>();

    async function appendJobEvent(jobId: string, event: {
        level: 'info' | 'warning' | 'error' | 'success';
        code: string;
        message: string;
        bundle?: string;
        phase?: string;
        data?: Record<string, unknown>;
    }, heartbeat?: { currentBundle?: string; currentPhase?: string; currentMessage?: string }): Promise<void> {
        const jobRef = db.collection('generation_jobs').doc(jobId);
        const timestamp = admin.firestore.FieldValue.serverTimestamp();
        await Promise.all([
            jobRef.collection('events').add({
                timestamp,
                level: event.level,
                code: event.code,
                message: event.message,
                ...(event.bundle ? { bundle: event.bundle } : {}),
                ...(event.phase ? { phase: event.phase } : {}),
                ...(event.data ? { data: event.data } : {}),
            }),
            jobRef.set({
                lastHeartbeatAt: timestamp,
                updatedAt: timestamp,
                eventCount: admin.firestore.FieldValue.increment(1),
                ...(heartbeat?.currentBundle !== undefined ? { currentBundle: heartbeat.currentBundle } : {}),
                ...(heartbeat?.currentPhase !== undefined ? { currentPhase: heartbeat.currentPhase } : {}),
                ...(heartbeat?.currentMessage !== undefined ? { currentMessage: heartbeat.currentMessage } : {}),
            }, { merge: true }),
        ]);
    }

    const TERMINAL_STATUSES = new Set(['cancelled', 'failed', 'completed', 'pending_review']);

    async function refreshQueuedJobHeartbeats(): Promise<void> {
        const queuedByJob = new Map<string, { firstBundle: string; aheadCount: number; queuedBundles: number }>();
        queue.forEach((item, index) => {
            const existing = queuedByJob.get(item.jobId);
            if (existing) {
                existing.queuedBundles += 1;
                return;
            }
            queuedByJob.set(item.jobId, {
                firstBundle: item.bundle,
                aheadCount: activeWorkers + index,
                queuedBundles: 1,
            });
        });

        await Promise.allSettled(Array.from(queuedByJob.entries()).map(async ([jobId, state]) => {
            // Don't overwrite the "generate" phase for jobs that already have a bundle actively processing.
            if (activeJobIds.has(jobId)) return;
            const message = state.aheadCount > 0
                ? `Waiting in local runner queue (${state.aheadCount} bundle${state.aheadCount === 1 ? '' : 's'} ahead, ${state.queuedBundles} queued)`
                : `Queued on local runner (${state.queuedBundles} bundle${state.queuedBundles === 1 ? '' : 's'} queued)`;
            await db.collection('generation_jobs').doc(jobId).set({
                lastHeartbeatAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                currentBundle: state.firstBundle,
                currentPhase: 'queued_local',
                currentMessage: message,
            }, { merge: true });
        }));
    }

    const queueHeartbeatTimer = setInterval(() => {
        refreshQueuedJobHeartbeats().catch((err) => {
            console.error('[local-gen-server] Queue heartbeat refresh failed:', err?.message ?? err);
        });
    }, 15_000);

    async function finalizeJob(jobId: string): Promise<void> {
        const jobSnap = await db.collection('generation_jobs').doc(jobId).get();
        const data = jobSnap.data();
        if (!data) return;
        if (TERMINAL_STATUSES.has(data.status)) {
            console.log(`[local-gen-server] Skipping finalization for job ${jobId}: already ${data.status}`);
            jobBundlesCompleted.delete(jobId);
            return;
        }
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
        await appendJobEvent(jobId, {
            level: status === 'completed' ? 'success' : 'error',
            code: status === 'completed' ? 'job_completed' : 'job_failed',
            message: `Job ${status}: ${completedCount} saved, ${failedCount} failed.`,
            phase: status,
            data: { completedCount, failedCount },
        }, {
            currentPhase: status,
            currentMessage: `Job ${status}: ${completedCount} saved, ${failedCount} failed`,
        });
        console.log(`[local-gen-server] Finalized job ${jobId}: ${status} (${completedCount} saved, ${failedCount} failed)`);
        jobBundlesCompleted.delete(jobId);
    }

    async function processItem(item: QueueItem): Promise<void> {
        const preSnap = await db.collection('generation_jobs').doc(item.jobId).get();
        if (TERMINAL_STATUSES.has(preSnap.data()?.status)) {
            console.log(`[local-gen-server] Skipping bundle ${item.bundle} for job ${item.jobId}: already ${preSnap.data()?.status}`);
            if (!queue.some(q => q.jobId === item.jobId)) {
                activeJobIds.delete(item.jobId);
            }
            const done = (jobBundlesCompleted.get(item.jobId) ?? 0) + 1;
            jobBundlesCompleted.set(item.jobId, done);
            if (done >= item.totalBundles) {
                jobBundlesCompleted.delete(item.jobId);
            }
            return;
        }

        await db.collection('generation_jobs').doc(item.jobId).set({
            lastHeartbeatAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            currentBundle: item.bundle,
            currentPhase: 'generate',
            currentMessage: `Generating ${item.bundle}…`,
        }, { merge: true });
        await appendJobEvent(item.jobId, {
            level: 'info',
            code: 'bundle_dequeued_local',
            message: `Local generator started ${item.bundle}.`,
            bundle: item.bundle,
            phase: 'generate',
            data: { activeWorkers, queued: queue.length },
        }, {
            currentBundle: item.bundle,
            currentPhase: 'generate',
            currentMessage: `Generating ${item.bundle}…`,
        }).catch((err) => {
            console.error(`[local-gen-server] Failed to append start event for ${item.jobId}/${item.bundle}:`, err?.message ?? err);
        });

        activeJobIds.add(item.jobId);
        const heartbeatInterval = setInterval(async () => {
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    const snap = await db.collection('generation_jobs').doc(item.jobId).get();
                    if (TERMINAL_STATUSES.has(snap.data()?.status)) return;
                    await db.collection('generation_jobs').doc(item.jobId).update({
                        lastHeartbeatAt: admin.firestore.FieldValue.serverTimestamp(),
                        currentBundle: item.bundle,
                        currentMessage: `Generating ${item.bundle}…`,
                    });
                    break;
                } catch (err) {
                    if (attempt === 2) {
                        console.error(`[local-gen-server] Heartbeat failed after 3 attempts for ${item.jobId}:`, err);
                    } else {
                        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
                    }
                }
            }
        }, 30_000);

        try {
            const result = await executeGenerationBundle(item.body);
            console.log(`[local-gen-server] Bundle ${item.bundle} (job ${item.jobId}): ${result.completedCount} saved, ${result.failedCount} failed`);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            console.error(`[local-gen-server] Bundle ${item.bundle} (job ${item.jobId}) failed:`, message);
        } finally {
            clearInterval(heartbeatInterval);
            // Only remove from active set when no more bundles for this job remain in queue.
            if (!queue.some(q => q.jobId === item.jobId)) {
                activeJobIds.delete(item.jobId);
            }
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
                drainQueue();
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

        const queueDepth = queue.length;
        const queuePosition = Math.max(1, activeWorkers + queueDepth);
        await db.collection('generation_jobs').doc(jobId).set({
            lastHeartbeatAt: admin.firestore.FieldValue.serverTimestamp(),
            currentBundle: bundle,
            currentPhase: 'queued_local',
            currentMessage: queuePosition > 1
                ? `Queued for local generation: ${queuePosition - 1} bundle(s) ahead`
                : 'Queued for local generation',
        }, { merge: true });
        await appendJobEvent(jobId, {
            level: 'info',
            code: 'local_queue_enqueued',
            message: queuePosition > 1
                ? `Bundle ${bundle} queued for local generation with ${queuePosition - 1} bundle(s) ahead.`
                : `Bundle ${bundle} queued for local generation.`,
            bundle,
            phase: 'queued_local',
            data: {
                queueDepth,
                activeWorkers,
                queuePosition,
            },
        }, {
            currentBundle: bundle,
            currentPhase: 'queued_local',
            currentMessage: queuePosition > 1
                ? `Queued for local generation: ${queuePosition - 1} bundle(s) ahead`
                : 'Queued for local generation',
        }).catch((err) => {
            console.error(`[local-gen-server] Failed to append enqueue event for ${jobId}/${bundle}:`, err?.message ?? err);
        });

        res.writeHead(202, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ queued: true, jobId, bundle, queuePosition }));

        await refreshQueuedJobHeartbeats();
        drainQueue();
    });

    server.timeout = 0; // No timeout — individual requests return immediately (202)

    server.listen(PORT, '0.0.0.0', () => {
        console.log(`[local-gen-server] Listening on http://0.0.0.0:${PORT}`);
        console.log(`[local-gen-server] POST /processGenerationBundle  (async queue)`);
        console.log(`[local-gen-server] GET  /health`);
    });

    server.on('close', () => {
        clearInterval(queueHeartbeatTimer);
    });
}

main().catch((err) => {
    console.error('[local-gen-server] Fatal:', err?.message ?? err);
    process.exit(1);
});
