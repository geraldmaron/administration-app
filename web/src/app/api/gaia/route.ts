import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { requireAdminAuth } from '@/lib/auth';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

function serializeTimestamps(data: FirebaseFirestore.DocumentData): Record<string, unknown> {
  const out: Record<string, unknown> = { ...data };
  for (const key of Object.keys(out)) {
    const val = out[key];
    if (val && typeof (val as { toDate?: unknown }).toDate === 'function') {
      out[key] = (val as { toDate: () => Date }).toDate().toISOString();
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      out[key] = serializeTimestamps(val as FirebaseFirestore.DocumentData);
    }
  }
  return out;
}

export async function GET() {
  try {
    const snap = await db.collection('gaia_runs')
      .orderBy('triggeredAt', 'desc')
      .limit(20)
      .get();

    const runs = snap.docs.map((doc) => ({ id: doc.id, ...serializeTimestamps(doc.data()) }));
    return NextResponse.json({ runs });
  } catch (err) {
    console.error('GET /api/gaia error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdminAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json().catch(() => ({})) as { modelConfig?: Record<string, unknown> };

    // Pre-generate runId so the UI can track the run immediately.
    const runId = randomUUID();
    const now = Timestamp.now();

    // Write a queued placeholder to gaia_runs so the UI sees it instantly.
    await db.collection('gaia_runs').doc(runId).set({
      runId,
      triggeredAt: now,
      triggeredBy: 'manual',
      status: 'queued',
      sampledScenarioIds: [],
      generatedScenarioIds: [],
      auditSummary: { totalIssues: 0, byType: {} },
      tokenResolutionSummary: { unresolvedCount: 0, fallbackCount: 0, countriesTested: 0 },
      verbiageFindings: [],
      promptRecommendations: { architect: [], drafter: [], repair: [], summary: '' },
    });

    // Enqueue for the Cloud Function to pick up, passing runId so the function
    // writes to the same gaia_runs doc instead of generating a new UUID.
    await db.collection('gaia_queue').doc().set({
      runId,
      triggeredBy: 'manual',
      triggeredAt: FieldValue.serverTimestamp(),
      ...(body.modelConfig ? { modelConfig: body.modelConfig } : {}),
    });

    return NextResponse.json({ runId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to enqueue Gaia run';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
