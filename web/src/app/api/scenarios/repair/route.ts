import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin';
import { requireAdminAuth } from '@/lib/auth';
import { analyzeScenario, applyPatchesToScenario } from '@shared/scenario-repair';
import type { ScenarioDetail, ApprovedRepair } from '@/lib/types';

export const dynamic = 'force-dynamic';

const MAX_IDS = 50;

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
    updatedAt: data.updated_at?.toDate?.()?.toISOString(),
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
                lastAudited:
                  serializeTimestamp(data.metadata.auditMetadata.lastAudited) ??
                  data.metadata.auditMetadata.lastAudited,
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
  };
}

export async function POST(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json() as { mode: string; ids?: unknown; approved?: unknown };

    if (body.mode === 'analyze') {
      if (!Array.isArray(body.ids) || body.ids.length === 0) {
        return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 });
      }
      if (body.ids.length > MAX_IDS) {
        return NextResponse.json({ error: `Cannot analyze more than ${MAX_IDS} scenarios at once` }, { status: 400 });
      }

      const ids = body.ids as string[];
      const snaps = await Promise.all(ids.map((id) => db.collection('scenarios').doc(id).get()));

      const results = snaps.map((snap) => {
        if (!snap.exists) {
          return {
            id: snap.id,
            title: '',
            bundle: null,
            auditScore: null,
            auditIssues: ['Scenario not found'],
            changes: [],
            hasChanges: false,
          };
        }
        const scenario = toDetail(snap.id, snap.data()!);
        return analyzeScenario(scenario);
      });

      return NextResponse.json({ results });
    }

    if (body.mode === 'apply') {
      if (!Array.isArray(body.approved) || body.approved.length === 0) {
        return NextResponse.json({ error: 'approved must be a non-empty array' }, { status: 400 });
      }
      if (body.approved.length > MAX_IDS) {
        return NextResponse.json({ error: `Cannot apply more than ${MAX_IDS} repairs at once` }, { status: 400 });
      }

      const approved = body.approved as ApprovedRepair[];
      let applied = 0;
      let skipped = 0;

      for (const repair of approved) {
        if (!repair.id || !Array.isArray(repair.patches) || repair.patches.length === 0) {
          skipped++;
          continue;
        }

        const docRef = db.collection('scenarios').doc(repair.id);
        const snap = await docRef.get();
        if (!snap.exists) { skipped++; continue; }

        const scenario = toDetail(snap.id, snap.data()!);
        const patched = applyPatchesToScenario(scenario, repair.patches);

        const prevRepairCount = snap.data()?.metadata?.repairMetadata?.repairCount ?? 0;
        const repairMetadata = {
          lastRepairedAt: new Date().toISOString(),
          repairCount: prevRepairCount + 1,
        };

        const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = patched;
        await docRef.set(
          {
            ...rest,
            metadata: { ...rest.metadata, repairMetadata },
            updated_at: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        applied++;
      }

      return NextResponse.json({ applied, skipped });
    }

    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
  } catch (err) {
    console.error('POST /api/scenarios/repair error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
