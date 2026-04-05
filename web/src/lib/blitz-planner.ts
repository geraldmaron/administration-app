import type { ScenarioScopeTier, GenerationJobRequest } from './types';
import type { GenerationModelConfig } from './generation-contract';

export type BlitzPriority = 'high' | 'medium' | 'low';

export const SCOPE_TIER_RATIOS: Record<ScenarioScopeTier, number> = {
  universal: 0.40,
  regional: 0.25,
  cluster: 0.25,
  exclusive: 0.10,
};

const SCOPE_TIERS: ScenarioScopeTier[] = ['universal', 'regional', 'cluster', 'exclusive'];

const PRIORITY_WEIGHTS: Record<BlitzPriority, number> = {
  high: 1.5,
  medium: 1.0,
  low: 0.6,
};

export interface InventoryCell {
  bundle: string;
  scopeTier: ScenarioScopeTier;
  scopeKey: string;
  count: number;
}

export interface CountryEntry {
  id: string;
  region: string;
  blitz_priority: BlitzPriority;
}

export interface DeficitCell {
  bundle: string;
  scopeTier: ScenarioScopeTier;
  scopeKey: string;
  region?: string;
  country?: string;
  current: number;
  target: number;
  deficit: number;
  score: number;
}

export interface TierAllocation {
  universal: number;
  regional: number;
  cluster: number;
  exclusive: number;
}

export interface BlitzPreview {
  allocation: TierAllocation;
  deficits: DeficitCell[];
  plannedJobs: GenerationJobRequest[];
  summary: {
    totalRequested: number;
    totalDeficit: number;
    jobsToCreate: number;
    scenariosToGenerate: number;
    availableSlots: number;
  };
}

export interface BlitzPlanningOptions {
  modelConfig?: GenerationModelConfig;
}

function formatBlitzJobDescription(
  scopeTier: ScenarioScopeTier,
  scopeKey: string,
  bundles: string[],
): string {
  return `Blitz: ${scopeTier} ${scopeKey} [${bundles.join(', ')}]`;
}

export function allocateByRatio(total: number): TierAllocation {
  if (total <= 0) return { universal: 0, regional: 0, cluster: 0, exclusive: 0 };

  const base: Record<string, number> = {};
  let assigned = 0;
  for (const tier of SCOPE_TIERS) {
    const rounded = Math.floor(total * SCOPE_TIER_RATIOS[tier]);
    base[tier] = rounded;
    assigned += rounded;
  }

  const remainders = SCOPE_TIERS
    .map((tier) => ({ tier, remainder: (total * SCOPE_TIER_RATIOS[tier]) - base[tier] }))
    .sort((a, b) => b.remainder - a.remainder);

  let remaining = total - assigned;
  for (const entry of remainders) {
    if (remaining <= 0) break;
    base[entry.tier] += 1;
    remaining -= 1;
  }

  return base as unknown as TierAllocation;
}

function distributeEvenly(total: number, slots: number): number[] {
  if (slots <= 0 || total <= 0) return [];
  const base = Math.floor(total / slots);
  let remainder = total - base * slots;
  return Array.from({ length: slots }, () => {
    const extra = remainder > 0 ? 1 : 0;
    remainder -= extra;
    return base + extra;
  });
}

