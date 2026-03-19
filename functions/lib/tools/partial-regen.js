"use strict";
/**
 * Partial Regeneration Tool
 *
 * Regenerates specific fields of existing scenarios where structural data is
 * valid but content quality is low. Targets advisor feedback, outcome context,
 * and outcome summaries without rebuilding the full scenario.
 *
 * Run from functions/:
 *   npx tsx src/tools/partial-regen.ts [--scenario <id>] [--bundle <name>] [--dry-run] [--fields advisorFeedback,outcomeContext]
 *
 * Requires: OPENAI_API_KEY env var and Firebase Admin credentials.
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
const audit_rules_1 = require("../lib/audit-rules");
const prompt_builder_1 = require("../lib/prompt-builder");
const content_quality_1 = require("../lib/content-quality");
const model_providers_1 = require("../lib/model-providers");
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
if (!admin.apps.length) {
    if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        admin.initializeApp({ credential: admin.credential.applicationDefault() });
    }
    else {
        console.error('No Firebase credentials. Provide serviceAccountKey.json or GOOGLE_APPLICATION_CREDENTIALS.');
        process.exit(1);
    }
}
const db = admin.firestore();
function parseArgs() {
    var _a, _b;
    const args = process.argv.slice(2);
    const getArg = (flag) => {
        const idx = args.indexOf(flag);
        return idx >= 0 ? args[idx + 1] : undefined;
    };
    const hasFlag = (flag) => args.includes(flag);
    return {
        scenarioId: getArg('--scenario'),
        bundle: getArg('--bundle'),
        dryRun: hasFlag('--dry-run'),
        fields: (_a = getArg('--fields')) === null || _a === void 0 ? void 0 : _a.split(','),
        skipQualityCheck: hasFlag('--skip-quality-check'),
        minScore: parseInt((_b = getArg('--min-score')) !== null && _b !== void 0 ? _b : '70', 10),
    };
}
// ---------------------------------------------------------------------------
// Field regeneration
// ---------------------------------------------------------------------------
async function regenerateField(scenario, field) {
    var _a, _b, _c, _d, _e, _f;
    const fixes = [];
    let changed = false;
    for (const opt of scenario.options) {
        if (field === 'advisorFeedback') {
            const prompt = (0, prompt_builder_1.buildAdvisorFeedbackPartialRegenPrompt)(scenario, opt);
            const result = await (0, model_providers_1.callModelProvider)({ maxTokens: 2048, temperature: 0.6 }, prompt, { type: 'object', properties: { advisorFeedback: { type: 'array', items: { type: 'object' } } } }, 'gpt-4o-mini');
            if (result.data) {
                // Handle various JSON wrapper formats the model may return
                const raw = result.data;
                let newFeedback;
                if (Array.isArray(raw)) {
                    newFeedback = raw;
                }
                else if (Array.isArray(raw === null || raw === void 0 ? void 0 : raw.advisorFeedback)) {
                    newFeedback = raw.advisorFeedback;
                }
                else if (Array.isArray(raw === null || raw === void 0 ? void 0 : raw.data)) {
                    newFeedback = raw.data;
                }
                else {
                    // Last resort: find first array value
                    const firstArray = Object.values(raw).find((v) => Array.isArray(v));
                    if (firstArray)
                        newFeedback = firstArray;
                }
                if (Array.isArray(newFeedback) && newFeedback.length > 0) {
                    opt.advisorFeedback = newFeedback;
                    fixes.push(`${opt.id}: regenerated advisorFeedback (${newFeedback.length} entries)`);
                    changed = true;
                }
            }
        }
        else if (field === 'outcomeContext') {
            const prompt = (0, prompt_builder_1.buildOutcomeContextPartialRegenPrompt)(scenario, opt);
            const result = await (0, model_providers_1.callModelProvider)({ maxTokens: 1024, temperature: 0.7 }, prompt, { type: 'object', properties: { outcomeContext: { type: 'string' } } }, 'gpt-4o-mini');
            if ((_b = (_a = result.data) === null || _a === void 0 ? void 0 : _a.outcomeContext) === null || _b === void 0 ? void 0 : _b.trim()) {
                opt.outcomeContext = result.data.outcomeContext;
                fixes.push(`${opt.id}: regenerated outcomeContext`);
                changed = true;
            }
        }
        else if (field === 'outcomeSummary') {
            const prompt = (0, prompt_builder_1.buildOutcomeSummaryPartialRegenPrompt)(scenario, opt);
            const result = await (0, model_providers_1.callModelProvider)({ maxTokens: 512, temperature: 0.7 }, prompt, { type: 'object', properties: { outcomeSummary: { type: 'string' } } }, 'gpt-4o-mini');
            if ((_d = (_c = result.data) === null || _c === void 0 ? void 0 : _c.outcomeSummary) === null || _d === void 0 ? void 0 : _d.trim()) {
                opt.outcomeSummary = result.data.outcomeSummary;
                fixes.push(`${opt.id}: regenerated outcomeSummary`);
                changed = true;
            }
        }
        else if (field === 'outcomeHeadline') {
            const prompt = (0, prompt_builder_1.buildOutcomeHeadlinePartialRegenPrompt)(scenario, opt);
            const result = await (0, model_providers_1.callModelProvider)({ maxTokens: 256, temperature: 0.7 }, prompt, { type: 'object', properties: { outcomeHeadline: { type: 'string' } } }, 'gpt-4o-mini');
            if ((_f = (_e = result.data) === null || _e === void 0 ? void 0 : _e.outcomeHeadline) === null || _f === void 0 ? void 0 : _f.trim()) {
                opt.outcomeHeadline = result.data.outcomeHeadline;
                fixes.push(`${opt.id}: regenerated outcomeHeadline`);
                changed = true;
            }
        }
    }
    return { changed, fixes };
}
async function processScenario(scenario, opts) {
    const { fields, skipQualityCheck, dryRun, bundle } = opts;
    const report = {
        scenarioId: scenario.id,
        bundle,
        preScore: 0,
        postScore: 0,
        qualityBefore: null,
        fieldsRegenerated: [],
        written: false,
    };
    // Initial structural score
    const preIssues = (0, audit_rules_1.auditScenario)(scenario, bundle);
    report.preScore = (0, audit_rules_1.scoreScenario)(preIssues);
    // Determine which fields need regeneration
    let fieldsToRegen = fields !== null && fields !== void 0 ? fields : [];
    if (fieldsToRegen.length === 0 && !skipQualityCheck) {
        const quality = await (0, content_quality_1.evaluateContentQuality)(scenario);
        report.qualityBefore = quality;
        if (quality.pass && quality.overallScore >= 3.5) {
            console.log(`  ✓ ${scenario.id}: quality OK (${quality.overallScore.toFixed(1)}) — skipping`);
            report.postScore = report.preScore;
            return report;
        }
        const VALID_PARTIAL_FIELDS = new Set(['advisorFeedback', 'outcomeContext', 'outcomeSummary', 'outcomeHeadline']);
        fieldsToRegen = quality.regenerateFields
            .filter((f) => VALID_PARTIAL_FIELDS.has(f));
        if (fieldsToRegen.length === 0 && !quality.pass) {
            fieldsToRegen = ['advisorFeedback', 'outcomeContext'];
        }
    }
    if (fieldsToRegen.length === 0) {
        console.log(`  ✓ ${scenario.id}: no fields to regenerate`);
        report.postScore = report.preScore;
        return report;
    }
    // Regenerate each field
    for (const field of fieldsToRegen) {
        try {
            const { changed, fixes } = await regenerateField(scenario, field);
            if (changed)
                report.fieldsRegenerated.push(...fixes);
        }
        catch (err) {
            console.error(`  ❌ ${scenario.id}/${field}: ${err.message}`);
            report.error = err.message;
        }
    }
    // Apply deterministic fixes then re-audit
    (0, audit_rules_1.deterministicFix)(scenario);
    (0, audit_rules_1.heuristicFix)(scenario, (0, audit_rules_1.auditScenario)(scenario, bundle));
    const postIssues = (0, audit_rules_1.auditScenario)(scenario, bundle);
    report.postScore = (0, audit_rules_1.scoreScenario)(postIssues);
    // When fields are explicitly specified, save if there's any improvement (or same) — no hard 70 gate.
    // When auto-selected by quality check, require >= 70.
    const scoreThreshold = opts.fields && opts.fields.length > 0 ? Math.max(report.preScore - 4, 50) : 70;
    if (!dryRun && report.fieldsRegenerated.length > 0 && report.postScore >= scoreThreshold) {
        try {
            await db.collection('scenarios').doc(scenario.id).update({
                options: scenario.options,
                'metadata.auditMetadata': {
                    lastAudited: new Date().toISOString(),
                    score: report.postScore,
                    issues: postIssues.map(i => `[${i.severity}] ${i.rule}: ${i.message}`),
                    partialRegenAt: new Date().toISOString(),
                    regenFields: fieldsToRegen,
                },
            });
            report.written = true;
        }
        catch (err) {
            report.error = `Write failed: ${err.message}`;
        }
    }
    return report;
}
async function main() {
    var _a, _b, _c, _d, _e, _f, _g;
    const args = parseArgs();
    console.log('🔧 Partial Regeneration Tool\n');
    console.log(`Mode: ${args.dryRun ? 'DRY RUN (no writes)' : 'LIVE'}`);
    if (args.fields)
        console.log(`Fields: ${args.fields.join(', ')}`);
    console.log('');
    await (0, audit_rules_1.initializeAuditConfig)(db);
    // Load target scenarios
    let scenarios = [];
    if (args.scenarioId) {
        const doc = await db.collection('scenarios').doc(args.scenarioId).get();
        if (!doc.exists) {
            console.error(`Scenario ${args.scenarioId} not found`);
            process.exit(1);
        }
        const data = doc.data();
        scenarios = [Object.assign(Object.assign({}, data), { _bundle: (_b = (_a = data.metadata) === null || _a === void 0 ? void 0 : _a.bundle) !== null && _b !== void 0 ? _b : 'unknown' })];
    }
    else if (args.bundle) {
        const snap = await db.collection('scenarios').where('metadata.bundle', '==', args.bundle).get();
        scenarios = snap.docs.map(d => {
            const data = d.data();
            return Object.assign(Object.assign({}, data), { _bundle: args.bundle });
        });
        console.log(`Found ${scenarios.length} scenarios in bundle "${args.bundle}"\n`);
    }
    else {
        // All scenarios scoring below minScore
        const snap = await db.collection('scenarios').get();
        for (const doc of snap.docs) {
            const data = doc.data();
            const score = (_e = (_d = (_c = data.metadata) === null || _c === void 0 ? void 0 : _c.auditMetadata) === null || _d === void 0 ? void 0 : _d.score) !== null && _e !== void 0 ? _e : 100;
            if (score < args.minScore) {
                scenarios.push(Object.assign(Object.assign({}, data), { _bundle: (_g = (_f = data.metadata) === null || _f === void 0 ? void 0 : _f.bundle) !== null && _g !== void 0 ? _g : 'unknown' }));
            }
        }
        console.log(`Found ${scenarios.length} scenarios with audit score < ${args.minScore}\n`);
    }
    const reports = [];
    for (const s of scenarios) {
        console.log(`Processing: ${s.id} (bundle: ${s._bundle})`);
        const report = await processScenario(s, {
            fields: args.fields,
            skipQualityCheck: args.skipQualityCheck,
            dryRun: args.dryRun,
            bundle: s._bundle,
        });
        reports.push(report);
        const arrow = report.postScore > report.preScore ? '↑' : report.postScore < report.preScore ? '↓' : '→';
        console.log(`  Score: ${report.preScore} ${arrow} ${report.postScore}  Fields: ${report.fieldsRegenerated.length > 0 ? report.fieldsRegenerated.slice(0, 3).join(', ') : 'none'}  Written: ${report.written}`);
    }
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    const improved = reports.filter(r => r.postScore > r.preScore).length;
    const written = reports.filter(r => r.written).length;
    console.log(`Total processed : ${reports.length}`);
    console.log(`Improved        : ${improved}`);
    console.log(`Written to DB   : ${written}`);
    // Save report
    const reportPath = path.join(__dirname, '..', '..', '..', 'docs', 'partial-regen-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({ runAt: new Date().toISOString(), dryRun: args.dryRun, reports }, null, 2));
    console.log(`\nReport saved to: ${reportPath}`);
}
main().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
});
//# sourceMappingURL=partial-regen.js.map