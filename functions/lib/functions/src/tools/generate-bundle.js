"use strict";
/**
 * Generate scenarios for a single bundle and export to Storage.
 *
 * Run from functions/:
 *   npx tsx src/tools/generate-bundle.ts --bundle diplomacy --count 10
 *   npx tsx src/tools/generate-bundle.ts --bundle diplomacy --count 10 --dry-run
 *
 * Requires: OPENAI_API_KEY env var and serviceAccountKey.json at project root.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
function loadEnvFromFile() {
    const envPaths = ['.env.cli', '.env.local', '.env'].map((fileName) => path.join(__dirname, '..', '..', fileName));
    for (const envPath of envPaths) {
        if (!fs.existsSync(envPath))
            continue;
        const lines = fs.readFileSync(envPath, 'utf8').split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#'))
                continue;
            const eq = trimmed.indexOf('=');
            if (eq < 1)
                continue;
            const key = trimmed.slice(0, eq).trim();
            const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
            if (!(key in process.env))
                process.env[key] = val;
        }
    }
}
loadEnvFromFile();
// ---------------------------------------------------------------------------
// Firebase init
// ---------------------------------------------------------------------------
const serviceAccountPath = path.join(__dirname, '..', '..', '..', 'serviceAccountKey.json');
async function initializeFirebase() {
    const admin = await Promise.resolve().then(() => __importStar(require('firebase-admin')));
    if (!admin.apps.length) {
        if (fs.existsSync(serviceAccountPath)) {
            const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: 'the-administration-3a072',
                storageBucket: 'the-administration-3a072.firebasestorage.app',
            });
        }
        else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            admin.initializeApp({
                projectId: 'the-administration-3a072',
                storageBucket: 'the-administration-3a072.firebasestorage.app',
            });
        }
        else {
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
    var _a;
    const args = process.argv.slice(2);
    const getArg = (flag) => {
        const idx = args.indexOf(flag);
        return idx >= 0 ? args[idx + 1] : undefined;
    };
    const bundle = getArg('--bundle');
    const count = parseInt((_a = getArg('--count')) !== null && _a !== void 0 ? _a : '10', 10);
    const dryRun = args.includes('--dry-run');
    const skipExport = args.includes('--skip-export');
    return { bundle, count, dryRun, skipExport };
}
// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
    const { bundle, count, dryRun, skipExport } = parseArgs();
    const { isValidBundleId } = await Promise.resolve().then(() => __importStar(require('../data/schemas/bundleIds')));
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
        Promise.resolve().then(() => __importStar(require('../scenario-engine'))),
        Promise.resolve().then(() => __importStar(require('../storage'))),
        Promise.resolve().then(() => __importStar(require('../bundle-exporter'))),
    ]);
    console.log(`\n[generate-bundle] Bundle: ${bundle} · Count: ${count}${dryRun ? ' · DRY RUN' : ''}\n`);
    if (dryRun) {
        console.log('[generate-bundle] Dry run — no scenarios will be written.');
        return;
    }
    const genResult = await scenarioEngine.generateScenarios({
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
    const results = genResult.scenarios;
    process.stdout.write('\n');
    console.log(`\n[generate-bundle] ✓ Generated: ${results.length} scenarios (${genResult.tokenSummary.callCount} LLM calls, $${genResult.tokenSummary.costUsd})\n`);
    // Save all generated scenarios to Firestore before exporting
    console.log(`[generate-bundle] Saving ${results.length} scenarios to Firestore…`);
    let savedCount = 0;
    for (const scenario of results) {
        const result = await storage.saveScenario(scenario);
        if (result.saved)
            savedCount++;
        else
            console.warn(`  ⚠ Skipped ${scenario.id}: ${result.reason}`);
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
    var _a;
    console.error('[generate-bundle] Fatal error:', (_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : err);
    process.exit(1);
});
//# sourceMappingURL=generate-bundle.js.map