/**
 * Ollama Model Benchmark Tool
 *
 * Runs standardised prompts against each available Ollama model for each
 * pipeline phase, records timing metrics, stores results in Firestore, and
 * prunes old runs.
 *
 * Usage (from functions/):
 *
 *   pnpm dlx tsx src/tools/benchmark-models.ts
 *   pnpm dlx tsx src/tools/benchmark-models.ts --phases architect,drafter
 *   pnpm dlx tsx src/tools/benchmark-models.ts --models ai-general,ai-coding
 *   pnpm dlx tsx src/tools/benchmark-models.ts --cleanup-only
 *   pnpm dlx tsx src/tools/benchmark-models.ts --list
 */

import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as http from 'http';
import * as https from 'https';

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

function loadEnvFromFile(): void {
    const envPaths = ['.env.cli', '.env.local', '.env'].map(
        (f) => path.join(__dirname, '..', '..', f),
    );
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type GenerationPhase = 'architect' | 'drafter' | 'advisor' | 'repair' | 'contentQuality' | 'narrativeReview';

interface OllamaGenerateResponse {
    model: string;
    response: string;
    done: boolean;
    total_duration?: number;
    load_duration?: number;
    prompt_eval_count?: number;
    prompt_eval_duration?: number;
    eval_count?: number;
    eval_duration?: number;
}

interface BenchmarkResult {
    runId: string;
    model: string;
    phase: GenerationPhase;
    promptTokens: number;
    outputTokens: number;
    tokPerSec: number;
    totalMs: number;
    loadMs: number;
    evalMs: number;
    promptEvalMs: number;
    responseLength: number;
    success: boolean;
    error?: string;
    timestamp: string;
}

interface BenchmarkRun {
    runId: string;
    startedAt: string;
    completedAt: string;
    ollamaHost: string;
    totalResults: number;
    successCount: number;
    failureCount: number;
    phasesRan: GenerationPhase[];
    modelsRan: string[];
    notes: string;
}

// ---------------------------------------------------------------------------
// Phase prompts — sized to approximate real pipeline usage (~2000–3000 chars)
// ---------------------------------------------------------------------------

const PHASE_PROMPTS: Record<GenerationPhase, string> = {
    architect: `You are a scenario architect for a geopolitical simulation game. Generate exactly 2 distinct scenario concepts for the "health" policy bundle. Each concept must be a realistic political dilemma a sitting government would face.

Format your response as a JSON array with exactly 2 objects:
[
  {
    "title": "short title (max 8 words)",
    "premise": "2-3 sentences describing the dilemma",
    "severity": "moderate|high|extreme",
    "scope": "universal|regional|exclusive",
    "suggestedConditions": ["condition1", "condition2"]
  }
]

Requirements:
- Scenarios must be distinct — different causes, different stakeholders
- Severity must match the real-world impact described
- Do not add commentary outside the JSON array`,

    drafter: `You are a scenario drafter for a geopolitical simulation game. Draft a complete scenario from this concept:

CONCEPT: A pharmaceutical company's new drug approval reveals deep corruption in the health regulatory body, forcing the government to choose between covering up the scandal or triggering public panic.

Draft the scenario as a JSON object with this exact structure:
{
  "title": "string",
  "description": "string (2-3 sentences, present tense)",
  "severity": "high",
  "scope": "universal",
  "bundle": "health",
  "options": [
    {
      "id": "option_a",
      "label": "string (max 6 words)",
      "description": "string (1-2 sentences)",
      "effects": [
        { "metricId": "approval", "value": -3.5, "label": "string" },
        { "metricId": "health", "value": 2.0, "label": "string" }
      ]
    },
    {
      "id": "option_b",
      "label": "string (max 6 words)",
      "description": "string (1-2 sentences)",
      "effects": [
        { "metricId": "approval", "value": 1.5, "label": "string" },
        { "metricId": "corruption", "value": -2.0, "label": "string" }
      ]
    },
    {
      "id": "option_c",
      "label": "string (max 6 words)",
      "description": "string (1-2 sentences)",
      "effects": [
        { "metricId": "health", "value": -1.0, "label": "string" },
        { "metricId": "liberty", "value": 1.5, "label": "string" }
      ]
    }
  ],
  "conditions": [
    { "metricId": "corruption", "operator": "gt", "value": 50 }
  ]
}

Return only the JSON object, no additional text.`,

    advisor: `You are a political advisor reviewing a scenario for a geopolitical simulation game. Provide brief feedback on this scenario draft:

SCENARIO: "Pharmaceutical Corruption Crisis" — A major drug regulator has been taking bribes from pharmaceutical companies for years. Whistleblowers leak documents to the press. Options: (A) Launch independent inquiry -3.5 approval, +2.0 health; (B) Suppress the story +1.5 approval, -2.0 corruption; (C) Partial reform -1.0 health, +1.5 liberty.

Evaluate in JSON format:
{
  "overallQuality": "poor|fair|good|excellent",
  "optionBalance": "are options meaningfully distinct? one sentence",
  "effectPlausibility": "are the metric effects realistic? one sentence",
  "suggestedImprovements": ["improvement1", "improvement2"],
  "advisorPerspectives": [
    { "role": "economic_advisor", "stance": "one sentence reaction" },
    { "role": "interior_role", "stance": "one sentence reaction" }
  ]
}`,

    repair: `You are a scenario repair agent. The following scenario failed an audit with these issues:

ISSUES:
1. severity-effect-mismatch: scenario marked "critical" but max effect value is 1.8 (requires ≥5.0)
2. missing-conditions: scenario premise requires low public-order but no conditions set
3. option-differentiation: options A and B produce nearly identical outcomes

SCENARIO EXCERPT:
{
  "title": "Public Health Emergency Declaration",
  "severity": "critical",
  "options": [
    { "id": "option_a", "effects": [{ "metricId": "health", "value": 1.8 }] },
    { "id": "option_b", "effects": [{ "metricId": "health", "value": 1.5 }] },
    { "id": "option_c", "effects": [{ "metricId": "health", "value": -1.0 }, { "metricId": "economy", "value": -2.0 }] }
  ],
  "conditions": []
}

Return a repaired JSON patch object:
{
  "severity": "corrected severity value",
  "options": [ /* repaired options array with distinct effects matching critical severity */ ],
  "conditions": [ /* required conditions */ ]
}`,

    contentQuality: `You are a content quality reviewer for a geopolitical simulation game. Score this scenario on these dimensions:

SCENARIO:
Title: "National Healthcare Rationing Crisis"
Description: "A severe budget shortfall forces the government to implement healthcare rationing, denying treatment to lower-priority patients. Hospitals are overwhelmed and protests begin outside parliament."
Severity: extreme
Options:
A) Emergency NHS funding injection — effects: economy -4.5, health +3.5, approval +2.0
B) Private sector partnership — effects: equality -3.0, health +2.0, corruption +1.5
C) Stricter rationing criteria — effects: health -2.5, approval -4.0, public_order -2.0

Return scores as JSON:
{
  "realism": { "score": 1-10, "notes": "string" },
  "optionBalance": { "score": 1-10, "notes": "string" },
  "narrativeClarity": { "score": 1-10, "notes": "string" },
  "effectCalibration": { "score": 1-10, "notes": "string" },
  "overallScore": 1-10,
  "passesQualityGate": true|false,
  "criticalIssues": []
}`,

    narrativeReview: `You are a narrative quality reviewer for a geopolitical simulation game. Evaluate the narrative quality of this scenario:

SCENARIO:
Title: "Pandemic Preparedness Overhaul"
Description: "After a near-miss with a novel pathogen, an independent review reveals catastrophic gaps in the national pandemic response infrastructure. The {health_role} presents three paths forward to cabinet."
Options:
A) "Full infrastructure rebuild" — Invest heavily in new facilities, stockpiles, and training.
B) "International partnership model" — Join a multinational rapid-response framework.
C) "Incremental improvements" — Patch existing gaps without systemic change.

Evaluate and respond in JSON:
{
  "narrativeEngagement": { "score": 1-10, "notes": "string" },
  "playerAgencyClarity": { "score": 1-10, "notes": "string" },
  "toneConsistency": { "score": 1-10, "notes": "string" },
  "tokenUsage": { "appropriate": true|false, "issues": [] },
  "suggestedRevisions": ["revision1"],
  "passesNarrativeGate": true|false
}`,
};

// ---------------------------------------------------------------------------
// Ollama HTTP client
// ---------------------------------------------------------------------------

function ollamaRequest(baseUrl: string, path: string, body: unknown): Promise<string> {
    return new Promise((resolve, reject) => {
        const url = new URL(path, baseUrl);
        const payload = JSON.stringify(body);
        const isHttps = url.protocol === 'https:';
        const mod = isHttps ? https : http;
        const req = mod.request({
            hostname: url.hostname,
            port: url.port ? parseInt(url.port) : (isHttps ? 443 : 80),
            path: url.pathname,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
            timeout: 300_000,
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => resolve(data));
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out after 300s')); });
        req.write(payload);
        req.end();
    });
}

async function listOllamaModels(baseUrl: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
        const url = new URL('/api/tags', baseUrl);
        const mod = url.protocol === 'https:' ? https : http;
        const req = mod.get(url.toString(), { timeout: 10_000 }, (res) => {
            let data = '';
            res.on('data', (c) => (data += c));
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data) as { models?: Array<{ name: string }> };
                    resolve((parsed.models ?? []).map((m) => m.name));
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout listing models')); });
    });
}

async function runOllamaGenerate(
    baseUrl: string,
    model: string,
    prompt: string,
): Promise<OllamaGenerateResponse> {
    const raw = await ollamaRequest(baseUrl, '/api/generate', {
        model,
        prompt,
        stream: false,
        options: { num_ctx: 8192, temperature: 0.3 },
    });
    return JSON.parse(raw) as OllamaGenerateResponse;
}

// ---------------------------------------------------------------------------
// Firestore
// ---------------------------------------------------------------------------

async function initFirestore() {
    const admin = await import('firebase-admin');
    if (!admin.apps.length) {
        const serviceAccountPath = path.join(__dirname, '..', '..', '..', 'serviceAccountKey.json');
        if (fs.existsSync(serviceAccountPath)) {
            const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: 'the-administration-3a072',
            });
        } else {
            admin.initializeApp({ projectId: 'the-administration-3a072' });
        }
    }
    return admin.firestore();
}

