import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { requireAdminAuth } from '@/lib/auth';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json() as {
      status: 'completed' | 'failed';
      completedCount?: number;
      failedCount?: number;
      savedScenarioIds?: string[];
      errors?: Array<{ bundle?: string; error: string }>;
      error?: string;
    };

    if (body.status !== 'completed' && body.status !== 'failed') {
      return NextResponse.json({ error: 'status must be completed or failed' }, { status: 400 });
    }

    const jobRef = db.collection('generation_jobs').doc(params.id);
    const doc = await jobRef.get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const jobData = doc.data();
    const effectiveStatus = jobData?.dryRun && body.status === 'completed'
      ? 'pending_review'
      : body.status;

    const timestamp = FieldValue.serverTimestamp();
    const completedCount = body.completedCount ?? 0;
    const failedCount = body.failedCount ?? 0;
    const total = completedCount + failedCount;

    await Promise.all([
      jobRef.set({
        status: effectiveStatus,
        completedAt: timestamp,
        lastHeartbeatAt: timestamp,
        updatedAt: timestamp,
        completedCount,
        failedCount,
        progress: total > 0 ? Math.round((completedCount / total) * 100) : 0,
        currentPhase: effectiveStatus === 'pending_review' ? 'pending_review' : effectiveStatus === 'completed' ? 'done' : 'failed',
        currentMessage: effectiveStatus === 'pending_review'
          ? `Pending review: ${completedCount} scenarios staged`
          : effectiveStatus === 'completed'
            ? `Completed: ${completedCount} scenarios generated`
            : `Failed after generating ${completedCount} scenarios`,
        ...(body.savedScenarioIds?.length ? { savedScenarioIds: body.savedScenarioIds } : {}),
        ...(body.errors?.length ? { errors: body.errors } : {}),
        ...(body.error ? { error: body.error } : {}),
      }, { merge: true }),
      jobRef.collection('events').add({
        timestamp,
        level: effectiveStatus === 'failed' ? 'error' : 'success',
        code: effectiveStatus === 'pending_review' ? 'job_pending_review' : effectiveStatus === 'completed' ? 'job_completed' : 'job_failed',
        message: effectiveStatus === 'pending_review'
          ? `Job pending review: ${completedCount} scenarios staged for approval.`
          : effectiveStatus === 'completed'
            ? `Job completed: ${completedCount} scenarios saved.`
            : `Job failed: ${body.error ?? 'Unknown error'}`,
        ...(effectiveStatus !== 'failed' ? { data: { completedCount, failedCount } } : {}),
      }),
    ]);

    await jobRef.set({ eventCount: FieldValue.increment(1) }, { merge: true });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST /api/n8n/jobs/[id]/complete error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
