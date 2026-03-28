import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { requireAdminAuth } from '@/lib/auth';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function GET(
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
    return NextResponse.json({
      id: doc.id,
      status: data.status,
      bundles: data.bundles ?? [],
      count: data.count ?? 1,
      mode: data.mode ?? 'manual',
      distributionConfig: data.distributionConfig ?? { mode: 'auto' },
      scopeTier: data.scopeTier ?? 'universal',
      scopeKey: data.scopeKey ?? 'universal',
      applicable_countries: data.applicable_countries ?? null,
      regions: data.regions ?? null,
      region: data.region ?? null,
      description: data.description ?? null,
      newsContext: data.newsContext ?? null,
      modelConfig: data.modelConfig ?? null,
      dryRun: data.dryRun ?? false,
    });
  } catch (err) {
    console.error('GET /api/n8n/jobs/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json() as {
      currentPhase?: string;
      currentMessage?: string;
      currentBundle?: string;
      completedCount?: number;
      failedCount?: number;
      progress?: number;
    };

    const update: Record<string, unknown> = {
      lastHeartbeatAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (body.currentPhase !== undefined) update.currentPhase = body.currentPhase;
    if (body.currentMessage !== undefined) update.currentMessage = body.currentMessage;
    if (body.currentBundle !== undefined) update.currentBundle = body.currentBundle;
    if (typeof body.completedCount === 'number') update.completedCount = body.completedCount;
    if (typeof body.failedCount === 'number') update.failedCount = body.failedCount;
    if (typeof body.progress === 'number') update.progress = body.progress;

    await db.collection('generation_jobs').doc(params.id).set(update, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST /api/n8n/jobs/[id] heartbeat error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
