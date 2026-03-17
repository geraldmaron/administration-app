/**
 * Periodic Quality Review Script
 *
 * Samples scenarios from Firestore, runs structural audit + LLM quality checks,
 * detects quality drift over time, and writes results to admin_quality_reviews/.
 *
 * Run from web/: npx tsx scripts/periodic-quality-review.ts [--sample 50] [--llm-sample 10] [--bundle <name>]
 *
 * Scheduled: run weekly via CI or manually before a release.
 */

import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';
import {
    initializeAuditConfig,
    auditScenario,
    scoreScenario,
} from '../functions/src/lib/audit-rules';
import { evaluateBatchQuality } from '../functions/src/lib/content-quality';

// ---------------------------------------------------------------------------
// Firebase init
// ---------------------------------------------------------------------------

const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');
if (!admin.apps.length) {
    if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        admin.initializeApp({ credential: admin.credential.applicationDefault() });
    } else {
        console.error('No Firebase credentials found.');
        process.exit(1);
    }
}
const db = admin.firestore();

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

function parseArgs() {
    const args = process.argv.slice(2);
    const getArg = (flag: string, def: string): string =>
        (() => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : def; })();
    return {
        sampleSize: parseInt(getArg('--sample', '50'), 10),
        llmSampleSize: parseInt(getArg('--llm-sample', '10'), 10),
        bundle: getArg('--bundle', ''),
        openaiKey: getArg('--openai-key', ''),
        dryRun: args.includes('--dry-run'),
    };
}

// ---------------------------------------------------------------------------
// Sampling
// ---------------------------------------------------------------------------

function shuffled<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

async function sampleScenarios(opts: { sampleSize: number; bundle?: string }) {
    let query: admin.firestore.Query = db.collection('scenarios');
    if (opts.bundle) query = query.where('metadata.bundle', '==', opts.bundle);

    const snap = await query.get();
    const all = snap.docs.map(d => d.data() as any);
    return shuffled(all).slice(0, opts.sampleSize);
}

// ---------------------------------------------------------------------------
// Structural audit summary
// ---------------------------------------------------------------------------

interface ScenarioAuditResult {
    id: string;
    bundle: string;
    score: number;
    errorCount: number;
    warnCount: number;
    topIssues: string[];
}

function auditAll(scenarios: any[]): ScenarioAuditResult[] {
    return scenarios.map(s => {
        const bundle = s.metadata?.bundle ?? 'unknown';
        const issues = auditScenario(s, bundle);
        const score = scoreScenario(issues);
        return {
            id: s.id ?? '(unknown)',
            bundle,
            score,
            errorCount: issues.filter(i => i.severity === 'error').length,
            warnCount: issues.filter(i => i.severity === 'warn').length,
            topIssues: issues.slice(0, 3).map(i => `[${i.rule}] ${i.message}`),
        };
    });
}

// ---------------------------------------------------------------------------
// Quality drift detection
// ---------------------------------------------------------------------------

interface QualityReview {
    reviewId: string;
    timestamp: string;
    sampleSize: number;
    llmSampleSize: number;
    bundle?: string;
    structural: {
        avgScore: number;
        passRate: number; // % >= 70
        errorRate: number; // avg errors per scenario
        warnRate: number;
        failingScenarios: { id: string; score: number; topIssue: string }[];
        ruleFrequency: Record<string, number>;
    };
    contentQuality?: {
        avgOverallScore: number;
        avgGrammar: number;
        avgTone: number;
        avgCoherence: number;
        avgAdvisorQuality: number;
        passRate: number;
        lowQualityScenarios: { id: string; score: number }[];
    };
    drift?: {
        avgScoreDelta: number;
        passRateDelta: number;
        previousReviewId: string;
        previousTimestamp: string;
    };
}

