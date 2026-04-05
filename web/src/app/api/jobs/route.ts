import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { requireAdminAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
import type { JobSummary } from '@/lib/types';

function toSummary(id: string, data: FirebaseFirestore.DocumentData): JobSummary {
  return {
    id,
    status: data.status ?? 'pending',
    bundles: data.bundles ?? [],
    count: data.count ?? 0,
    requestedAt: data.requestedAt?.toDate?.()?.toISOString() ?? new Date(0).toISOString(),
    startedAt: data.startedAt?.toDate?.()?.toISOString(),
    completedAt: data.completedAt?.toDate?.()?.toISOString(),
    progress: data.progress,
    completedCount: data.completedCount,
    failedCount: data.failedCount,
    description: data.description,
    total: data.total,
    errors: (data.errors ?? []).slice(0, 5),
    auditSummary: data.auditSummary,
    currentBundle: data.currentBundle,
    currentPhase: data.currentPhase,
    currentMessage: data.currentMessage,
    lastHeartbeatAt: data.lastHeartbeatAt?.toDate?.()?.toISOString(),
    executionTarget: data.executionTarget,
    requestedBy: data.requestedBy,
    modelConfig: data.modelConfig,
    eventCount: data.eventCount,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);
    const statusFilter = searchParams.get('status');

    let query: FirebaseFirestore.Query = db
      .collection('generation_jobs')
      .orderBy('requestedAt', 'desc');
    if (statusFilter && statusFilter !== 'all') {
      query = query.where('status', '==', statusFilter);
    }

    const snap = await query.limit(limit).get();

    const jobs = snap.docs.map((d) => toSummary(d.id, d.data()));
    return NextResponse.json({ jobs });
  } catch (err) {
    console.error('GET /api/jobs error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json() as { ids?: unknown; deleteAll?: unknown; status?: unknown };

    if (body.deleteAll === true) {
      const statusFilter = typeof body.status === 'string' && body.status !== 'all' ? body.status : null;

      let baseQuery: FirebaseFirestore.Query = db.collection('generation_jobs');
      if (statusFilter) {
        baseQuery = baseQuery.where('status', '==', statusFilter);
      }

      const BATCH_SIZE = 400;
      let deleted = 0;
      let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;

      while (true) {
        let q = baseQuery.limit(BATCH_SIZE);
        if (lastDoc) q = q.startAfter(lastDoc);
        const snap = await q.get();
        if (snap.empty) break;

        const deletable = snap.docs.filter((d) => d.data().status !== 'running');
        if (deletable.length > 0) {
          const batch = db.batch();
          deletable.forEach((d) => batch.delete(d.ref));
          await batch.commit();
          deleted += deletable.length;
        }

        if (snap.docs.length < BATCH_SIZE) break;
        lastDoc = snap.docs[snap.docs.length - 1];
      }

      return NextResponse.json({ deleted });
    }

    const ids = body.ids;
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 });
    }
    if (ids.length > 200) {
      return NextResponse.json({ error: 'Cannot delete more than 200 jobs at once' }, { status: 400 });
    }

    const skipped: string[] = [];
    const toDelete: string[] = [];

    await Promise.all(
      (ids as string[]).map(async (id) => {
        const doc = await db.collection('generation_jobs').doc(id).get();
        if (doc.exists && doc.data()?.status === 'running') {
          skipped.push(id);
        } else {
          toDelete.push(id);
        }
      })
    );

    const batch = db.batch();
    toDelete.forEach((id) => batch.delete(db.collection('generation_jobs').doc(id)));
    await batch.commit();

    return NextResponse.json({ deleted: toDelete.length, skipped });
  } catch (err) {
    console.error('DELETE /api/jobs error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
