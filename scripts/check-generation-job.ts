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
    const ids =
      data.createdScenarioIds ||
      data.scenarioIds ||
      (Array.isArray(data.results) ? data.results.map((r: any) => r?.id).filter(Boolean) : []);

    console.log(JSON.stringify({ status, idsCount: ids.length, error: data.error || null }));

    if (['completed', 'failed', 'error', 'cancelled'].includes(status)) {
      break;
    }

    if (Date.now() - start > timeoutMs) {
      throw new Error(`Timed out waiting for job ${jobId}`);
    }

    await sleep(10_000);
  }

  const finalStatus = String(data.status || 'unknown');
  if (finalStatus !== 'completed') {
    throw new Error(`Job ${jobId} ended with status=${finalStatus} error=${JSON.stringify(data.error || null)}`);
  }

  const ids: string[] =
    data.createdScenarioIds ||
    data.scenarioIds ||
    (Array.isArray(data.results) ? data.results.map((r: any) => r?.id).filter(Boolean) : []);
  if (!ids.length) {
    throw new Error(`Job ${jobId} completed but produced no scenario IDs`);
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
    generated: ids.length,
    avgScore: Math.round(avgScore * 10) / 10,
    totalHardErrors: valid.reduce((sum, r) => sum + r.hardErrors, 0),
    totalReadabilityIssues: valid.reduce((sum, r) => sum + r.readabilityIssues, 0),
    totalVoiceViolations,
    scenariosBelow70: valid.filter((r) => r.score < 70).length,
    scenariosAbove90: valid.filter((r) => r.score >= 90).length,
  };

  console.log('FINAL_SUMMARY', JSON.stringify(summary, null, 2));
  console.log('RULE_BREAKDOWN', JSON.stringify(ruleBreakdown, null, 2));
  console.log('SCENARIO_AUDIT', JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error('FATAL', error?.stack || String(error));
  process.exit(1);
});
