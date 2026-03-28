import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { requireAdminAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const snap = await db.doc('world_state/generation_config').get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'generation_config not found' }, { status: 404 });
    }
    return NextResponse.json(snap.data());
  } catch (err) {
    console.error('GET /api/settings error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();

    const allowedFields = new Set([
      'content_quality_gate_enabled',
      'narrative_review_enabled',
      'llm_repair_enabled',
      'audit_pass_threshold',
      'max_bundle_concurrency',
      'max_scenarios_per_job',
      'concept_concurrency',
      'dedup_similarity_threshold',
      'max_llm_repair_attempts',
      'category_domain_metrics',
      'analytics_retention_days',
      'ollama_base_url',
    ]);

    const update: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (allowedFields.has(key)) {
        update[key] = value;
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    await db.doc('world_state/generation_config').update(update);
    return NextResponse.json({ updated: Object.keys(update) });
  } catch (err) {
    console.error('PATCH /api/settings error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
