/*
 * Audits all existing scenarios in Firestore and reports which need updates.
 * Usage: pnpm -s tsx scripts/audit-existing-scenarios.ts
 */

import admin from 'firebase-admin';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const serviceAccount = require('../serviceAccountKey.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { initializeAuditConfig, auditScenario, scoreScenario } = require('../functions/lib/lib/audit-rules.js');

type ScenarioSummary = {
  id: string;
  bundle: string;
  score: number;
  hardErrors: number;
  warnings: number;
  topIssues: string[];
  needsUpdate: boolean;
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'the-administration-3a072',
  });
}

const db = admin.firestore();

async function main() {
  await initializeAuditConfig(db);

  const snap = await db.collection('scenarios').get();
  const summaries: ScenarioSummary[] = [];
  const ruleFrequency: Record<string, number> = {};
  const byBundle: Record<string, { count: number; avgScore: number; hardErrors: number; warnings: number; needsUpdate: number }> = {};

  for (const doc of snap.docs) {
    const scenario = doc.data() || {};
    const id = doc.id;
    const bundle = scenario?.metadata?.bundle || 'unknown';
    const isNews = scenario?.metadata?.source === 'news';

    const issues = auditScenario(scenario, bundle, isNews);
    const score = scoreScenario(issues);
    const hardErrors = issues.filter((i: any) => i.severity === 'error').length;
    const warnings = issues.filter((i: any) => i.severity === 'warn').length;
    const needsUpdate = hardErrors > 0 || score < 95;

    for (const issue of issues) {
      ruleFrequency[issue.rule] = (ruleFrequency[issue.rule] || 0) + 1;
    }

    if (!byBundle[bundle]) {
      byBundle[bundle] = { count: 0, avgScore: 0, hardErrors: 0, warnings: 0, needsUpdate: 0 };
    }

    byBundle[bundle].count += 1;
    byBundle[bundle].avgScore += score;
    byBundle[bundle].hardErrors += hardErrors;
    byBundle[bundle].warnings += warnings;
    if (needsUpdate) byBundle[bundle].needsUpdate += 1;

    summaries.push({
      id,
      bundle,
      score,
      hardErrors,
      warnings,
      topIssues: issues.slice(0, 3).map((i: any) => `[${i.rule}] ${i.message}`),
      needsUpdate,
    });
  }

  for (const key of Object.keys(byBundle)) {
    byBundle[key].avgScore = byBundle[key].avgScore / Math.max(1, byBundle[key].count);
  }

  const needsUpdate = summaries.filter((s) => s.needsUpdate);
  const hardFailures = summaries.filter((s) => s.hardErrors > 0);
  const scoreBelow70 = summaries.filter((s) => s.score < 70);
  const scoreBelow95 = summaries.filter((s) => s.score < 95);

  const topNeeds = [...needsUpdate].sort((a, b) => a.score - b.score).slice(0, 50);
  const topRules = Object.entries(ruleFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([rule, count]) => ({ rule, count }));

  console.log('SUMMARY', JSON.stringify({
    totalScenarios: summaries.length,
    needsUpdateCount: needsUpdate.length,
    hardErrorCount: hardFailures.length,
    scoreBelow70: scoreBelow70.length,
    scoreBelow95: scoreBelow95.length,
    passRate95: (summaries.length - needsUpdate.length) / Math.max(1, summaries.length),
  }, null, 2));

  console.log('TOP_RULES', JSON.stringify(topRules, null, 2));
  console.log('BUNDLE', JSON.stringify(byBundle, null, 2));
  console.log('NEEDS_UPDATE', JSON.stringify(topNeeds, null, 2));
}

main().catch((error) => {
  console.error('FATAL', error?.stack || String(error));
  process.exit(1);
});
