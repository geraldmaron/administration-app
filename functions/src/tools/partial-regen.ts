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

import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';
import {
    initializeAuditConfig,
    auditScenario,
    scoreScenario,
    deterministicFix,
    heuristicFix,
    type BundleScenario,
} from '../lib/audit-rules';
import {
    buildAdvisorFeedbackPartialRegenPrompt,
    buildOutcomeContextPartialRegenPrompt,
    buildOutcomeSummaryPartialRegenPrompt,
    buildOutcomeHeadlinePartialRegenPrompt,
} from '../lib/prompt-builder';
import { evaluateContentQuality, type ContentQualityResult } from '../lib/content-quality';
import { callModelProvider } from '../lib/model-providers';

// ---------------------------------------------------------------------------
// Firebase init
// ---------------------------------------------------------------------------

const serviceAccountPath = path.join(__dirname, '..', '..', '..', 'serviceAccountKey.json');
if (!admin.apps.length) {
    if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        admin.initializeApp({ credential: admin.credential.applicationDefault() });
    } else {
        console.error('No Firebase credentials. Provide serviceAccountKey.json or GOOGLE_APPLICATION_CREDENTIALS.');
        process.exit(1);
    }
}
const db = admin.firestore();

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

type RegenerableField = 'advisorFeedback' | 'outcomeContext' | 'outcomeSummary' | 'outcomeHeadline';

function parseArgs() {
    const args = process.argv.slice(2);
    const getArg = (flag: string): string | undefined => {
        const idx = args.indexOf(flag);
        return idx >= 0 ? args[idx + 1] : undefined;
    };
    const hasFlag = (flag: string) => args.includes(flag);

    return {
        scenarioId: getArg('--scenario'),
        bundle: getArg('--bundle'),
        dryRun: hasFlag('--dry-run'),
        fields: getArg('--fields')?.split(',') as RegenerableField[] | undefined,
        skipQualityCheck: hasFlag('--skip-quality-check'),
        minScore: parseInt(getArg('--min-score') ?? '70', 10),
    };
}

// ---------------------------------------------------------------------------
// Field regeneration
// ---------------------------------------------------------------------------

