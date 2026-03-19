/*
 * Checks a generation job end-to-end with explicit failure handling.
 * Usage: pnpm -s tsx scripts/check-generation-job.ts <jobId>
 */

import admin from 'firebase-admin';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const serviceAccount = require('../serviceAccountKey.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { auditScenario, scoreScenario, initializeAuditConfig } = require('../functions/lib/lib/audit-rules.js');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'the-administration-3a072',
  });
}

const db = admin.firestore();
const readabilityRules = new Set([
  'jargon-use',
  'complex-sentence',
  'high-clause-density',
  'high-passive-voice',
  'label-complexity',
]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function renderBar(done: number, total: number, width = 10): string {
  const filled = total > 0 ? Math.round((done / total) * width) : 0;
  return '▓'.repeat(filled) + '▒'.repeat(width - filled);
}

function extractJobScenarioIds(data: any): string[] {
  return data.createdScenarioIds || data.savedScenarioIds || data.scenarioIds ||
    (Array.isArray(data.results) ? data.results.map((r: any) => r?.id).filter(Boolean) : []);
}

async function main() {
  const jobId = process.argv[2];
  if (!jobId) {
    throw new Error('Missing jobId. Usage: pnpm -s tsx scripts/check-generation-job.ts <jobId>');
  }

  await initializeAuditConfig(db);

  const start = Date.now();
  const timeoutMs = 10 * 60 * 1000;

  let data: any = null;
  while (true) {
    const snap = await db.collection('generation_jobs').doc(jobId).get();
    if (!snap.exists) {
      throw new Error(`generation_jobs/${jobId} not found`);
    }

    data = snap.data() || {};
    const status = String(data.status || 'unknown');
    const ids = extractJobScenarioIds(data);

    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const completed: number = data.completedCount ?? ids.length;
    const failed: number = data.failedCount ?? 0;
    const total: number = data.totalCount ?? data.total ?? data.count ?? 0;
    const pct = total > 0 ? Math.round((100 * (completed + failed)) / total) : 0;
    const bar = renderBar(completed + failed, total);

    if (status === 'pending') {
      process.stdout.write(`  ${time}  … Pending — waiting for Cloud Function trigger\n`);
    } else if (status === 'running') {
      const failStr = failed > 0 ? `, ${failed} failed` : '';
      process.stdout.write(`  ${time}  [${bar}] ${completed + failed}/${total || '?'} (${pct}%) — ${completed} saved${failStr}\n`);
    } else if (status === 'completed') {
      process.stdout.write(`  ${time}  ✓ Completed — ${completed} scenarios generated\n`);
    } else {
      process.stdout.write(`  ${time}  ✗ ${status}: ${data.error || 'unknown error'}\n`);
    }

    if (['completed', 'failed', 'error', 'cancelled'].includes(status)) {
      break;
    }

    if (Date.now() - start > timeoutMs) {
      throw new Error(`Timed out waiting for job ${jobId}`);
    }

    await sleep(10_000);
  }

  const finalStatus = String(data.status || 'unknown');
  const ids: string[] = extractJobScenarioIds(data);
  if (!ids.length) {
    throw new Error(`Job ${jobId} ended with status=${finalStatus} and produced no scenario IDs`);
  }

  if (finalStatus !== 'completed') {
    console.log(`\nProceeding with audit for ${ids.length} scenario(s) saved before job ended with status=${finalStatus}.`);
    if (data.error) {
      console.log(`Job error: ${data.error}`);
    }
  }

  const results: any[] = [];
  const ruleCounts: Record<string, number> = {};

  for (const id of ids) {
    const sSnap = await db.collection('scenarios').doc(id).get();
    if (!sSnap.exists) {
      results.push({ id, missing: true });
      continue;
    }

    const scenario = sSnap.data();
    const bundle = scenario?.metadata?.bundle || 'economy';
    const isNews = scenario?.metadata?.source === 'news';

    const issues = auditScenario(scenario, bundle, isNews);
    const score = scoreScenario(issues);
    const hardErrors = issues.filter((i: any) => i.severity === 'error').length;
    const readabilityIssues = issues.filter((i: any) => readabilityRules.has(i.rule)).length;
    const voiceViolations = issues.filter(
      (i: any) => i.rule === 'outcome-second-person' || i.rule === 'third-person-framing'
    ).length;

    for (const issue of issues) {
      ruleCounts[issue.rule] = (ruleCounts[issue.rule] ?? 0) + 1;
    }

    results.push({
      id,
      bundle,
      score,
      hardErrors,
      readabilityIssues,
      voiceViolations,
      totalIssues: issues.length,
      rules: issues.map((i: any) => `[${i.severity}] ${i.rule}`),
    });
  }

  // Sort worst-scoring scenarios first for easy triage
  results.sort((a, b) => {
    if (a.missing && !b.missing) return 1;
    if (!a.missing && b.missing) return -1;
    return (a.score ?? 0) - (b.score ?? 0);
  });

  const valid = results.filter((r) => !r.missing);
  const avgScore = valid.reduce((sum, r) => sum + r.score, 0) / Math.max(1, valid.length);
  const totalVoiceViolations = valid.reduce((sum, r) => sum + (r.voiceViolations ?? 0), 0);

  // Sort rule breakdown by frequency descending
  const ruleBreakdown = Object.entries(ruleCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([rule, count]) => ({ rule, count }));

  const summary = {
    jobId,
    status: finalStatus,
    generated: ids.length,
    avgScore: Math.round(avgScore * 10) / 10,
    totalHardErrors: valid.reduce((sum, r) => sum + r.hardErrors, 0),
    totalReadabilityIssues: valid.reduce((sum, r) => sum + r.readabilityIssues, 0),
    totalVoiceViolations,
    scenariosBelow70: valid.filter((r) => r.score < 70).length,
    scenariosAbove90: valid.filter((r) => r.score >= 90).length,
  };

  console.log('');
  console.log(`Summary for job ${jobId}`);
  console.log(`  Generated : ${summary.generated}`);
  console.log(`  Avg score : ${summary.avgScore}`);
  console.log(`  Hard errors: ${summary.totalHardErrors}`);
  console.log(`  Below 70  : ${summary.scenariosBelow70}`);
  console.log(`  Above 90  : ${summary.scenariosAbove90}`);
  if (totalVoiceViolations > 0) console.log(`  Voice violations: ${totalVoiceViolations}`);

  if (ruleBreakdown.length > 0) {
    console.log('\nTop audit rule hits:');
    ruleBreakdown.slice(0, 10).forEach(({ rule, count }) =>
      console.log(`  ${count}x  ${rule}`)
    );
  }

  console.log('\nPer-scenario scores:');
  results.forEach((r) => {
    if (r.missing) {
      console.log(`  ${r.id}  MISSING from scenarios collection`);
    } else {
      const flag = r.score < 70 ? ' ⚠' : r.score >= 90 ? ' ✓' : '';
      console.log(`  ${r.id}  score=${r.score}${flag}  errors=${r.hardErrors}  issues=${r.totalIssues}`);
    }
  });
}

main().catch((error) => {
  console.error('FATAL', error?.stack || String(error));
  process.exit(1);
});
