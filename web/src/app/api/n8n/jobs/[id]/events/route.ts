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
      level: 'info' | 'warning' | 'error' | 'success';
      code: string;
      message: string;
      bundle?: string;
      phase?: string;
      scenarioId?: string;
      data?: Record<string, unknown>;
    };

    if (!body.level || !body.code || !body.message) {
      return NextResponse.json({ error: 'level, code, and message are required' }, { status: 400 });
    }

    const jobRef = db.collection('generation_jobs').doc(params.id);
    const timestamp = FieldValue.serverTimestamp();

    await Promise.all([
      jobRef.collection('events').add({
        timestamp,
        level: body.level,
        code: body.code,
        message: body.message,
        ...(body.bundle ? { bundle: body.bundle } : {}),
        ...(body.phase ? { phase: body.phase } : {}),
        ...(body.scenarioId ? { scenarioId: body.scenarioId } : {}),
        ...(body.data ? { data: body.data } : {}),
      }),
      jobRef.set({
        lastHeartbeatAt: timestamp,
        eventCount: FieldValue.increment(1),
      }, { merge: true }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST /api/n8n/jobs/[id]/events error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