async function loadPreviousReview(bundle?: string): Promise<QualityReview | null> {
    try {
        let q: admin.firestore.Query = db.collection('admin_quality_reviews');
        if (bundle) {
            q = q.where('bundle', '==', bundle);
        }
        const snap = await q.orderBy('timestamp', 'desc').limit(1).get();
        if (snap.empty) return null;
        return snap.docs[0].data() as QualityReview;
    } catch {
        return null;
    }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    const args = parseArgs();
    console.log('📊 Periodic Quality Review\n');
    console.log(`Sample: ${args.sampleSize} structural | ${args.llmSampleSize} LLM`);
    if (args.bundle) console.log(`Bundle filter: ${args.bundle}`);
    if (args.dryRun) console.log('Mode: DRY RUN (no writes)\n');
    console.log('');

    await initializeAuditConfig(db);
    console.log('✅ Audit config loaded\n');

    // 1. Sample scenarios
    const scenarios = await sampleScenarios({ sampleSize: args.sampleSize, bundle: args.bundle || undefined });
    console.log(`Sampled ${scenarios.length} scenarios\n`);

    if (scenarios.length === 0) {
        console.warn('No scenarios found. Exiting.');
        return;
    }

    // 2. Structural audit
    console.log('Running structural audit...');
    const auditResults = auditAll(scenarios);
    const avgScore = auditResults.reduce((s, r) => s + r.score, 0) / auditResults.length;
    const passCount = auditResults.filter(r => r.score >= 70).length;
    const passRate = passCount / auditResults.length;
    const avgErrors = auditResults.reduce((s, r) => s + r.errorCount, 0) / auditResults.length;
    const avgWarns = auditResults.reduce((s, r) => s + r.warnCount, 0) / auditResults.length;

    // Rule frequency analysis
    const ruleFrequency: Record<string, number> = {};
    for (const s of scenarios) {
        const bundle = s.metadata?.bundle ?? 'unknown';
        for (const issue of auditScenario(s, bundle)) {
            ruleFrequency[issue.rule] = (ruleFrequency[issue.rule] ?? 0) + 1;
        }
    }

    const failingScenarios = auditResults
        .filter(r => r.score < 70)
        .sort((a, b) => a.score - b.score)
        .slice(0, 10)
        .map(r => ({ id: r.id, score: r.score, topIssue: r.topIssues[0] ?? 'unknown' }));

    console.log(`  Avg score: ${avgScore.toFixed(1)}/100  Pass rate: ${(passRate * 100).toFixed(1)}%  Avg errors: ${avgErrors.toFixed(1)}`);

    // 3. LLM quality check on a subsample
    const llmSample = shuffled(scenarios).slice(0, args.llmSampleSize);
    let contentQuality: QualityReview['contentQuality'] | undefined;

    const openaiKeySource = args.openaiKey
        ? 'CLI'
        : process.env.OPENAI_API_KEY
        ? 'OPENAI_API_KEY'
        : process.env.OPENAI_KEY
        ? 'OPENAI_KEY'
        : 'none';
    const openaiKey = args.openaiKey || process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || '';
    console.log(`OpenAI key source: ${openaiKeySource}`);

    if (!openaiKey) {
        console.log('\nSkipping LLM quality check: no OpenAI API key provided.');
    } else if (args.llmSampleSize > 0 && llmSample.length > 0) {
        process.env.OPENAI_API_KEY = openaiKey;
        console.log(`\nRunning LLM quality check on ${llmSample.length} scenarios...`);
        try {
            const qualityReports = await evaluateBatchQuality(llmSample, 3);
            const n = qualityReports.length;
            const qAvg = (fn: (r: typeof qualityReports[0]) => number) =>
                qualityReports.reduce((s, r) => s + fn(r), 0) / n;

            contentQuality = {
                avgOverallScore: qAvg(r => r.result.overallScore),
                avgGrammar: qAvg(r => r.result.grammar.score),
                avgTone: qAvg(r => r.result.tone.score),
                avgCoherence: qAvg(r => r.result.coherence.score),
                avgAdvisorQuality: qAvg(r => r.result.advisorQuality.score),
                passRate: qualityReports.filter(r => r.result.pass).length / n,
                lowQualityScenarios: qualityReports
                    .filter(r => !r.result.pass || r.result.overallScore < 3.5)
                    .sort((a, b) => a.result.overallScore - b.result.overallScore)
                    .slice(0, 5)
                    .map(r => ({ id: r.scenarioId, score: r.result.overallScore })),
            };
            console.log(`  Avg quality: ${contentQuality.avgOverallScore.toFixed(2)}/5  Pass rate: ${(contentQuality.passRate * 100).toFixed(1)}%`);
        } catch (err: any) {
            console.warn(`  ⚠️ LLM quality check failed: ${err.message}`);
        }
    }

    // 4. Drift detection
    const previous = await loadPreviousReview(args.bundle || undefined);
    let drift: QualityReview['drift'] | undefined;
    if (previous?.structural) {
        drift = {
            avgScoreDelta: avgScore - previous.structural.avgScore,
            passRateDelta: passRate - previous.structural.passRate,
            previousReviewId: previous.reviewId,
            previousTimestamp: previous.timestamp,
        };
        const trend = drift.avgScoreDelta >= 0 ? '↑' : '↓';
        console.log(`\nDrift vs last review (${previous.timestamp.slice(0, 10)}): score ${trend}${Math.abs(drift.avgScoreDelta).toFixed(1)}  pass rate ${drift.passRateDelta >= 0 ? '+' : ''}${(drift.passRateDelta * 100).toFixed(1)}%`);
    }

    // 5. Assemble review
    const reviewId = `review_${Date.now()}`;
    const review: QualityReview = {
        reviewId,
        timestamp: new Date().toISOString(),
        sampleSize: scenarios.length,
        llmSampleSize: llmSample.length,
        ...(args.bundle ? { bundle: args.bundle } : {}),
        structural: {
            avgScore,
            passRate,
            errorRate: avgErrors,
            warnRate: avgWarns,
            failingScenarios,
            ruleFrequency,
        },
        ...(contentQuality ? { contentQuality } : {}),
        ...(drift ? { drift } : {}),
    };

    // 6. Write to Firestore
    if (!args.dryRun) {
        await db.collection('admin_quality_reviews').doc(reviewId).set(review);
        console.log(`\n✅ Review written to admin_quality_reviews/${reviewId}`);
    }

    // 7. Save local report
    const reportPath = path.join(__dirname, '..', 'docs', 'quality-review-latest.json');
    fs.writeFileSync(reportPath, JSON.stringify(review, null, 2));
    console.log(`Report saved to: ${reportPath}`);

    // 8. Exit non-zero if quality is critically degraded
    if (passRate < 0.6) {
        console.error(`\n❌ CRITICAL: Structural pass rate ${(passRate * 100).toFixed(1)}% is below 60% threshold`);
        process.exit(1);
    }
    if (contentQuality && contentQuality.avgOverallScore < 2.5) {
        console.error(`\n❌ CRITICAL: LLM quality score ${contentQuality.avgOverallScore.toFixed(2)} is below 2.5 threshold`);
        process.exit(1);
    }
    console.log('\n✅ Quality review complete.');
}

main().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
});
