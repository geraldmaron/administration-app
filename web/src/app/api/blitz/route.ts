import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { db } from '@/lib/firebase-admin';
import { requireAdminAuth } from '@/lib/auth';
import { ALL_BUNDLES, ALL_REGIONS } from '@/lib/constants';
import { submitJob } from '@/lib/job-submission';
import {
  buildBlitzPlan,
  SCOPE_TIER_RATIOS,
  type BlitzPriority,
  type CountryEntry,
  type InventoryCell,
} from '@/lib/blitz-planner';
import type { GenerationMode, GenerationModelConfig } from '@shared/generation-contract';
import {
  hasMeaningfulModelConfig,
  fetchOllamaModels,
  buildOllamaModelConfig,
} from '@/lib/generation-models';

export const dynamic = 'force-dynamic';

const BUNDLE_IDS = ALL_BUNDLES.map((b) => b.id);
const REGION_IDS = ALL_REGIONS.map((r) => r.id);

const DEFAULT_ANALYSIS_TARGET_PER_BUNDLE = 24;
const DEFAULT_TOTAL_SCENARIOS = 24;
const DEFAULT_MAX_JOBS_PER_BLITZ = 8;

function countPlannedScenarios(jobs: Array<{ bundles: string[]; count: number }>): number {
  return jobs.reduce((sum, job) => sum + (job.bundles.length * job.count), 0);
}

async function fetchCountries(): Promise<CountryEntry[]> {
  const snap = await db.collection('countries').get();
  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      region: data.region ?? '',
      blitz_priority: (data.gameplay?.blitz_priority ?? 'medium') as BlitzPriority,
    };
  });
}

async function fetchInventory(countries: CountryEntry[]): Promise<InventoryCell[]> {
  const universalQueries = BUNDLE_IDS.map((bundle) =>
    db.collection('scenarios')
      .where('is_active', '==', true)
      .where('metadata.bundle', '==', bundle)
      .where('metadata.scopeTier', '==', 'universal')
      .count()
      .get()
      .then((snap) => ({ bundle, scopeTier: 'universal' as const, scopeKey: 'universal', count: snap.data().count }))
  );

  const regionalQueries = BUNDLE_IDS.flatMap((bundle) =>
    REGION_IDS.map((region) =>
      db.collection('scenarios')
        .where('is_active', '==', true)
        .where('metadata.bundle', '==', bundle)
        .where('metadata.scopeTier', '==', 'regional')
        .where('metadata.region_tags', 'array-contains', region)
        .count()
        .get()
        .then((snap) => ({ bundle, scopeTier: 'regional' as const, scopeKey: `region:${region}`, count: snap.data().count }))
    )
  );

  const priorityCountries = countries.filter((c) => c.blitz_priority === 'high' || c.blitz_priority === 'medium');
  const exclusiveQueries = BUNDLE_IDS.flatMap((bundle) =>
    priorityCountries.map((country) =>
      db.collection('scenarios')
        .where('is_active', '==', true)
        .where('metadata.bundle', '==', bundle)
        .where('metadata.scopeTier', '==', 'exclusive')
        .where('metadata.applicable_countries', 'array-contains', country.id)
        .count()
        .get()
        .then((snap) => ({ bundle, scopeTier: 'exclusive' as const, scopeKey: `country:${country.id}`, count: snap.data().count }))
    )
  );

  const allResults = await Promise.all([
    ...universalQueries,
    ...regionalQueries,
    ...exclusiveQueries,
  ]);

  return allResults.filter((r) => r.count > 0);
}

async function fetchAvailableSlots(): Promise<{ available: number; pending: number; max: number }> {
  const [pendingSnap, runningSnap, configSnap] = await Promise.all([
    db.collection('generation_jobs').where('status', '==', 'pending').count().get(),
    db.collection('generation_jobs').where('status', '==', 'running').count().get(),
    db.doc('world_state/generation_config').get(),
  ]);
  const pending = pendingSnap.data().count + runningSnap.data().count;
  const max = configSnap.data()?.max_pending_jobs ?? 10;
  return { available: Math.max(0, max - pending), pending, max };
}

