import { NextRequest, NextResponse } from 'next/server';
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

export const dynamic = 'force-dynamic';

const BUNDLE_IDS = ALL_BUNDLES.map((b) => b.id);
const REGION_IDS = ALL_REGIONS.map((r) => r.id);

const DEFAULT_ANALYSIS_TARGET_PER_BUNDLE = 24;
const DEFAULT_TOTAL_SCENARIOS = 24;
const DEFAULT_MAX_JOBS_PER_BLITZ = 8;

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
  const [pendingSnap, configSnap] = await Promise.all([
    db.collection('generation_jobs').where('status', '==', 'pending').count().get(),
    db.doc('world_state/generation_config').get(),
  ]);
  const pending = pendingSnap.data().count;
  const max = configSnap.data()?.max_pending_jobs ?? 10;
  return { available: Math.max(0, max - pending), pending, max };
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
    const executionTarget = body?.executionTarget as string | undefined;

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

    if (plan.plannedJobs.length === 0) {
      return NextResponse.json({ jobIds: [], message: 'No deficits found — inventory meets the target ratio.' });
    }

    const jobIds: string[] = [];
    const errors: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < plan.plannedJobs.length; i++) {
      try {
        const jobId = await submitJob(plan.plannedJobs[i], executionTarget);
        jobIds.push(jobId);
      } catch (err) {
        errors.push({ index: i, error: err instanceof Error ? err.message : String(err) });
      }
    }

    return NextResponse.json({
      jobIds,
      errors: errors.length > 0 ? errors : undefined,
      summary: plan.summary,
    });
  } catch (err) {
    console.error('POST /api/blitz error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
