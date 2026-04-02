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

    const server = http.createServer(async (req, res) => {
        if (req.method !== 'POST' || req.url !== '/processGenerationBundle') {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Not found' }));
            return;
        }

        if (!isAuthorized(req)) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
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

        console.log(`[local-gen-server] Processing bundle: ${body.bundle} (job ${body.jobId})`);

        try {
            const result = await executeGenerationBundle(body);
            console.log(`[local-gen-server] Bundle ${body.bundle}: ${result.completedCount} saved, ${result.failedCount} failed`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            console.error(`[local-gen-server] Bundle ${body.bundle} failed:`, message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: message }));
        }
    });

    server.timeout = 600_000;

    server.listen(PORT, () => {
        console.log(`[local-gen-server] Listening on http://localhost:${PORT}`);
        console.log(`[local-gen-server] POST /processGenerationBundle`);
    });
}

main().catch((err) => {
    console.error('[local-gen-server] Fatal:', err?.message ?? err);
    process.exit(1);
});