async function saveRun(db: FirebaseFirestore.Firestore, run: BenchmarkRun): Promise<void> {
    await db.collection('model_benchmark_runs').doc(run.runId).set(run);
}

async function saveResults(db: FirebaseFirestore.Firestore, results: BenchmarkResult[]): Promise<void> {
    const batch = db.batch();
    for (const r of results) {
        const ref = db.collection('model_benchmark_results').doc();
        batch.set(ref, r);
    }
    await batch.commit();
}

async function pruneOldRuns(db: FirebaseFirestore.Firestore, keepCount = 50): Promise<number> {
    const snap = await db
        .collection('model_benchmark_runs')
        .orderBy('startedAt', 'desc')
        .get();

    if (snap.size <= keepCount) return 0;

    const toDelete = snap.docs.slice(keepCount);
    const runIds = toDelete.map((d) => d.id);

    let deletedResults = 0;
    for (const runId of runIds) {
        const results = await db
            .collection('model_benchmark_results')
            .where('runId', '==', runId)
            .get();
        const batch = db.batch();
        for (const doc of results.docs) {
            batch.delete(doc.ref);
            deletedResults++;
        }
        batch.delete(db.collection('model_benchmark_runs').doc(runId));
        await batch.commit();
    }

    return runIds.length;
}

