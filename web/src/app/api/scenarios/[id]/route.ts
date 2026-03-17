import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { requireAdminAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
import type { ScenarioDetail } from '@/lib/types';

function serializeTimestamp(ts: FirebaseFirestore.Timestamp | undefined): string | undefined {
  return ts?.toDate?.()?.toISOString();
}

function toDetail(id: string, data: FirebaseFirestore.DocumentData): ScenarioDetail {
  return {
    id,
    title: data.title ?? '',
    description: data.description ?? '',
    is_active: data.is_active ?? false,
    createdAt: data.created_at?.toDate?.()?.toISOString() ?? new Date(0).toISOString(),
    phase: data.phase,
    actIndex: data.actIndex,
    options: (data.options ?? []).map((opt: FirebaseFirestore.DocumentData) => ({
      id: opt.id ?? '',
      text: opt.text ?? '',
      label: opt.label,
      effects: opt.effects ?? [],
      advisorFeedback: opt.advisorFeedback ?? [],
      outcomeHeadline: opt.outcomeHeadline,
      outcomeSummary: opt.outcomeSummary,
      outcomeContext: opt.outcomeContext,
    })),
    metadata: data.metadata
      ? {
          ...data.metadata,
          auditMetadata: data.metadata.auditMetadata
            ? {
                ...data.metadata.auditMetadata,
                lastAudited: serializeTimestamp(data.metadata.auditMetadata.lastAudited) ?? data.metadata.auditMetadata.lastAudited,
              }
            : undefined,
        }
      : undefined,
    conditions: data.conditions,
    legislature_requirement: data.legislature_requirement,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const doc = await db.collection('scenarios').doc(params.id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(toDetail(doc.id, doc.data()!));
  } catch (err) {
    console.error('GET /api/scenarios/[id] error:', err);
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
    const body = (await request.json()) as { is_active?: boolean };
    if (typeof body.is_active !== 'boolean') {
      return NextResponse.json({ error: 'is_active must be a boolean' }, { status: 400 });
    }
    await db.collection('scenarios').doc(params.id).update({ is_active: body.is_active });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PATCH /api/scenarios/[id] error:', err);
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
    await db.collection('scenarios').doc(params.id).delete();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/scenarios/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
