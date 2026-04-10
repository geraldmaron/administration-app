import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { requireAdminAuth } from '@/lib/auth';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';
import type { ScenarioDetail } from '@/lib/types';

function serializeTimestamp(ts: unknown): string | undefined {
  if (!ts) return undefined;
  if (typeof (ts as any).toDate === 'function') return (ts as any).toDate().toISOString();
  if (ts instanceof Date) return ts.toISOString();
  if (typeof ts === 'number') return new Date(ts).toISOString();
  if (typeof ts === 'string') return ts;
  return undefined;
}

function toDetail(id: string, data: FirebaseFirestore.DocumentData): ScenarioDetail {
  return {
    id,
    title: data.title ?? '',
    description: data.description ?? '',
    is_active: data.is_active ?? false,
    createdAt: serializeTimestamp(data.created_at),
    updatedAt: serializeTimestamp(data.updated_at),
    phase: data.phase,
    actIndex: data.actIndex,
    options: (data.options ?? []).map((opt: FirebaseFirestore.DocumentData) => ({
      id: opt.id ?? '',
      text: opt.text ?? '',
      label: opt.label,
      effects: opt.effects ?? [],
      relationshipEffects: opt.relationshipEffects,
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
    relationship_conditions: data.relationship_conditions,
    chain_id: data.chain_id,
    token_map: data.token_map,
    legislature_requirement: data.legislature_requirement,
    generationProvenance: data.metadata?.generationProvenance,
    gaiaReviewedAt: serializeTimestamp(data.gaiaReviewedAt) ?? null,
    gaiaRunId: data.gaiaRunId ?? null,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const [doc, trainingDoc] = await Promise.all([
      db.collection('scenarios').doc(params.id).get(),
      db.collection('training_scenarios').doc(params.id).get(),
    ]);
    if (!doc.exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const detail = toDetail(doc.id, doc.data()!);
    return NextResponse.json({ ...detail, isGolden: trainingDoc.exists && trainingDoc.data()?.isGolden === true });
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
    const body = (await request.json()) as {
      is_active?: boolean;
      tags?: string[];
      title?: string;
      description?: string;
      options?: { id: string; text?: string; label?: string; outcomeHeadline?: string; outcomeSummary?: string; outcomeContext?: string }[];
      metadata?: { bundle?: string; severity?: string; difficulty?: number };
    };
    const update: Record<string, unknown> = {};
    if (typeof body.is_active === 'boolean') {
      update.is_active = body.is_active;
    }
    if (typeof body.title === 'string' && body.title.trim()) {
      update.title = body.title.trim();
    }
    if (typeof body.description === 'string' && body.description.trim()) {
      update.description = body.description.trim();
    }
    if (Array.isArray(body.options)) {
      const doc = await db.collection('scenarios').doc(params.id).get();
      if (!doc.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const existing = (doc.data()?.options ?? []) as Record<string, unknown>[];
      const patched = existing.map((opt) => {
        const patch = body.options!.find((p) => p.id === (opt.id as string));
        if (!patch) return opt;
        const merged = { ...opt };
        if (typeof patch.text === 'string') merged.text = patch.text.trim();
        if (typeof patch.label === 'string') merged.label = patch.label.trim();
        if (typeof patch.outcomeHeadline === 'string') merged.outcomeHeadline = patch.outcomeHeadline.trim();
        if (typeof patch.outcomeSummary === 'string') merged.outcomeSummary = patch.outcomeSummary.trim();
        if (typeof patch.outcomeContext === 'string') merged.outcomeContext = patch.outcomeContext.trim();
        return merged;
      });
      update.options = patched;
    }
    if (body.metadata) {
      if (typeof body.metadata.bundle === 'string') update['metadata.bundle'] = body.metadata.bundle.trim();
      if (typeof body.metadata.severity === 'string') update['metadata.severity'] = body.metadata.severity.trim();
      if (typeof body.metadata.difficulty === 'number') update['metadata.difficulty'] = body.metadata.difficulty;
    }
    if (Array.isArray(body.tags)) {
      const sanitized = body.tags
        .filter((t): t is string => typeof t === 'string')
        .map((t) => t.trim().toLowerCase().replace(/\s+/g, '_'))
        .filter(Boolean)
        .slice(0, 6);
      update['metadata.tags'] = sanitized;
      update['metadata.tagResolution'] = {
        status: 'manual',
        resolvedAt: new Date().toISOString(),
        resolvedTags: sanitized,
      };
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }
    const docRef = db.collection('scenarios').doc(params.id);
    const existingDoc = await docRef.get();
    if (!existingDoc.exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    update.updated_at = FieldValue.serverTimestamp();
    await docRef.update(update);
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
