/**
 * Generate scenarios for a single bundle and export to Storage.
 *
 * Run from functions/:
 *   npx tsx src/tools/generate-bundle.ts --bundle diplomacy --count 10
 *   npx tsx src/tools/generate-bundle.ts --bundle diplomacy --count 10 --dry-run
 *
 * Requires OPENROUTER_API_KEY for cloud, or `USE_OPENAI_DIRECT=true` with OPENAI_API_KEY, or `--ollama` (local).
 * Also requires serviceAccountKey.json at project root (or GOOGLE_APPLICATION_CREDENTIALS).
 */

import * as path from 'path';
import * as fs from 'fs';

function loadEnvFromFile(): void {
    const envPaths = ['.env.cli', '.env.local', '.env'].map((fileName) =>
        path.join(__dirname, '..', '..', fileName)
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
            if (!(key in process.env) || process.env[key] === '') process.env[key] = val;
        }
    }
}

loadEnvFromFile();

// ---------------------------------------------------------------------------
// Firebase init
// ---------------------------------------------------------------------------

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
            console.error('[generate-bundle] No Firebase credentials found.');
            console.error('  Provide serviceAccountKey.json at project root, or set GOOGLE_APPLICATION_CREDENTIALS.');
            process.exit(1);
        }
    }

    return admin;
}

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

