/**
 * Generate scenarios for a single bundle and export to Storage.
 *
 * Run from functions/:
 *   npx tsx src/tools/generate-bundle.ts --bundle diplomacy --count 10
 *   npx tsx src/tools/generate-bundle.ts --bundle diplomacy --count 10 --dry-run
 *
 * Requires: OPENAI_API_KEY env var and serviceAccountKey.json at project root.
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
            if (!(key in process.env)) process.env[key] = val;
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

    return { bundle, count, dryRun, skipExport };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    const { bundle, count, dryRun, skipExport } = parseArgs();
    const { isValidBundleId } = await import('../data/schemas/bundleIds');

    if (!bundle) {
        console.error('Usage: npx tsx src/tools/generate-bundle.ts --bundle <bundleId> --count <n>');
        console.error('  --dry-run      Show plan without generating');
        console.error('  --skip-export  Generate and save to Firestore but skip Storage export');
        process.exit(1);
    }

    if (!isValidBundleId(bundle)) {
        console.error(`Invalid bundle: "${bundle}"`);
        process.exit(1);
    }

    if (!process.env.OPENAI_API_KEY && !process.env.OPENAI_KEY) {
        console.error('[generate-bundle] OPENAI_API_KEY is not set. Generation will fail.');
        process.exit(1);
    }

    await initializeFirebase();

    const [scenarioEngine, storage, bundleExporter] = await Promise.all([
        import('../scenario-engine'),
        import('../storage'),
        import('../bundle-exporter'),
    ]);

    console.log(`\n[generate-bundle] Bundle: ${bundle} · Count: ${count}${dryRun ? ' · DRY RUN' : ''}\n`);

    if (dryRun) {
        console.log('[generate-bundle] Dry run — no scenarios will be written.');
        return;
    }

    const results = await scenarioEngine.generateScenarios({
        mode: 'manual',
        bundle,
        count,
        concurrency: 3,
        onProgress: ({ current, total, stage }) => {
            process.stdout.write(`\r  [${current}/${total}] ${stage}                    `);
        },
        onAttemptFailed: ({ attempt, maxAttempts, score, topIssues }) => {
            console.log(`\n  ⚠ Attempt ${attempt}/${maxAttempts} failed (score ${score}): ${topIssues.slice(0, 2).join(', ')}`);
        },
    });

    process.stdout.write('\n');
    console.log(`\n[generate-bundle] ✓ Generated: ${results.length} scenarios\n`);

    // Save all generated scenarios to Firestore before exporting
    console.log(`[generate-bundle] Saving ${results.length} scenarios to Firestore…`);
    let savedCount = 0;
    for (const scenario of results) {
        const result = await storage.saveScenario(scenario);
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
