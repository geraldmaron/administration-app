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

  const { id } = params;

  try {
    const scenarioDoc = await db.collection('scenarios').doc(id).get();
    if (!scenarioDoc.exists) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
    }

    const data = scenarioDoc.data()!;
    const bundle = data.metadata?.bundle;
    if (!bundle) {
      return NextResponse.json({ error: 'Scenario has no bundle' }, { status: 400 });
    }

    const trainingRef = db.collection('training_scenarios').doc(id);
    const existing = await trainingRef.get();

    if (existing.exists && existing.data()?.isGolden) {
      return NextResponse.json({ success: true, alreadyGolden: true });
    }

    await trainingRef.set({
      ...data,
      id,
      isGolden: true,
      bundle,
      scopeTier: data.metadata?.scopeTier ?? 'universal',
      auditScore: data.metadata?.auditMetadata?.score ?? null,
      promotedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, alreadyGolden: false });
  } catch (err) {
    console.error('POST /api/scenarios/[id]/golden error:', err);
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
    await db.collection('training_scenarios').doc(params.id).delete();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/scenarios/[id]/golden error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
