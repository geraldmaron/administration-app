import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { Timestamp } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin';
import { requireAdminAuth } from '@/lib/auth';

interface PatchBody {
  status: 'approved' | 'rejected';
  reviewNote?: string;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { runId: string; recId: string } },
) {
  const authError = await requireAdminAuth(request);
  if (authError) return authError;

  const { runId, recId } = params;
  const body = await request.json() as PatchBody;

  if (body.status !== 'approved' && body.status !== 'rejected') {
    return NextResponse.json({ error: 'status must be approved or rejected' }, { status: 400 });
  }

  const runRef = db.collection('gaia_runs').doc(runId);
  const runSnap = await runRef.get();
  if (!runSnap.exists) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 });
  }

  const run = runSnap.data() as Record<string, unknown>;
  const recs = run.promptRecommendations as {
    architect: Array<{ id: string; status: string; reviewedBy?: string; reviewedAt?: unknown; reviewNote?: string }>;
    drafter: Array<{ id: string; status: string; reviewedBy?: string; reviewedAt?: unknown; reviewNote?: string }>;
    repair: Array<{ id: string; status: string; reviewedBy?: string; reviewedAt?: unknown; reviewNote?: string }>;
    summary: string;
  } | undefined;

  if (!recs) {
    return NextResponse.json({ error: 'No recommendations found' }, { status: 404 });
  }

  let found = false;
  for (const stage of ['architect', 'drafter', 'repair'] as const) {
    const list = recs[stage];
    const idx = list.findIndex((r) => r.id === recId);
    if (idx !== -1) {
      list[idx] = {
        ...list[idx],
        status: body.status,
        reviewedAt: Timestamp.now(),
        ...(body.reviewNote != null ? { reviewNote: body.reviewNote } : {}),
      };
      found = true;
      break;
    }
  }

  if (!found) {
    return NextResponse.json({ error: 'Recommendation not found' }, { status: 404 });
  }

  await runRef.update({ promptRecommendations: recs });
  return NextResponse.json({ ok: true });
}
