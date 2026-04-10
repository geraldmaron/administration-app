import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { requireAdminAuth } from '@/lib/auth';
import type {
  AnalyticsResponse,
  AnalyticsBundleRow,
  AnalyticsDailyPoint,
  AnalyticsRuleRow,
  AnalyticsFailureRow,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const days = (() => {
    const n = Number(searchParams.get('days') ?? '30');
    return Number.isFinite(n) && n > 0 ? Math.min(Math.max(Math.round(n), 1), 90) : 30;
  })();

  const endDate = new Date();
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];

  const [summarySnap, failureSnap] = await Promise.all([
    db.collection('performance_summary')
      .where('date', '>=', startStr)
      .where('date', '<=', endStr)
      .orderBy('date', 'asc')
      .get(),
    db.collection('failure_analysis')
      .orderBy('timestamp', 'desc')
      .limit(200)
      .get(),
  ]);

  // --- Aggregate daily summaries ---
  let totalAttempts = 0;
  let totalSuccesses = 0;
  let totalScoreSum = 0;
  let totalScoreCount = 0;
  const bundleMap: Record<string, { attempts: number; successes: number; scoreSum: number }> = {};
  const categoryCount: Record<string, number> = {};
  const dailyTrend: AnalyticsDailyPoint[] = [];

  for (const doc of summarySnap.docs) {
    const d = doc.data();
    totalAttempts += d.totalAttempts ?? 0;
    totalSuccesses += d.successfulAttempts ?? 0;
    if (typeof d.avgAuditScore === 'number' && !isNaN(d.avgAuditScore) && (d.totalAttempts ?? 0) > 0) {
      totalScoreSum += d.avgAuditScore * (d.totalAttempts ?? 0);
      totalScoreCount += d.totalAttempts ?? 0;
    }

    dailyTrend.push({
      date: d.date,
      totalAttempts: d.totalAttempts ?? 0,
      successRate: typeof d.successRate === 'number' ? d.successRate : 0,
      avgScore: typeof d.avgAuditScore === 'number' ? d.avgAuditScore : 0,
    });

    for (const [bundle, stats] of Object.entries(d.byBundle ?? {})) {
      const s = stats as { attempts: number; successes: number; avgScore: number };
      if (!bundleMap[bundle]) bundleMap[bundle] = { attempts: 0, successes: 0, scoreSum: 0 };
      bundleMap[bundle].attempts += s.attempts ?? 0;
      bundleMap[bundle].successes += s.successes ?? 0;
      bundleMap[bundle].scoreSum += (s.avgScore ?? 0) * (s.attempts ?? 0);
    }

    for (const [cat, count] of Object.entries(d.failuresByCategory ?? {})) {
      categoryCount[cat] = (categoryCount[cat] ?? 0) + (count as number);
    }
  }

  const byBundle: AnalyticsBundleRow[] = Object.entries(bundleMap)
    .map(([bundle, s]) => ({
      bundle,
      attempts: s.attempts,
      successes: s.successes,
      avgScore: s.attempts > 0 ? Math.round(s.scoreSum / s.attempts) : 0,
    }))
    .sort((a, b) => b.attempts - a.attempts);

  const topFailureCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // --- Aggregate rule frequencies from recent failure_analysis docs ---
  const ruleCount: Record<string, number> = {};
  const recentFailures: AnalyticsFailureRow[] = [];

  for (const doc of failureSnap.docs) {
    const d = doc.data();
    // Only count if within the date window
    const ts: Date = d.timestamp?.toDate?.() ?? new Date(0);
    if (ts < startDate) continue;

    for (const issue of d.auditIssues ?? []) {
      const code = issue.code ?? issue.rule;
      if (code) ruleCount[code] = (ruleCount[code] ?? 0) + 1;
    }

    if (recentFailures.length < 20) {
      const topIssue = (d.auditIssues ?? []).find((i: { type: string }) => i.type === 'error') ?? d.auditIssues?.[0];
      recentFailures.push({
        id: doc.id,
        bundle: d.bundle ?? '',
        category: d.failureCategory ?? 'other',
        score: d.auditScore ?? 0,
        topIssue: topIssue?.message ?? topIssue?.code ?? '',
        timestamp: ts.toISOString(),
      });
    }
  }

  const topRules: AnalyticsRuleRow[] = Object.entries(ruleCount)
    .map(([rule, count]) => ({ rule, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 25);

  const response: AnalyticsResponse = {
    summary: {
      days,
      totalAttempts,
      totalSuccesses,
      successRate: totalAttempts > 0 ? totalSuccesses / totalAttempts : 0,
      avgAuditScore: totalScoreCount > 0 ? Math.round(totalScoreSum / totalScoreCount) : 0,
      topFailureCategory,
    },
    dailyTrend,
    byBundle,
    topRules,
    recentFailures,
  };

  return NextResponse.json(response);
}