async function resolveDefaultModelConfig(): Promise<GenerationModelConfig | undefined> {
  const ollamaBaseUrl =
    process.env.OLLAMA_BASE_URL ||
    (await db.doc('world_state/generation_config').get().then((s) => s.data()?.ollama_base_url as string | undefined).catch(() => undefined));
  if (!ollamaBaseUrl) return undefined;
  const models = await fetchOllamaModels(ollamaBaseUrl);
  if (models.length === 0) return undefined;
  return buildOllamaModelConfig(models);
}

function parseAnalysisTargetPerBundle(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.round(n), 200) : DEFAULT_ANALYSIS_TARGET_PER_BUNDLE;
}

function parseTotalScenarios(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.round(n), 200) : DEFAULT_TOTAL_SCENARIOS;
}

function parseMaxJobs(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.round(n), 10) : DEFAULT_MAX_JOBS_PER_BLITZ;
}

export async function GET(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const totalScenarios = parseTotalScenarios(searchParams.get('totalScenarios'));
    const analysisTargetPerBundle = parseAnalysisTargetPerBundle(searchParams.get('analysisTargetPerBundle'));
    const maxJobs = parseMaxJobs(searchParams.get('maxJobs'));

    const [countries, slots] = await Promise.all([
      fetchCountries(),
      fetchAvailableSlots(),
    ]);

    const inventory = await fetchInventory(countries);

    const plan = buildBlitzPlan(
      BUNDLE_IDS,
      REGION_IDS,
      countries,
      inventory,
      analysisTargetPerBundle,
      totalScenarios,
      slots.available,
      maxJobs,
    );

    return NextResponse.json({
      ...plan,
      ratios: SCOPE_TIER_RATIOS,
      totalScenarios,
      analysisTargetPerBundle,
      maxJobs,
      slots,
    });
  } catch (err) {
    console.error('GET /api/blitz error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json().catch(() => ({}));
    const totalScenarios = parseTotalScenarios(body?.totalScenarios);
    const analysisTargetPerBundle = parseAnalysisTargetPerBundle(body?.analysisTargetPerBundle);
    const maxJobs = parseMaxJobs(body?.maxJobs);
    const requestedMode: Extract<GenerationMode, 'blitz' | 'full_send'> = body?.mode === 'full_send' ? 'full_send' : 'blitz';
    const executionTarget = body?.executionTarget as string | undefined;
    const modelConfig = (body?.modelConfig ?? undefined) as GenerationModelConfig | undefined;
    const userDescription = typeof body?.description === 'string' && body.description.trim() ? body.description.trim() : undefined;
    const providerDistribution = (body?.providerDistribution ?? undefined) as { local?: number; openai?: number } | undefined;

    const [countries, slots] = await Promise.all([
      fetchCountries(),
      fetchAvailableSlots(),
    ]);

    if (slots.available <= 0) {
      return NextResponse.json(
        { error: `No available job slots (${slots.pending}/${slots.max} pending). Wait for existing jobs to complete.` },
        { status: 429 },
      );
    }

    const effectiveModelConfig = hasMeaningfulModelConfig(modelConfig)
      ? modelConfig
      : await resolveDefaultModelConfig();

    const inventory = await fetchInventory(countries);

    const plan = buildBlitzPlan(
      BUNDLE_IDS,
      REGION_IDS,
      countries,
      inventory,
      analysisTargetPerBundle,
      totalScenarios,
      slots.available,
      maxJobs,
      { modelConfig: effectiveModelConfig },
    );

    if (plan.plannedJobs.length === 0) {
      return NextResponse.json({ jobIds: [], message: 'No deficits found — inventory meets the target ratio.' });
    }

    // Calculate provider distribution for full_send mode
    let localScenariosTarget = 0;
    if (requestedMode === 'full_send' && providerDistribution) {
      localScenariosTarget = Math.max(0, Math.min(totalScenarios, providerDistribution.local ?? 0));
    }

    const runId = randomUUID();
    await db.collection('generation_runs').doc(runId).set({
      id: runId,
      kind: requestedMode === 'full_send' ? 'full_send' : 'blitz',
      status: 'queued',
      requestedAt: new Date().toISOString(),
      requestedBy: 'admin-web',
      totalJobs: plan.plannedJobs.length,
      summary: plan.summary,
      jobIds: [],
      executionTarget: executionTarget ?? (effectiveModelConfig ? 'local' : 'cloud_function'),
      description: userDescription ?? (requestedMode === 'full_send' ? 'Full Send generation run' : 'Blitz generation run'),
      mode: requestedMode,
      ...(requestedMode === 'full_send' && providerDistribution ? { providerDistribution } : {}),
    });
    // Build job descriptors before submitting, distributing providers based on scenario targets
    let localScenariosUsed = 0;
    const jobDescriptors = plan.plannedJobs.map((plannedJob, i) => {
      const jobScenarioCount = plannedJob.bundles.length * plannedJob.count;
      let jobExecutionTarget = executionTarget;
      let jobModelConfig = effectiveModelConfig;

      if (requestedMode === 'full_send' && providerDistribution && localScenariosTarget > 0) {
        if (localScenariosUsed < localScenariosTarget) {
          // This job goes to local (n8n + Ollama)
          jobExecutionTarget = 'n8n';
          jobModelConfig = effectiveModelConfig;
        } else {
          // This job goes to cloud (cloud_function, no Ollama)
          jobExecutionTarget = 'cloud_function';
          jobModelConfig = undefined;
        }
        localScenariosUsed += jobScenarioCount;
      }

      const job = {
        ...plannedJob,
        mode: requestedMode,
        runId,
        runKind: requestedMode === 'full_send' ? 'full_send' as const : 'blitz' as const,
        runJobIndex: i + 1,
        runTotalJobs: plan.plannedJobs.length,
        runLabel: plannedJob.description ?? `${requestedMode === 'full_send' ? 'Full Send' : 'Blitz'} job ${i + 1}`,
        ...(jobModelConfig ? { modelConfig: jobModelConfig } : {}),
        ...(userDescription ? { description: `${userDescription}\n${plannedJob.description ?? ''}`.trim() } : {}),
      };

      return { job, jobExecutionTarget, plannedJob, index: i };
    });

    // Submit all jobs in parallel so local and cloud pipelines start concurrently
    const results = await Promise.allSettled(
      jobDescriptors.map(({ job, jobExecutionTarget }) => submitJob(job, jobExecutionTarget))
    );

    const jobIds: string[] = [];
    const submittedJobs: typeof plan.plannedJobs = [];
    const errors: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'fulfilled') {
        jobIds.push(result.value);
        submittedJobs.push(jobDescriptors[i].plannedJob);
      } else {
        errors.push({ index: i, error: result.reason instanceof Error ? result.reason.message : String(result.reason) });
      }
    }

    const submittedSummary = {
      ...plan.summary,
      jobsToCreate: submittedJobs.length,
      scenariosToGenerate: countPlannedScenarios(submittedJobs),
    };

    await db.collection('generation_runs').doc(runId).set({
      jobIds,
      totalJobs: submittedJobs.length,
      status: errors.length > 0 && jobIds.length === 0 ? 'failed' : 'submitted',
      submittedAt: new Date().toISOString(),
      failedJobCount: errors.length,
      summary: submittedSummary,
    }, { merge: true });

    return NextResponse.json({
      runId,
      jobIds,
      errors: errors.length > 0 ? errors : undefined,
      summary: submittedSummary,
    });
  } catch (err) {
    console.error('POST /api/blitz error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
