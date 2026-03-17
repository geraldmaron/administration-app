import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { requireAdminAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
import { FieldValue } from 'firebase-admin/firestore';
import type { GenerationJobRequest } from '@/lib/types';
import { BUNDLE_IDS } from '@/lib/constants';

export async function POST(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  try {
    const body = (await request.json()) as GenerationJobRequest;
    const { bundles, count, regions, region, description, priority, modelConfig } = body;

    if (!Array.isArray(bundles) || bundles.length === 0) {
      return NextResponse.json({ error: 'At least one bundle is required' }, { status: 400 });
    }

    const invalidBundles = bundles.filter((b) => !(BUNDLE_IDS as readonly string[]).includes(b));
    if (invalidBundles.length > 0) {
      return NextResponse.json({ error: `Invalid bundle IDs: ${invalidBundles.join(', ')}` }, { status: 400 });
    }

    if (!Number.isInteger(count) || count < 1 || count > 50) {
      return NextResponse.json({ error: 'count must be an integer between 1 and 50' }, { status: 400 });
    }

    const [pendingSnap, configSnap] = await Promise.all([
      db.collection('generation_jobs').where('status', '==', 'pending').count().get(),
      db.doc('world_state/generation_config').get(),
    ]);
    const pendingCount = pendingSnap.data().count;
    const maxPending = configSnap.data()?.max_pending_jobs ?? 10;
    if (pendingCount >= maxPending) {
      return NextResponse.json(
        { error: `Too many pending jobs (${pendingCount}/${maxPending}). Wait for existing jobs to complete.` },
        { status: 429 }
      );
    }

    const jobData = {
      bundles,
      count,
      mode: 'manual',
      distributionConfig: body.distributionConfig ?? { mode: 'auto' },
      status: 'pending',
      priority: priority ?? 'normal',
      requestedBy: 'admin-web',
      requestedAt: FieldValue.serverTimestamp(),
      ...(regions && regions.length > 0 ? { regions } : {}),
      ...(region ? { region } : {}),
      ...(description ? { description } : {}),
      ...(modelConfig && (
        modelConfig.architectModel ||
        modelConfig.drafterModel ||
        modelConfig.repairModel ||
        modelConfig.contentQualityModel ||
        modelConfig.narrativeReviewModel ||
        modelConfig.embeddingModel
      ) ? { modelConfig } : {}),
    };

    const ref = await db.collection('generation_jobs').add(jobData);
    return NextResponse.json({ jobId: ref.id });
  } catch (err) {
    console.error('POST /api/generate error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