export function calculateDeficits(
  bundles: string[],
  regions: string[],
  countries: CountryEntry[],
  inventory: InventoryCell[],
  totalPerBundle: number,
): DeficitCell[] {
  const allocation = allocateByRatio(totalPerBundle);

  const lookup = new Map<string, number>();
  for (const cell of inventory) {
    lookup.set(`${cell.bundle}|${cell.scopeTier}|${cell.scopeKey}`, cell.count);
  }

  function current(bundle: string, scopeTier: ScenarioScopeTier, scopeKey: string): number {
    return lookup.get(`${bundle}|${scopeTier}|${scopeKey}`) ?? 0;
  }

  const deficits: DeficitCell[] = [];

  const regionalTargets = distributeEvenly(allocation.regional, regions.length);

  const highCountries = countries.filter((c) => c.blitz_priority === 'high');
  const mediumCountries = countries.filter((c) => c.blitz_priority === 'medium');
  const lowCountries = countries.filter((c) => c.blitz_priority === 'low');
  const totalPriorityWeight =
    highCountries.length * PRIORITY_WEIGHTS.high +
    mediumCountries.length * PRIORITY_WEIGHTS.medium +
    lowCountries.length * PRIORITY_WEIGHTS.low;

  function exclusiveTargetForCountry(priority: BlitzPriority): number {
    if (totalPriorityWeight === 0 || allocation.exclusive === 0) return 0;
    const share = PRIORITY_WEIGHTS[priority] / totalPriorityWeight;
    const countForTier = priority === 'high' ? highCountries.length
      : priority === 'medium' ? mediumCountries.length
      : lowCountries.length;
    if (countForTier === 0) return 0;
    const tierTotal = Math.round(allocation.exclusive * share * countForTier);
    return Math.max(1, Math.round(tierTotal / countForTier));
  }

  for (const bundle of bundles) {
    const uCurrent = current(bundle, 'universal', 'universal');
    const uTarget = allocation.universal;
    const uDeficit = Math.max(0, uTarget - uCurrent);
    if (uDeficit > 0) {
      const urgency = uCurrent < uTarget * 0.5 ? 2.0 : 1.0;
      deficits.push({
        bundle, scopeTier: 'universal', scopeKey: 'universal',
        current: uCurrent, target: uTarget, deficit: uDeficit,
        score: uDeficit * SCOPE_TIER_RATIOS.universal * urgency,
      });
    }

    regions.forEach((region, i) => {
      const rScopeKey = `region:${region}`;
      const rCurrent = current(bundle, 'regional', rScopeKey);
      const rTarget = regionalTargets[i] ?? 0;
      const rDeficit = Math.max(0, rTarget - rCurrent);
      if (rDeficit > 0) {
        const urgency = rCurrent < rTarget * 0.5 ? 2.0 : 1.0;
        deficits.push({
          bundle, scopeTier: 'regional', scopeKey: rScopeKey, region,
          current: rCurrent, target: rTarget, deficit: rDeficit,
          score: rDeficit * SCOPE_TIER_RATIOS.regional * urgency,
        });
      }
    });

    for (const country of countries) {
      const eScopeKey = `country:${country.id}`;
      const eCurrent = current(bundle, 'exclusive', eScopeKey);
      const eTarget = exclusiveTargetForCountry(country.blitz_priority);
      const eDeficit = Math.max(0, eTarget - eCurrent);
      if (eDeficit > 0) {
        const urgency = eCurrent < eTarget * 0.5 ? 2.0 : 1.0;
        deficits.push({
          bundle, scopeTier: 'exclusive', scopeKey: eScopeKey, country: country.id,
          current: eCurrent, target: eTarget, deficit: eDeficit,
          score: eDeficit * SCOPE_TIER_RATIOS.exclusive * PRIORITY_WEIGHTS[country.blitz_priority] * urgency,
        });
      }
    }
  }

  deficits.sort((a, b) => b.score - a.score);
  return deficits;
}

interface JobSlot {
  scopeTier: ScenarioScopeTier;
  scopeKey: string;
  region?: string;
  country?: string;
  bundles: Set<string>;
  totalDeficit: number;
}

const MAX_BUNDLES_PER_JOB = 5;
const MAX_SCENARIOS_PER_JOB = 50;

function getMaxBundlesPerJob(modelConfig?: GenerationModelConfig): number {
  const values = Object.values(modelConfig ?? {}).filter((v): v is string => typeof v === 'string');
  return values.some((v) => v.startsWith('ollama:')) ? 2 : MAX_BUNDLES_PER_JOB;
}

