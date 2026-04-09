import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { requireAdminAuth } from '@/lib/auth';

interface GaiaRun {
  id: string;
  triggeredAt: string | null;
  reviewedAt: string | null;
  [key: string]: unknown;
}

export async function GET() {
  const snap = await db.collection('gaia_runs')
    .orderBy('triggeredAt', 'desc')
    .limit(20)
    .get();

  const runs: GaiaRun[] = snap.docs.map((doc) => {
    const data = doc.data();
    return {
      ...data,
      triggeredAt: data.triggeredAt?.toDate?.()?.toISOString() ?? null,
      reviewedAt: data.reviewedAt?.toDate?.()?.toISOString() ?? null,
    } as unknown as GaiaRun;
  });

  return NextResponse.json({ runs });
}

export async function POST(request: NextRequest) {
  const authError = await requireAdminAuth(request);
  if (authError) return authError;

  try {
    const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) throw new Error('FIREBASE_PROJECT_ID not configured');
    const url = `https://us-central1-${projectId}.cloudfunctions.net/triggerGaia`;
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: {} }) });
    if (!response.ok) throw new Error(`Function returned ${response.status}`);
    const json = await response.json() as { result?: { runId: string } };
    return NextResponse.json({ runId: json.result?.runId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to trigger Gaia';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
