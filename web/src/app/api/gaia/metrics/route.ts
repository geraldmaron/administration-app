import { NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin';

type PipelineStage = 'architect' | 'drafter' | 'tokenResolve' | 'audit' | 'repair';

interface StageMetricDoc {
  scenarioId: string;
  jobId: string;
  bundle: string;
  createdAt: FirebaseFirestore.Timestamp;
  stages: {
    architect: { passed: boolean; issueCount: number; issues: string[] };
    drafter: { passed: boolean; issueCount: number; issues: string[] };
    tokenResolve: { passed: boolean; unresolvedCount: number; fallbackCount: number };
    audit: { score: number; issueCount: number; issueTypes: string[] };
    repair: { attempted: boolean; repairCount: number; failedRepairs: string[] };
  };
  overallPassed: boolean;
}

const WEEKS_BACK = 8;
const STAGES: PipelineStage[] = ['architect', 'drafter', 'tokenResolve', 'audit', 'repair'];

export async function GET() {
  const since = Timestamp.fromDate(
    new Date(Date.now() - WEEKS_BACK * 7 * 24 * 3600 * 1000),
  );

  const snap = await db.collection('pipeline_stage_metrics')
    .where('createdAt', '>=', since)
    .orderBy('createdAt', 'desc')
    .limit(1000)
    .get();

  const counts: Record<PipelineStage, {
    passed: number;
    total: number;
    issueFreq: Record<string, number>;
    weeklyPassed: number[];
    weeklyTotal: number[];
  }> = {} as never;

  for (const stage of STAGES) {
    counts[stage] = { passed: 0, total: 0, issueFreq: {}, weeklyPassed: Array(WEEKS_BACK).fill(0), weeklyTotal: Array(WEEKS_BACK).fill(0) };
  }

  const now = Date.now();

  for (const doc of snap.docs) {
    const data = doc.data() as StageMetricDoc;
    const ageMs = now - (data.createdAt?.toMillis?.() ?? now);
    const weekIdx = Math.min(Math.floor(ageMs / (7 * 24 * 3600 * 1000)), WEEKS_BACK - 1);

    for (const stage of STAGES) {
      const stageData = data.stages[stage];
      if (!stageData) continue;
      counts[stage].total++;
      counts[stage].weeklyTotal[weekIdx]++;

      const passed = 'passed' in stageData ? stageData.passed : false;
      if (passed) {
        counts[stage].passed++;
        counts[stage].weeklyPassed[weekIdx]++;
      }

      const issues: string[] = 'issues' in stageData
        ? stageData.issues
        : 'issueTypes' in stageData
          ? (stageData as { issueTypes: string[] }).issueTypes
          : 'failedRepairs' in stageData
            ? (stageData as { failedRepairs: string[] }).failedRepairs
            : [];

      for (const issue of issues) {
        counts[stage].issueFreq[issue] = (counts[stage].issueFreq[issue] ?? 0) + 1;
      }
    }
  }

  const result: Record<PipelineStage, {
    passRate: number;
    sampleSize: number;
    topIssues: string[];
    weeklyPassRates: number[];
  }> = {} as never;

  for (const stage of STAGES) {
    const { passed, total, issueFreq, weeklyPassed, weeklyTotal } = counts[stage];
    const topIssues = Object.entries(issueFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k]) => k);
    const weeklyPassRates = weeklyPassed.map((p, i) =>
      weeklyTotal[i] > 0 ? p / weeklyTotal[i] : 1,
    );
    result[stage] = {
      passRate: total > 0 ? passed / total : 1,
      sampleSize: total,
      topIssues,
      weeklyPassRates,
    };
  }

  return NextResponse.json({ metrics: result, sampleSize: snap.size, weeksBack: WEEKS_BACK });
}