export function groupDeficitsIntoJobs(
  deficits: DeficitCell[],
  availableSlots: number,
  maxJobsPerBlitz: number,
  options?: BlitzPlanningOptions,
): GenerationJobRequest[] {
  const maxJobs = Math.min(maxJobsPerBlitz, availableSlots);
  if (maxJobs <= 0 || deficits.length === 0) return [];
  const maxBundlesPerJob = Math.max(1, Math.min(MAX_BUNDLES_PER_JOB, getMaxBundlesPerJob(options?.modelConfig)));

  const slots = new Map<string, JobSlot>();
  const slotOrder: string[] = [];

  for (const deficit of deficits) {
    const slotKey = `${deficit.scopeTier}|${deficit.scopeKey}`;

    let slot = slots.get(slotKey);
    if (!slot) {
      if (slots.size >= maxJobs) continue;
      slot = {
        scopeTier: deficit.scopeTier,
        scopeKey: deficit.scopeKey,
        region: deficit.region,
        country: deficit.country,
        bundles: new Set(),
        totalDeficit: 0,
      };
      slots.set(slotKey, slot);
      slotOrder.push(slotKey);
    }

    if (slot.bundles.size < maxBundlesPerJob) {
      slot.bundles.add(deficit.bundle);
      slot.totalDeficit += deficit.deficit;
    }
  }

  return slotOrder.map((key) => {
    const slot = slots.get(key)!;
    const bundles = Array.from(slot.bundles);
    const countPerBundle = Math.max(1, Math.min(
      Math.ceil(slot.totalDeficit / bundles.length),
      Math.floor(MAX_SCENARIOS_PER_JOB / bundles.length),
    ));

    const request: GenerationJobRequest = {
      bundles,
      count: countPerBundle,
      mode: 'blitz',
      scopeTier: slot.scopeTier,
      scopeKey: slot.scopeKey,
      sourceKind: 'evergreen',
      priority: 'normal',
      distributionConfig: { mode: 'auto' },
      description: formatBlitzJobDescription(slot.scopeTier, slot.scopeKey, bundles),
    };

    if (slot.scopeTier === 'regional' && slot.region) {
      request.regions = [slot.region];
      request.region = slot.region;
    }

    if (slot.scopeTier === 'exclusive' && slot.country) {
      request.applicable_countries = [slot.country];
      request.exclusivityReason = 'unique_institution';
    }

    return request;
  });
}

export function fitJobsToScenarioBudget(
  jobs: GenerationJobRequest[],
  totalScenarios: number,
): GenerationJobRequest[] {
  if (jobs.length === 0 || totalScenarios <= 0) return [];

  let remaining = totalScenarios;
  const fitted: GenerationJobRequest[] = [];

  for (const job of jobs) {
    if (remaining <= 0) break;

    const bundleCount = job.bundles.length;
    if (bundleCount === 0) continue;

    const fullPasses = Math.min(job.count, Math.floor(remaining / bundleCount));
    if (fullPasses > 0) {
      fitted.push({
        ...job,
        count: fullPasses,
        description: formatBlitzJobDescription(job.scopeTier ?? 'universal', job.scopeKey ?? 'universal', job.bundles),
      });
      remaining -= fullPasses * bundleCount;
      continue;
    }

    const partialBundles = job.bundles.slice(0, remaining);
    if (partialBundles.length > 0) {
      fitted.push({
        ...job,
        bundles: partialBundles,
        count: 1,
        description: formatBlitzJobDescription(job.scopeTier ?? 'universal', job.scopeKey ?? 'universal', partialBundles),
      });
      remaining -= partialBundles.length;
    }
  }

  return fitted;
}

export function buildBlitzPlan(
  bundles: string[],
  regions: string[],
  countries: CountryEntry[],
  inventory: InventoryCell[],
  analysisTargetPerBundle: number,
  totalScenarios: number,
  availableSlots: number,
  maxJobsPerBlitz: number,
  options?: BlitzPlanningOptions,
): BlitzPreview {
  const allocation = allocateByRatio(totalScenarios);
  const deficits = calculateDeficits(bundles, regions, countries, inventory, analysisTargetPerBundle);
  const candidateJobs = groupDeficitsIntoJobs(deficits, availableSlots, maxJobsPerBlitz, options);
  const plannedJobs = fitJobsToScenarioBudget(candidateJobs, totalScenarios);

  const totalDeficit = deficits.reduce((sum, d) => sum + d.deficit, 0);
  const scenariosToGenerate = plannedJobs.reduce(
    (sum, job) => sum + job.bundles.length * job.count,
    0,
  );

  return {
    allocation,
    deficits,
    plannedJobs,
    summary: {
      totalRequested: totalScenarios,
      totalDeficit,
      jobsToCreate: plannedJobs.length,
      scenariosToGenerate,
      availableSlots,
    },
  };
}