function parseArgs() {
    const args = process.argv.slice(2);
    const getArg = (flag: string): string | undefined => {
        const idx = args.indexOf(flag);
        return idx >= 0 ? args[idx + 1] : undefined;
    };

    const bundle = getArg('--bundle');
    const count = parseInt(getArg('--count') ?? '10', 10);
    const dryRun = args.includes('--dry-run');
    const skipExport = args.includes('--skip-export');
    const useOllama = args.includes('--ollama');

    return { bundle, count, dryRun, skipExport, useOllama };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    const { bundle, count, dryRun, skipExport, useOllama } = parseArgs();
    const { isValidBundleId } = await import('../data/schemas/bundleIds');

    if (!bundle) {
        console.error('Usage: npx tsx src/tools/generate-bundle.ts --bundle <bundleId> --count <n>');
        console.error('  --dry-run      Show plan without generating');
        console.error('  --skip-export  Generate and save to Firestore but skip Storage export');
        console.error('  --ollama       Use Ollama (local) instead of cloud OpenRouter');
        process.exit(1);
    }

    if (!isValidBundleId(bundle)) {
        console.error(`Invalid bundle: "${bundle}"`);
        process.exit(1);
    }

    const directOpenAI =
        process.env.USE_OPENAI_DIRECT === 'true' &&
        !!(process.env.OPENAI_API_KEY || process.env.OPENAI_KEY);
    const hasCloudKey = !!process.env.OPENROUTER_API_KEY || directOpenAI;
    if (!useOllama && !hasCloudKey) {
        console.error(
            '[generate-bundle] No cloud LLM key found. Set OPENROUTER_API_KEY, or USE_OPENAI_DIRECT=true with OPENAI_API_KEY, or pass --ollama for local models.',
        );
        process.exit(1);
    }

    await initializeFirebase();

    const [scenarioEngine, storage, bundleExporter, genModels] = await Promise.all([
        import('../scenario-engine'),
        import('../storage'),
        import('../bundle-exporter'),
        import('../lib/generation-models'),
    ]);

    scenarioEngine.setEngineEventHandler((event) => {
        const ts = new Date().toISOString().slice(11, 19);
        const icon = event.level === 'success' ? '+' : event.level === 'error' ? 'X' : event.level === 'warning' ? '!' : '-';
        const sep = '─'.repeat(70);
        console.log(`\n  [${ts}] [${icon}] ${event.message}`);
        if (event.data?.promptPreview) {
            console.log(`  ${sep}`);
            console.log(`  PROMPT (first 500 chars):`);
            console.log(`  ${String(event.data.promptPreview).replace(/\n/g, '\n  ')}`);
            console.log(`  ${sep}`);
        }
        if (event.data?.responsePreview) {
            console.log(`  ${sep}`);
            console.log(`  RESPONSE (first 600 chars):`);
            console.log(`  ${String(event.data.responsePreview).replace(/\n/g, '\n  ')}`);
            console.log(`  ${sep}`);
        }
        if (event.data?.tokens) {
            const t = event.data.tokens as any;
            console.log(`  TOKENS: input=${t.inputTokens ?? t.prompt_tokens ?? '?'} output=${t.outputTokens ?? t.completion_tokens ?? '?'}`);
        }
        if (event.data?.issues && Array.isArray(event.data.issues)) {
            for (const issue of event.data.issues as any[]) {
                console.log(`  ISSUE: [${issue.severity}] ${issue.rule}: ${issue.message}`);
            }
        }
        if (event.data?.score !== undefined) {
            console.log(`  SCORE: ${event.data.score}`);
        }
    });

    let modelConfig: import('../lib/generation-models').GenerationModelConfig | undefined;
    if (useOllama) {
        const admin = await import('firebase-admin');
        const db = admin.firestore();
        const configSnap = await db.doc('world_state/generation_config').get();
        const ollamaUrl = configSnap.data()?.ollama_base_url;
        if (!ollamaUrl) {
            console.error('[generate-bundle] No ollama_base_url in world_state/generation_config');
            process.exit(1);
        }
        process.env.OLLAMA_BASE_URL = ollamaUrl;
        const availableModels = await genModels.fetchOllamaModels(ollamaUrl);
        if (availableModels.length === 0) {
            console.error(`[generate-bundle] No Ollama models found at ${ollamaUrl}`);
            process.exit(1);
        }
        modelConfig = genModels.buildOllamaModelConfig(availableModels);
        console.log(`[generate-bundle] Ollama models: ${JSON.stringify(modelConfig, null, 2)}`);
    }

    console.log(`\n[generate-bundle] Bundle: ${bundle} · Count: ${count}${dryRun ? ' · DRY RUN' : ''}${useOllama ? ' · OLLAMA' : ''}\n`);

    if (dryRun) {
        console.log('[generate-bundle] Dry run — no scenarios will be written.');
        return;
    }

    const genResult = await scenarioEngine.generateScenarios({
        mode: 'manual',
        bundle,
        count,
        concurrency: 3,
        ...(modelConfig ? { modelConfig } : {}),
        onProgress: ({ current, total, stage }) => {
            process.stdout.write(`\r  [${current}/${total}] ${stage}                    `);
        },
        onAttemptFailed: ({ attempt, maxAttempts, score, topIssues }) => {
            console.log(`\n  ⚠ Attempt ${attempt}/${maxAttempts} failed (score ${score}): ${topIssues.slice(0, 2).join(', ')}`);
        },
    });
    const results = genResult.scenarios;

    process.stdout.write('\n');
    console.log(`\n[generate-bundle] ✓ Generated: ${results.length} scenarios (${genResult.tokenSummary.callCount} LLM calls, $${genResult.tokenSummary.costUsd})\n`);

    // Save all generated scenarios to Firestore before exporting
    console.log(`[generate-bundle] Saving ${results.length} scenarios to Firestore…`);
    let savedCount = 0;
    for (const scenario of results) {
        const result = await storage.saveScenario(scenario as any);
        if (result.saved) savedCount++;
        else console.warn(`  ⚠ Skipped ${scenario.id}: ${result.reason}`);
    }
    console.log(`[generate-bundle] ✓ Saved: ${savedCount}/${results.length} scenarios\n`);

    if (skipExport) {
        console.log('[generate-bundle] Skipping Storage export (--skip-export).');
        return;
    }

    console.log(`[generate-bundle] Exporting bundle to Storage…`);
    const exported = await bundleExporter.exportBundle(bundle);
    console.log(`[generate-bundle] ✓ Export complete: ${exported} scenarios in ${bundle}\n`);
}

main().catch((err) => {
    console.error('[generate-bundle] Fatal error:', err?.message ?? err);
    process.exit(1);
});
