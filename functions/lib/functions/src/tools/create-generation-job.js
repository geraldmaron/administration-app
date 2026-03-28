"use strict";
/**
 * Scenario Generation Job CLI
 *
 * Creates a Firestore `generation_jobs` document so the
 * `onScenarioJobCreated` cloud function can generate scenarios.
 *
 * Usage (from functions/):
 *
 *   pnpm dlx tsx src/tools/create-generation-job.ts \\
 *     --bundles politics \\
 *     --count 20 \\
 *     --mode manual
 *
 * Examples:
 *   # 20 total scenarios from the 'politics' bundle
 *   pnpm dlx tsx src/tools/create-generation-job.ts --bundles politics --count 20
 *
 *   # 5 scenarios per bundle for economy + military (10 total)
 *   pnpm dlx tsx src/tools/create-generation-job.ts --bundles economy,military --count 5
 *
 * NOTE: `count` is per-bundle. Total scenarios ~= bundles.length * count
 * (each scenario may have multiple acts depending on distributionConfig).
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
const admin = __importStar(require("firebase-admin"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const background_jobs_1 = require("../background-jobs");
const bundleIds_1 = require("../data/schemas/bundleIds");
function parseArgs() {
    var _a, _b, _c, _d, _e, _f;
    const args = process.argv.slice(2);
    const getArg = (flag) => {
        const idx = args.indexOf(flag);
        return idx >= 0 ? args[idx + 1] : undefined;
    };
    const bundlesRaw = (_a = getArg('--bundles')) !== null && _a !== void 0 ? _a : 'standard';
    let bundles;
    if (bundlesRaw === 'all' || bundlesRaw === 'standard') {
        bundles = bundlesRaw;
    }
    else {
        const parts = bundlesRaw.split(',').map((s) => s.trim()).filter(Boolean);
        const valid = [];
        const invalid = [];
        for (const p of parts) {
            if ((0, bundleIds_1.isValidBundleId)(p)) {
                valid.push(p);
            }
            else {
                invalid.push(p);
            }
        }
        if (valid.length === 0) {
            console.error(`No valid bundle IDs in "--bundles ${bundlesRaw}". Valid: ${bundleIds_1.ALL_BUNDLE_IDS.join(', ')}`);
            process.exit(1);
        }
        if (invalid.length > 0) {
            console.warn(`[create-generation-job] Ignoring invalid bundles: ${invalid.join(', ')}`);
        }
        bundles = valid;
    }
    const countRaw = (_b = getArg('--count')) !== null && _b !== void 0 ? _b : '20';
    const count = Math.max(1, parseInt(countRaw, 10) || 20);
    const modeRaw = (_c = getArg('--mode')) !== null && _c !== void 0 ? _c : 'manual';
    const mode = modeRaw === 'news' || modeRaw === 'manual' ? modeRaw : 'manual';
    const description = getArg('--description');
    const requestedBy = (_f = (_e = (_d = getArg('--requestedBy')) !== null && _d !== void 0 ? _d : process.env.USER) !== null && _e !== void 0 ? _e : process.env.LOGNAME) !== null && _f !== void 0 ? _f : 'cli:create-generation-job';
    return { bundles, count, mode, description, requestedBy };
}
function initializeAdmin() {
    if (admin.apps.length) {
        return admin.firestore();
    }
    const serviceAccountPath = path.join(__dirname, '..', '..', '..', 'serviceAccountKey.json');
    if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        console.log(`[create-generation-job] Initializing Firebase Admin with serviceAccountKey.json`);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    }
    else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        console.log(`[create-generation-job] Initializing Firebase Admin from GOOGLE_APPLICATION_CREDENTIALS`);
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
        });
    }
    else {
        console.error('[create-generation-job] No Firebase credentials. Provide serviceAccountKey.json or set GOOGLE_APPLICATION_CREDENTIALS.');
        process.exit(1);
    }
    return admin.firestore();
}
async function main() {
    var _a;
    const args = parseArgs();
    const db = initializeAdmin();
    let bundleSpec;
    if (args.bundles === 'all' || args.bundles === 'standard') {
        bundleSpec = args.bundles;
    }
    else {
        bundleSpec = args.bundles;
    }
    console.log('=== Create Scenario Generation Job ===');
    console.log(`Bundles      : ${bundleSpec === 'all'
        ? 'all'
        : bundleSpec === 'standard'
            ? `standard (${bundleIds_1.STANDARD_BUNDLE_IDS.join(', ')})`
            : bundleSpec.join(', ')}`);
    console.log(`Count/bundle : ${args.count}`);
    console.log(`Mode         : ${args.mode}`);
    const { jobId, bundles, expectedScenarios } = await (0, background_jobs_1.createGenerationJob)(db, {
        bundles: bundleSpec,
        count: args.count,
        mode: args.mode,
        distributionConfig: { mode: 'auto', gameLength: 'medium' },
        requestedBy: args.requestedBy,
        priority: 'high',
        description: (_a = args.description) !== null && _a !== void 0 ? _a : `CLI job: ${args.count} scenarios per bundle`,
    });
    console.log('\nJob created successfully.');
    console.log(`Job ID       : ${jobId}`);
    console.log(`Bundles used : ${bundles.join(', ')}`);
    console.log(`Approx. scenarios (acts) to generate: ${expectedScenarios}`);
    console.log('\nThe Cloud Function `onScenarioJobCreated` will now generate scenarios in the background.');
}
main().catch((err) => {
    console.error('[create-generation-job] FATAL:', err);
    process.exit(1);
});
//# sourceMappingURL=create-generation-job.js.map