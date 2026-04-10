import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin';
import { requireAdminAuth } from '@/lib/auth';

interface PatchBody {
  status: 'approved' | 'rejected';
  reviewNote?: string;
}

const STAGE_TO_TEMPLATE: Partial<Record<string, string>> = {
  architect: 'architect_drafter',
  drafter: 'drafter_details',
};

async function applyRecommendationToPromptTemplate(
  pipelineStage: string,
  currentExcerpt: string,
  suggestedChange: string,
): Promise<boolean> {
  const templateName = STAGE_TO_TEMPLATE[pipelineStage];
  if (!templateName || !currentExcerpt || !suggestedChange) return false;

  const snapshot = await db.collection('prompt_templates')
    .where('name', '==', templateName)
    .where('active', '==', true)
    .orderBy('updatedAt', 'desc')
    .limit(1)
    .get();

  if (snapshot.empty) return false;

  const docRef = snapshot.docs[0].ref;
  const data = snapshot.docs[0].data();
  const currentConstraints: string = data.sections?.constraints ?? '';

  if (!currentConstraints.includes(currentExcerpt)) return false;

  const patched = currentConstraints.replace(currentExcerpt, suggestedChange);

  const versionParts = (data.version as string ?? '1.0.0').split('.');
  const patch = (parseInt(versionParts[2] ?? '0', 10) + 1).toString();
  const nextVersion = `${versionParts[0]}.${versionParts[1]}.${patch}`;

  await docRef.update({
    'sections.constraints': patched,
    version: nextVersion,
    updatedAt: Timestamp.now(),
  });

  return true;
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
    architect: Array<{ id: string; status: string; pipelineStage: string; currentExcerpt: string; suggestedChange: string; reviewedBy?: string; reviewedAt?: unknown; reviewNote?: string; promptPatchApplied?: boolean }>;
    drafter: Array<{ id: string; status: string; pipelineStage: string; currentExcerpt: string; suggestedChange: string; reviewedBy?: string; reviewedAt?: unknown; reviewNote?: string; promptPatchApplied?: boolean }>;
    repair: Array<{ id: string; status: string; pipelineStage: string; currentExcerpt: string; suggestedChange: string; reviewedBy?: string; reviewedAt?: unknown; reviewNote?: string; promptPatchApplied?: boolean }>;
    summary: string;
  } | undefined;

  if (!recs) {
    return NextResponse.json({ error: 'No recommendations found' }, { status: 404 });
  }

  let found = false;
  let promptPatchApplied = false;

  for (const stage of ['architect', 'drafter', 'repair'] as const) {
    const list = recs[stage];
    const idx = list.findIndex((r) => r.id === recId);
    if (idx === -1) continue;

    const rec = list[idx];

    if (body.status === 'approved') {
      promptPatchApplied = await applyRecommendationToPromptTemplate(
        rec.pipelineStage,
        rec.currentExcerpt,
        rec.suggestedChange,
      );
    }

    list[idx] = {
      ...rec,
      status: body.status,
      reviewedAt: Timestamp.now(),
      ...(body.reviewNote != null ? { reviewNote: body.reviewNote } : {}),
      ...(body.status === 'approved' ? { promptPatchApplied } : {}),
    };
    found = true;
    break;
  }

  if (!found) {
    return NextResponse.json({ error: 'Recommendation not found' }, { status: 404 });
  }

  await runRef.update({ promptRecommendations: recs });
  return NextResponse.json({ ok: true, promptPatchApplied });
}
