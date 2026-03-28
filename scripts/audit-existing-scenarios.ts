/*
 * Audits Firestore scenarios and reports grammar/completeness defects, bundle hot spots,
 * and remediation buckets for operational cleanup.
 * Usage: npx tsx scripts/audit-existing-scenarios.ts [--all] [--bundle <name>] [--json]
 */

import admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import { initializeAuditConfig, auditScenario, scoreScenario } from '../functions/src/lib/audit-rules';
import { classifyIssueRemediation } from '../functions/src/lib/issue-classification';

const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

type ScenarioSummary = {
  id: string;
  bundle: string;
  score: number;
  hardErrors: number;
  warnings: number;
  topIssues: string[];
  needsUpdate: boolean;
  remediationBucket: string;
  autoFixableCount: number;
  heuristicFixableCount: number;
  blockingCount: number;
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'the-administration-3a072',
  });
}

const db = admin.firestore();

function parseArgs() {
  const args = process.argv.slice(2);
  const getArg = (flag: string): string | undefined => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] : undefined;
  };

  return {
    includeInactive: args.includes('--all'),
    bundle: getArg('--bundle'),
    asJson: args.includes('--json'),
  };
}

async function main() {
  const args = parseArgs();
  await initializeAuditConfig(db);

  let query: FirebaseFirestore.Query = db.collection('scenarios');
  if (!args.includeInactive) {
    query = query.where('is_active', '==', true);
  }
  if (args.bundle) {
    query = query.where('metadata.bundle', '==', args.bundle);
  }

  const snap = await query.get();
  const summaries: ScenarioSummary[] = [];
  const ruleFrequency: Record<string, number> = {};
  const byBundle: Record<string, { count: number; avgScore: number; hardErrors: number; warnings: number; needsUpdate: number; remediation: Record<string, number> }> = {};
  const bySeverity: Record<string, number> = { error: 0, warn: 0 };
  const grammarAndCompletenessRules = new Set([
    'double-space',
    'orphaned-punctuation',
    'repeated-word',
    'dangling-ending',
    'headline-fragment',
    'missing-direct-object',
    'description-word-count',
    'option-text-word-count',
    'short-summary',
    'title-too-short',
    'lowercase-start',
  ]);
  const grammarFrequency: Record<string, number> = {};

  for (const doc of snap.docs) {
    const scenario = doc.data() || {};
    const id = doc.id;
    const bundle = scenario?.metadata?.bundle || 'unknown';
    const isNews = scenario?.metadata?.source === 'news';

    const issues = auditScenario(scenario, bundle, isNews);
    const score = scoreScenario(issues);
    const remediation = classifyIssueRemediation(issues);
    const hardErrors = issues.filter((i: any) => i.severity === 'error').length;
    const warnings = issues.filter((i: any) => i.severity === 'warn').length;
    const needsUpdate = hardErrors > 0 || score < 95;

    for (const issue of issues) {
      ruleFrequency[issue.rule] = (ruleFrequency[issue.rule] || 0) + 1;
      bySeverity[issue.severity] = (bySeverity[issue.severity] || 0) + 1;
      if (grammarAndCompletenessRules.has(issue.rule)) {
        grammarFrequency[issue.rule] = (grammarFrequency[issue.rule] || 0) + 1;
      }
    }

    if (!byBundle[bundle]) {
      byBundle[bundle] = { count: 0, avgScore: 0, hardErrors: 0, warnings: 0, needsUpdate: 0, remediation: {} };
    }

    byBundle[bundle].count += 1;
    byBundle[bundle].avgScore += score;
    byBundle[bundle].hardErrors += hardErrors;
    byBundle[bundle].warnings += warnings;
    if (needsUpdate) byBundle[bundle].needsUpdate += 1;
    byBundle[bundle].remediation[remediation.bucket] = (byBundle[bundle].remediation[remediation.bucket] || 0) + 1;

    summaries.push({
      id,
      bundle,
      score,
      hardErrors,
      warnings,
      topIssues: issues.slice(0, 3).map((i: any) => `[${i.rule}] ${i.message}`),
      needsUpdate,
      remediationBucket: remediation.bucket,
      autoFixableCount: remediation.autoFixableCount,
      heuristicFixableCount: remediation.heuristicFixableCount,
      blockingCount: remediation.blockingCount,
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
  const topGrammarRules = Object.entries(grammarFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([rule, count]) => ({ rule, count }));
  const remediationBuckets = summaries.reduce<Record<string, number>>((acc, summary) => {
    acc[summary.remediationBucket] = (acc[summary.remediationBucket] || 0) + 1;
    return acc;
  }, {});

  const report = {
    scope: {
      activeOnly: !args.includeInactive,
      bundle: args.bundle ?? null,
    },
    summary: {
      totalScenarios: summaries.length,
      needsUpdateCount: needsUpdate.length,
      hardErrorCount: hardFailures.length,
      scoreBelow70: scoreBelow70.length,
      scoreBelow95: scoreBelow95.length,
      passRate95: (summaries.length - needsUpdate.length) / Math.max(1, summaries.length),
      issueSeverity: bySeverity,
      remediationBuckets,
    },
    topRules,
    topGrammarRules,
    byBundle,
    needsUpdate: topNeeds,
  };

  if (args.asJson) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log('SUMMARY', JSON.stringify(report.summary, null, 2));
  console.log('TOP_RULES', JSON.stringify(topRules, null, 2));
  console.log('TOP_GRAMMAR_RULES', JSON.stringify(topGrammarRules, null, 2));
  console.log('BUNDLE', JSON.stringify(byBundle, null, 2));
  console.log('NEEDS_UPDATE', JSON.stringify(topNeeds, null, 2));
}

main().catch((error) => {
  console.error('FATAL', error?.stack || String(error));
  process.exit(1);
});