async function listRuns(db: FirebaseFirestore.Firestore, limit = 20): Promise<void> {
    const snap = await db
        .collection('model_benchmark_runs')
        .orderBy('startedAt', 'desc')
        .limit(limit)
        .get();

    if (snap.empty) {
        console.log('No benchmark runs found.');
        return;
    }

    console.log(`\nLast ${snap.size} benchmark run(s):\n`);
    for (const doc of snap.docs) {
        const r = doc.data() as BenchmarkRun;
        console.log(`  ${r.runId}  ${r.startedAt.slice(0, 19)}  ${r.successCount}/${r.totalResults} passed  phases: ${r.phasesRan.join(',')}`);
    }
    console.log('');
}

// ---------------------------------------------------------------------------
// Benchmark runner
// ---------------------------------------------------------------------------

async function benchmarkModel(
    baseUrl: string,
    model: string,
    phase: GenerationPhase,
    runId: string,
): Promise<BenchmarkResult> {
    const prompt = PHASE_PROMPTS[phase];
    const base: BenchmarkResult = {
        runId,
        model,
        phase,
        promptTokens: 0,
        outputTokens: 0,
        tokPerSec: 0,
        totalMs: 0,
        loadMs: 0,
        evalMs: 0,
        promptEvalMs: 0,
        responseLength: 0,
        success: false,
        timestamp: new Date().toISOString(),
    };

    try {
        const resp = await runOllamaGenerate(baseUrl, model, prompt);
        const tokPerSec =
            resp.eval_count && resp.eval_duration
                ? resp.eval_count / (resp.eval_duration / 1e9)
                : 0;

        return {
            ...base,
            promptTokens: resp.prompt_eval_count ?? 0,
            outputTokens: resp.eval_count ?? 0,
            tokPerSec: Math.round(tokPerSec * 10) / 10,
            totalMs: Math.round((resp.total_duration ?? 0) / 1e6),
            loadMs: Math.round((resp.load_duration ?? 0) / 1e6),
            evalMs: Math.round((resp.eval_duration ?? 0) / 1e6),
            promptEvalMs: Math.round((resp.prompt_eval_duration ?? 0) / 1e6),
            responseLength: resp.response?.length ?? 0,
            success: true,
        };
    } catch (err) {
        return { ...base, success: false, error: err instanceof Error ? err.message : String(err) };
    }
}

