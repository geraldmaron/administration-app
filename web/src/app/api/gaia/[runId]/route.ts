import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { requireAdminAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  const authError = await requireAdminAuth(request);
  if (authError) return authError;

  const { runId } = await params;
  if (!runId) return NextResponse.json({ error: 'runId required' }, { status: 400 });

  try {
    const ref = db.collection('gaia_runs').doc(runId);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: 'Run not found' }, { status: 404 });

    const status = snap.data()?.status as string;
    if (status === 'queued' || status === 'running') {
      return NextResponse.json({ error: 'Cannot delete an active run. Cancel it first.' }, { status: 409 });
    }

    await ref.delete();
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  const authError = await requireAdminAuth(request);
  if (authError) return authError;

  const { runId } = await params;
  if (!runId) return NextResponse.json({ error: 'runId required' }, { status: 400 });

  try {
    const body = await request.json().catch(() => ({})) as { action?: string };

    if (body.action === 'cancel') {
      const ref = db.collection('gaia_runs').doc(runId);
      const snap = await ref.get();
      if (!snap.exists) return NextResponse.json({ error: 'Run not found' }, { status: 404 });

      const status = snap.data()?.status as string;
      if (status !== 'queued' && status !== 'running') {
        return NextResponse.json({ error: `Cannot cancel run with status: ${status}` }, { status: 409 });
      }

      await ref.update({ status: 'cancelled', progress: null });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
