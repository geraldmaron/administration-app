import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { requireAdminAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
import { FieldValue } from 'firebase-admin/firestore';
import type { GenerationJobRequest } from '@/lib/types';
import { BUNDLE_IDS } from '@/lib/constants';
import { normalizeGenerationScope } from '../../../../../shared/generation-contract';
import { buildGenerationJobRecord, estimateExpectedScenarios } from '../../../../../shared/generation-job';
import { submitJob } from '@/lib/job-submission';

async function appendJobEvent(
  jobRef: FirebaseFirestore.DocumentReference,
  event: {
    level: 'info' | 'warning' | 'error' | 'success';
    code: string;
    message: string;
    bundle?: string;
    phase?: string;
    scenarioId?: string;
    data?: Record<string, unknown>;
  },
  heartbeat?: { currentBundle?: string; currentPhase?: string; currentMessage?: string }
) {
  const timestamp = FieldValue.serverTimestamp();
  await Promise.all([
    jobRef.collection('events').add({
      timestamp,
      level: event.level,
      code: event.code,
      message: event.message,
      ...(event.bundle ? { bundle: event.bundle } : {}),
      ...(event.phase ? { phase: event.phase } : {}),
      ...(event.scenarioId ? { scenarioId: event.scenarioId } : {}),
      ...(event.data ? { data: event.data } : {}),
    }),
    jobRef.set({
      lastHeartbeatAt: timestamp,
      eventCount: FieldValue.increment(1),
      ...(heartbeat?.currentBundle !== undefined ? { currentBundle: heartbeat.currentBundle } : {}),
      ...(heartbeat?.currentPhase !== undefined ? { currentPhase: heartbeat.currentPhase } : {}),
      ...(heartbeat?.currentMessage !== undefined ? { currentMessage: heartbeat.currentMessage } : {}),
    }, { merge: true }),
  ]);
}

function hasMeaningfulModelConfig(modelConfig?: GenerationJobRequest['modelConfig']): boolean {
  return Boolean(
    modelConfig && (
      modelConfig.architectModel ||
      modelConfig.drafterModel ||
      modelConfig.repairModel ||
      modelConfig.contentQualityModel ||
      modelConfig.narrativeReviewModel ||
      modelConfig.embeddingModel
    )
  );
}

export async function POST(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  try {
    const body = (await request.json()) as GenerationJobRequest;
    const {
      bundles,
      count,
      lowLatencyMode,
      regions,
      region,
      scopeTier,
      scopeKey,
      clusterId,
      exclusivityReason,
      applicable_countries,
      sourceKind,
      description,
      priority,
      modelConfig,
      dryRun,
      newsContext,
      mode,
      executionTarget,
    } = body;

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

    const normalizedScope = normalizeGenerationScope({
      mode,
      region,
      regions,
      scopeTier,
      scopeKey,
      clusterId,
      exclusivityReason,
      applicable_countries,
      sourceKind,
    });

    if (!normalizedScope.ok || !normalizedScope.value) {
      return NextResponse.json({ error: normalizedScope.error ?? 'Invalid scope configuration' }, { status: 400 });
    }

    const scope = normalizedScope.value;
    const normalizedModelConfig = hasMeaningfulModelConfig(modelConfig) ? modelConfig : undefined;

    const [pendingSnap, configSnap] = await Promise.all([
      db.collection('generation_jobs').where('status', '==', 'pending').count().get(),
      db.doc('world_state/generation_config').get(),
    ]);

    const requestedLowLatencyMode = lowLatencyMode ?? false;

    const requestPayload: GenerationJobRequest = {
      bundles,
      count,
      mode: mode === 'news' ? 'news' : mode === 'blitz' ? 'blitz' : 'manual',
      ...(requestedLowLatencyMode ? { lowLatencyMode: true } : {}),
      distributionConfig: body.distributionConfig ?? { mode: 'auto' },
      ...(description ? { description } : {}),
      ...(newsContext && newsContext.length > 0 ? { newsContext } : {}),
      ...(normalizedModelConfig ? { modelConfig: normalizedModelConfig } : {}),
      ...(dryRun ? { dryRun: true } : {}),
      ...(scope.regions.length > 0 ? { regions: scope.regions, region: scope.regions[0] } : {}),
      scopeTier: scope.scopeTier,
      scopeKey: scope.scopeKey,
      ...(scope.clusterId ? { clusterId: scope.clusterId } : {}),
      ...(scope.exclusivityReason ? { exclusivityReason: scope.exclusivityReason } : {}),
      ...(scope.applicable_countries?.length ? { applicable_countries: scope.applicable_countries } : {}),
      sourceKind: scope.sourceKind,
      priority: priority ?? 'normal',
      ...(executionTarget ? { executionTarget } : {}),
    };

    const pendingCount = pendingSnap.data().count;
    const maxPending = configSnap.data()?.max_pending_jobs ?? 10;
    if (pendingCount >= maxPending) {
      return NextResponse.json(
        { error: `Too many pending jobs (${pendingCount}/${maxPending}). Wait for existing jobs to complete.` },
        { status: 429 }
      );
    }

    const jobId = await submitJob(requestPayload, executionTarget);

    return NextResponse.json({ jobId });
  } catch (err) {
    console.error('POST /api/generate error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
