import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin';
import { requireAdminAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
import type { JobDetail } from '@/lib/types';

type PhaseName = 'concept' | 'blueprint' | 'details';

async function getLiveActivity(data: FirebaseFirestore.DocumentData) {
  const status = data.status ?? 'pending';
  if (status !== 'running' && status !== 'pending') return undefined;

  const bundles = Array.isArray(data.bundles)
    ? data.bundles.filter((b: unknown): b is string => typeof b === 'string')
    : [];
  if (bundles.length === 0) return undefined;

  const hasProgress = typeof data.progress === 'number' && data.progress > 0;
  const hasResults = Array.isArray(data.results) && data.results.length > 0;
  if (hasProgress || hasResults) return undefined;

  const startedAtDate = data.startedAt?.toDate?.() ?? data.requestedAt?.toDate?.();
  if (!(startedAtDate instanceof Date)) return undefined;

  const metricsSnap = await db
    .collection('generation_metrics')
    .where('timestamp', '>=', startedAtDate)
    .orderBy('timestamp', 'desc')
    .limit(120)
    .get();

  const bundleSet = new Set(bundles);
  const byBundle: Record<string, {
    attempts: number;
    concept: number;
    blueprint: number;
    details: number;
    successes: number;
    scoreTotal: number;
    scoreCount: number;
  }> = {};

  let totalAttempts = 0;
  let lastMetricAt: string | undefined;

  for (const doc of metricsSnap.docs) {
    const metric = doc.data();
    const bundle = typeof metric.bundle === 'string' ? metric.bundle : '';
    if (!bundleSet.has(bundle)) continue;

    if (!byBundle[bundle]) {
      byBundle[bundle] = {
        attempts: 0,
        concept: 0,
        blueprint: 0,
        details: 0,
        successes: 0,
        scoreTotal: 0,
        scoreCount: 0,
      };
    }

    const row = byBundle[bundle];
    row.attempts += 1;
    totalAttempts += 1;

    const phase = metric.phase as PhaseName | undefined;
    if (phase === 'concept' || phase === 'blueprint' || phase === 'details') {
      row[phase] += 1;
    }

    if (metric.success === true) {
      row.successes += 1;
    }

    if (typeof metric.auditScore === 'number') {
      row.scoreTotal += metric.auditScore;
      row.scoreCount += 1;
    }

    const tsIso = metric.timestamp?.toDate?.()?.toISOString?.();
    if (!lastMetricAt && typeof tsIso === 'string') {
      lastMetricAt = tsIso;
    }
  }

  if (totalAttempts === 0) return undefined;

  const normalizedByBundle: Record<string, {
    attempts: number;
    concept: number;
    blueprint: number;
    details: number;
    successes: number;
    avgAuditScore?: number;
  }> = {};

  for (const [bundle, row] of Object.entries(byBundle)) {
    normalizedByBundle[bundle] = {
      attempts: row.attempts,
      concept: row.concept,
      blueprint: row.blueprint,
      details: row.details,
      successes: row.successes,
      ...(row.scoreCount > 0 ? { avgAuditScore: Math.round((row.scoreTotal / row.scoreCount) * 10) / 10 } : {}),
    };
  }

  return {
    totalAttempts,
    lastMetricAt,
    byBundle: normalizedByBundle,
  };
}

function toDetail(id: string, data: FirebaseFirestore.DocumentData): JobDetail {
  return {
    id,
    status: data.status ?? 'pending',
    bundles: data.bundles ?? [],
    count: data.count ?? 0,
    requestedAt: data.requestedAt?.toDate?.()?.toISOString() ?? new Date(0).toISOString(),
    progress: data.progress,
    completedCount: data.completedCount,
    failedCount: data.failedCount,
    description: data.description,
    total: data.total,
    mode: data.mode ?? 'manual',
    distributionConfig: data.distributionConfig ?? { mode: 'auto' },
    regions: data.regions,
    region: data.region,
    requestedBy: data.requestedBy,
    priority: data.priority ?? 'normal',
    startedAt: data.startedAt?.toDate?.()?.toISOString(),
    completedAt: data.completedAt?.toDate?.()?.toISOString(),
    savedScenarioIds: data.savedScenarioIds,
    results: data.results,
    errors: data.errors,
    error: data.error,
    auditSummary: data.auditSummary,
    rateLimitRetries: data.rateLimitRetries,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const doc = await db.collection('generation_jobs').doc(params.id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const data = doc.data()!;
    const detail = toDetail(doc.id, data);
    const liveActivity = await getLiveActivity(data);
    return NextResponse.json({
      ...detail,
      ...(liveActivity ? { liveActivity } : {}),
    });
  } catch (err) {
    console.error('GET /api/jobs/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  try {
    const doc = await db.collection('generation_jobs').doc(params.id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const data = doc.data()!;
    if (data.status === 'running') {
      return NextResponse.json({ error: 'Cannot delete a running job' }, { status: 400 });
    }
    await db.collection('generation_jobs').doc(params.id).delete();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/jobs/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json() as { action?: unknown };
    if (body.action !== 'stop') {
      return NextResponse.json({ error: 'Invalid action. Supported: stop' }, { status: 400 });
    }

    const doc = await db.collection('generation_jobs').doc(params.id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const data = doc.data()!;
    const terminalStatuses = ['completed', 'failed', 'cancelled'];
    if (terminalStatuses.includes(data.status)) {
      return NextResponse.json(
        { error: `Job is already in terminal state: ${data.status}` },
        { status: 400 }
      );
    }

    await db.collection('generation_jobs').doc(params.id).update({
      status: 'cancelled',
      completedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PATCH /api/jobs/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