async function regenerateField(
    scenario: BundleScenario,
    field: RegenerableField
): Promise<{ changed: boolean; fixes: string[] }> {
    const fixes: string[] = [];
    let changed = false;

    for (const opt of scenario.options) {
        if (field === 'advisorFeedback') {
            const prompt = buildAdvisorFeedbackPartialRegenPrompt(scenario, opt);
            const result = await callModelProvider<{ advisorFeedback: any[] }>(

                { maxTokens: 2048, temperature: 0.6 },
                prompt,
                { type: 'object', properties: { advisorFeedback: { type: 'array', items: { type: 'object' } } } },
                'gpt-4o-mini'
            );
            if (result.data) {
                // Handle various JSON wrapper formats the model may return
                const raw = result.data as any;
                let newFeedback: any[] | undefined;
                if (Array.isArray(raw)) {
                    newFeedback = raw;
                } else if (Array.isArray(raw?.advisorFeedback)) {
                    newFeedback = raw.advisorFeedback;
                } else if (Array.isArray(raw?.data)) {
                    newFeedback = raw.data;
                } else {
                    // Last resort: find first array value
                    const firstArray = Object.values(raw).find((v) => Array.isArray(v));
                    if (firstArray) newFeedback = firstArray as any[];
                }
                if (Array.isArray(newFeedback) && newFeedback.length > 0) {
                    opt.advisorFeedback = newFeedback;
                    fixes.push(`${opt.id}: regenerated advisorFeedback (${newFeedback.length} entries)`);
                    changed = true;
                }
            }
        } else if (field === 'outcomeContext') {
            const prompt = buildOutcomeContextPartialRegenPrompt(scenario, opt);
            const result = await callModelProvider<{ outcomeContext: string }>(

                { maxTokens: 1024, temperature: 0.7 },
                prompt,
                { type: 'object', properties: { outcomeContext: { type: 'string' } } },
                'gpt-4o-mini'
            );
            if (result.data?.outcomeContext?.trim()) {
                opt.outcomeContext = result.data.outcomeContext;
                fixes.push(`${opt.id}: regenerated outcomeContext`);
                changed = true;
            }
        } else if (field === 'outcomeSummary') {
            const prompt = buildOutcomeSummaryPartialRegenPrompt(scenario, opt);
            const result = await callModelProvider<{ outcomeSummary: string }>(

                { maxTokens: 512, temperature: 0.7 },
                prompt,
                { type: 'object', properties: { outcomeSummary: { type: 'string' } } },
                'gpt-4o-mini'
            );
            if (result.data?.outcomeSummary?.trim()) {
                opt.outcomeSummary = result.data.outcomeSummary;
                fixes.push(`${opt.id}: regenerated outcomeSummary`);
                changed = true;
            }
        } else if (field === 'outcomeHeadline') {
            const prompt = buildOutcomeHeadlinePartialRegenPrompt(scenario, opt);
            const result = await callModelProvider<{ outcomeHeadline: string }>(
                { maxTokens: 256, temperature: 0.7 },
                prompt,
                { type: 'object', properties: { outcomeHeadline: { type: 'string' } } },
                'gpt-4o-mini'
            );
            if (result.data?.outcomeHeadline?.trim()) {
                opt.outcomeHeadline = result.data.outcomeHeadline;
                fixes.push(`${opt.id}: regenerated outcomeHeadline`);
                changed = true;
            }
        }
    }

    return { changed, fixes };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

interface RegenReport {
    scenarioId: string;
    bundle: string;
    preScore: number;
    postScore: number;
    qualityBefore: Partial<ContentQualityResult> | null;
    fieldsRegenerated: string[];
    written: boolean;
    error?: string;
}

async function processScenario(
    scenario: BundleScenario,
    opts: {
        fields?: RegenerableField[];
        skipQualityCheck: boolean;
        dryRun: boolean;
        bundle: string;
    }
): Promise<RegenReport> {
    const { fields, skipQualityCheck, dryRun, bundle } = opts;
    const report: RegenReport = {
        scenarioId: scenario.id,
        bundle,
        preScore: 0,
        postScore: 0,
        qualityBefore: null,
        fieldsRegenerated: [],
        written: false,
    };

    // Initial structural score
    const preIssues = auditScenario(scenario, bundle);
    report.preScore = scoreScenario(preIssues);

    // Determine which fields need regeneration
    let fieldsToRegen: RegenerableField[] = fields ?? [];
    if (fieldsToRegen.length === 0 && !skipQualityCheck) {
        const quality = await evaluateContentQuality(scenario);
        report.qualityBefore = quality;
        if (quality.pass && quality.overallScore >= 3.5) {
            console.log(`  ✓ ${scenario.id}: quality OK (${quality.overallScore.toFixed(1)}) — skipping`);
            report.postScore = report.preScore;
            return report;
        }
        const VALID_PARTIAL_FIELDS = new Set<RegenerableField>(['advisorFeedback', 'outcomeContext', 'outcomeSummary', 'outcomeHeadline']);
        fieldsToRegen = (quality.regenerateFields as string[])
            .filter((f): f is RegenerableField => VALID_PARTIAL_FIELDS.has(f as RegenerableField));
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
            if (changed) report.fieldsRegenerated.push(...fixes);
        } catch (err: any) {
            console.error(`  ❌ ${scenario.id}/${field}: ${err.message}`);
            report.error = err.message;
        }
    }

    // Apply deterministic fixes then re-audit
    deterministicFix(scenario);
    heuristicFix(scenario, auditScenario(scenario, bundle));
    const postIssues = auditScenario(scenario, bundle);
    report.postScore = scoreScenario(postIssues);

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
        } catch (err: any) {
            report.error = `Write failed: ${err.message}`;
        }
    }

    return report;
}

async function main() {
    const args = parseArgs();
    console.log('🔧 Partial Regeneration Tool\n');
    console.log(`Mode: ${args.dryRun ? 'DRY RUN (no writes)' : 'LIVE'}`);
    if (args.fields) console.log(`Fields: ${args.fields.join(', ')}`);
    console.log('');

    await initializeAuditConfig(db);

    // Load target scenarios
    let scenarios: (BundleScenario & { _bundle: string })[] = [];

    if (args.scenarioId) {
        const doc = await db.collection('scenarios').doc(args.scenarioId).get();
        if (!doc.exists) { console.error(`Scenario ${args.scenarioId} not found`); process.exit(1); }
        const data = doc.data() as BundleScenario;
        scenarios = [{ ...data, _bundle: data.metadata?.bundle ?? 'unknown' }];
    } else if (args.bundle) {
        const snap = await db.collection('scenarios').where('metadata.bundle', '==', args.bundle).get();
        scenarios = snap.docs.map(d => {
            const data = d.data() as BundleScenario;
            return { ...data, _bundle: args.bundle! };
        });
        console.log(`Found ${scenarios.length} scenarios in bundle "${args.bundle}"\n`);
    } else {
        // All scenarios scoring below minScore
        const snap = await db.collection('scenarios').get();
        for (const doc of snap.docs) {
            const data = doc.data() as BundleScenario;
            const score = data.metadata?.auditMetadata?.score ?? 100;
            if (score < args.minScore) {
                scenarios.push({ ...data, _bundle: data.metadata?.bundle ?? 'unknown' });
            }
        }
        console.log(`Found ${scenarios.length} scenarios with audit score < ${args.minScore}\n`);
    }

    const reports: RegenReport[] = [];
    for (const s of scenarios) {
        console.log(`Processing: ${s.id} (bundle: ${s._bundle})`);
        const report = await processScenario(s as BundleScenario, {
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
