import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin';
import { requireAdminAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
import type { JobDetail } from '@/lib/types';

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
    return NextResponse.json(toDetail(doc.id, doc.data()!));
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
