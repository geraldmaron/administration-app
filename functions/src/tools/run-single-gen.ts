/**
 * Run a single scenario generation with a pre-seeded concept, bypassing the architect.
 *
 * Usage (from functions/):
 *   npx tsx src/tools/run-single-gen.ts --bundle economy --concept "Your concept text here"
 *   npx tsx src/tools/run-single-gen.ts --bundle economy  (random concept via architect)
 */

import * as path from 'path';
import * as fs from 'fs';
import type { GeneratedConcept } from '../scenario-engine';

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

const serviceAccountPath = path.join(__dirname, '..', '..', '..', 'serviceAccountKey.json');

function parseArgs() {
    const args = process.argv.slice(2);
    const getArg = (flag: string) => {
        const idx = args.indexOf(flag);
        return idx >= 0 ? args[idx + 1] : undefined;
    };
    const bundle = getArg('--bundle');
    const concept = getArg('--concept');
    return { bundle, concept };
}

async function main() {
    const { bundle, concept } = parseArgs();

    if (!bundle) {
        console.error('Usage: npx tsx src/tools/run-single-gen.ts --bundle <bundleId> [--concept "text"]');
        process.exit(1);
    }

    const admin = await import('firebase-admin');
    if (!admin.apps.length) {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }

    const genModels = await import('../lib/generation-models');
    const scenarioEngine = await import('../scenario-engine');
    const { isValidBundleId } = await import('../data/schemas/bundleIds');

    if (!isValidBundleId(bundle)) {
        console.error(`Invalid bundle: "${bundle}"`);
        process.exit(1);
    }

    const db = admin.firestore();
    const configSnap = await db.doc('world_state/generation_config').get();
    const ollamaUrl = configSnap.data()?.ollama_base_url;
    if (!ollamaUrl) {
        console.error('[run-single-gen] No ollama_base_url in world_state/generation_config');
        process.exit(1);
    }
    process.env.OLLAMA_BASE_URL = ollamaUrl;

    const availableModels = await genModels.fetchOllamaModels(ollamaUrl);
    if (availableModels.length === 0) {
        console.error(`[run-single-gen] No Ollama models at ${ollamaUrl}`);
        process.exit(1);
    }
    const modelConfig = genModels.buildOllamaModelConfig(availableModels);

    console.log('\nModel assignment:');
    Object.entries(modelConfig).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
    console.log('');

    scenarioEngine.setEngineEventHandler((event: { level: string; code: string; message: string }) => {
        const level = event.level.toUpperCase().padEnd(7, ' ');
        console.log(`[Event] ${level} ${event.code} :: ${event.message}`);
    });

    const preSeededConcepts: GeneratedConcept[] | undefined = concept
        ? [{ concept, theme: 'economic policy', severity: 'medium', difficulty: 3, actorPattern: 'domestic' }]
        : undefined;

    if (concept) {
        console.log(`========================================================================`);
        console.log(`  Bundle: ${bundle}  |  Count: 1  |  CONCEPT: ${concept.slice(0, 70)}`);
        console.log(`========================================================================`);
    } else {
        console.log(`[run-single-gen] No concept provided — architect will generate one`);
    }

    const result = await scenarioEngine.generateScenarios({
        mode: 'manual',
        bundle: bundle as any,
        count: 1,
        concurrency: 1,
        modelConfig,
        preSeededConcepts,
        onAttemptFailed: ({ attempt, maxAttempts, score, topIssues }) => {
            console.log(`\n⚠  Attempt ${attempt}/${maxAttempts} failed (score ${score}): ${topIssues.slice(0, 3).join(', ')}`);
        },
    });

    if (result.scenarios.length > 0) {
        console.log(`\n✅ ACCEPTED: ${result.scenarios[0].id} — "${result.scenarios[0].title}"`);
        console.log(`   Token summary: ${result.tokenSummary.callCount} calls`);
    } else {
        console.log(`\n❌ No scenarios accepted after all attempts`);
    }
    process.exit(0);
}

main().catch(err => {
    console.error('[run-single-gen] Fatal error:', err?.message ?? err);
    process.exit(1);
});