function fmt(n: number, unit: string): string {
    return `${n}${unit}`;
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
    const args = process.argv.slice(2);
    const getFlag = (f: string) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };
    const hasFlag = (f: string) => args.includes(f);

    const ollamaBase = process.env.OLLAMA_BASE_URL ?? 'http://100.119.72.84:11434';
    const ALL_PHASES: GenerationPhase[] = ['architect', 'drafter', 'advisor', 'repair', 'contentQuality', 'narrativeReview'];

    const db = await initFirestore();

    if (hasFlag('--list')) {
        await listRuns(db);
        process.exit(0);
    }

    if (hasFlag('--cleanup-only')) {
        const deleted = await pruneOldRuns(db, 50);
        console.log(`Pruned ${deleted} old run(s).`);
        process.exit(0);
    }

    const phaseArg = getFlag('--phases');
    const modelArg = getFlag('--models');
    const notesArg = getFlag('--notes') ?? '';

    const phasesToRun = phaseArg
        ? (phaseArg.split(',').filter((p) => ALL_PHASES.includes(p as GenerationPhase)) as GenerationPhase[])
        : ALL_PHASES;

    let availableModels: string[];
    try {
        availableModels = await listOllamaModels(ollamaBase);
    } catch (err) {
        console.error(`Cannot reach Ollama at ${ollamaBase}:`, err instanceof Error ? err.message : err);
        process.exit(1);
    }

    const modelsToRun = modelArg
        ? modelArg.split(',').filter((m) => availableModels.includes(m) || availableModels.some((a) => a.startsWith(m)))
        : availableModels.filter((m) => !m.includes('vision') && !m.includes('vl:') && !m.includes('cloud'));

    if (modelsToRun.length === 0) {
        console.error('No matching models found. Available:', availableModels.join(', '));
        process.exit(1);
    }

    const runId = crypto.randomBytes(6).toString('hex');
    const startedAt = new Date().toISOString();

    console.log(`\n━━ Benchmark run ${runId} ━━`);
    console.log(`Ollama: ${ollamaBase}`);
    console.log(`Models: ${modelsToRun.join(', ')}`);
    console.log(`Phases: ${phasesToRun.join(', ')}\n`);

    const results: BenchmarkResult[] = [];

    for (const model of modelsToRun) {
        for (const phase of phasesToRun) {
            process.stdout.write(`  ${model.padEnd(30)} ${phase.padEnd(18)} `);
            const result = await benchmarkModel(ollamaBase, model, phase, runId);
            results.push(result);

            if (result.success) {
                console.log(
                    `${fmt(result.tokPerSec, ' tok/s').padStart(12)}  ` +
                    `${fmt(result.totalMs, 'ms').padStart(8)}  ` +
                    `load ${fmt(result.loadMs, 'ms').padStart(6)}  ` +
                    `in ${result.promptTokens}t → out ${result.outputTokens}t`,
                );
            } else {
                console.log(`FAILED — ${result.error?.slice(0, 80)}`);
            }
        }
    }

    const successCount = results.filter((r) => r.success).length;
    const completedAt = new Date().toISOString();

    const run: BenchmarkRun = {
        runId,
        startedAt,
        completedAt,
        ollamaHost: ollamaBase,
        totalResults: results.length,
        successCount,
        failureCount: results.length - successCount,
        phasesRan: phasesToRun,
        modelsRan: modelsToRun,
        notes: notesArg,
    };

    console.log(`\nSaving ${results.length} results to Firestore…`);
    await saveRun(db, run);
    await saveResults(db, results);

    const pruned = await pruneOldRuns(db, 50);
    if (pruned > 0) console.log(`Pruned ${pruned} old run(s).`);

    console.log(`\n✓ Run ${runId} complete — ${successCount}/${results.length} passed\n`);

    // Print summary table sorted by phase then tok/s
    const successful = results.filter((r) => r.success).sort((a, b) => {
        if (a.phase !== b.phase) return ALL_PHASES.indexOf(a.phase) - ALL_PHASES.indexOf(b.phase);
        return b.tokPerSec - a.tokPerSec;
    });

    if (successful.length > 0) {
        console.log('─── Summary by phase (fastest first) ───\n');
        let lastPhase = '';
        for (const r of successful) {
            if (r.phase !== lastPhase) {
                console.log(`  ${r.phase}`);
                lastPhase = r.phase;
            }
            console.log(
                `    ${r.model.padEnd(28)} ${String(r.tokPerSec).padStart(6)} tok/s  ${String(r.totalMs).padStart(7)}ms total`,
            );
        }
        console.log('');
    }

    process.exit(0);
}

main().catch((err) => {
    console.error('Benchmark failed:', err);
    process.exit(1);
});
