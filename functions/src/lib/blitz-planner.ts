import type { GenerationScopeFields, ScenarioExclusivityReason, ScenarioScopeTier, ScenarioSourceKind } from '../shared/generation-contract';
import type { GenerationJobRecord } from '../shared/generation-job';
import type { GenerationModelConfig } from '../shared/generation-contract';
import { getMaxBundlesPerJob } from './generation-models';

export type BlitzPriority = 'high' | 'medium' | 'low';

export const SCOPE_TIER_RATIOS: Record<ScenarioScopeTier, number> = {
  universal: 0.20,
  regional: 0.25,
  cluster: 0.30,
  exclusive: 0.25,
};

/**
 * Relative generation weight per scenario bundle domain.
 *
 * Values are multipliers against the base `totalPerBundle` target (1.0 = baseline).
 * Weights are calibrated to reflect the approximate frequency with which real heads
 * of state face decisions in each domain, based on political science research on
 * government priority allocation and cabinet meeting agendas:
 *
 * - Economy dominates leadership time (~30% of a leader's week)
 * - Politics/governance and social policy are near-constant
 * - Military and diplomacy are significant but episodic
 * - Culture, authoritarian, and tech scenarios should be sparse to avoid tonal fatigue
 *
 * Bundles absent from this map default to 1.0. The planner normalises nothing —
 * absolute inventory targets per bundle will differ proportionally.
 */
export const BUNDLE_DOMAIN_WEIGHTS: Record<string, number> = {
  economy:       1.8,  // Budget, trade, inflation, recession — the dominant leadership domain
  politics:      1.5,  // Elections, constitutional crises, legislative conflict
  social:        1.3,  // Inequality, welfare, education, housing
  diplomacy:     1.2,  // Alliances, sanctions, summits, foreign crises
  military:      1.1,  // Defence policy, deployments, arms, coups
  health:        1.0,  // Healthcare reform, pandemics, system collapse
  environment:   0.9,  // Climate, pollution, natural disasters
  infrastructure:0.9,  // Roads, energy grid, utilities, comms
  justice:       0.85, // Rule of law, judicial appointments, crime
  corruption:    0.8,  // Scandals, graft, institutional capture
  resources:     0.75, // Oil, water, minerals, energy exports
  tech:          0.7,  // AI, cybersecurity, digital policy
  culture:       0.5,  // Media, identity politics, cultural conflicts — episodic
  authoritarian: 0.4,  // Edge-case/dark options — intentionally sparse
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

export interface BlitzPlanRequest extends Pick<GenerationJobRecord<string>, 'bundles' | 'count' | 'priority' | 'distributionConfig' | 'modelConfig' | 'dryRun' | 'executionTarget'>, GenerationScopeFields {
  mode?: 'blitz' | 'full_send';
  sourceKind?: ScenarioSourceKind;
  exclusivityReason?: ScenarioExclusivityReason;
  description?: string;
}

export interface BlitzPreview {
  allocation: TierAllocation;
  deficits: DeficitCell[];
  plannedJobs: BlitzPlanRequest[];
  summary: {
    totalRequested: number;
    totalDeficit: number;
    jobsToCreate: number;
    scenariosToGenerate: number;
    availableSlots: number;
  };
}

interface BlitzPlanningOptions {
  modelConfig?: GenerationModelConfig;
}

function emptyAllocation(): TierAllocation {
  return { universal: 0, regional: 0, cluster: 0, exclusive: 0 };
}

function getPlannableTiers(regions: string[], countries: CountryEntry[]): ScenarioScopeTier[] {
  const tiers: ScenarioScopeTier[] = ['universal'];
  if (regions.length > 0) {
    tiers.push('regional');
  }
  if (countries.length > 0) {
    tiers.push('exclusive');
  }
  return tiers;
}

function allocateAcrossPlannableTiers(total: number, tiers: ScenarioScopeTier[]): TierAllocation {
  if (total <= 0 || tiers.length === 0) {
    return emptyAllocation();
  }

  const allocation = emptyAllocation();
  const totalWeight = tiers.reduce((sum, tier) => sum + SCOPE_TIER_RATIOS[tier], 0);
  if (totalWeight <= 0) {
    return allocation;
  }

  let assigned = 0;
  const remainders = tiers
    .map((tier) => {
      const raw = total * (SCOPE_TIER_RATIOS[tier] / totalWeight);
      const rounded = Math.floor(raw);
      allocation[tier] = rounded;
      assigned += rounded;
      return { tier, remainder: raw - rounded };
    })
    .sort((a, b) => b.remainder - a.remainder);

  let remaining = total - assigned;
  for (const entry of remainders) {
    if (remaining <= 0) break;
    allocation[entry.tier] += 1;
    remaining -= 1;
  }

  return allocation;
}

function formatBlitzJobDescription(scopeTier: ScenarioScopeTier, scopeKey: string, bundles: string[]): string {
  return `Blitz: ${scopeTier} ${scopeKey} [${bundles.join(', ')}]`;
}

export function allocateByRatio(total: number): TierAllocation {
  if (total <= 0) return { universal: 0, regional: 0, cluster: 0, exclusive: 0 };

  const base: Partial<Record<ScenarioScopeTier, number>> = {};
  let assigned = 0;
  for (const tier of SCOPE_TIERS) {
    const rounded = Math.floor(total * SCOPE_TIER_RATIOS[tier]);
    base[tier] = rounded;
    assigned += rounded;
  }

  const remainders = SCOPE_TIERS
    .map((tier) => ({ tier, remainder: (total * SCOPE_TIER_RATIOS[tier]) - (base[tier] ?? 0) }))
    .sort((a, b) => b.remainder - a.remainder);

  let remaining = total - assigned;
  for (const entry of remainders) {
    if (remaining <= 0) break;
    base[entry.tier] = (base[entry.tier] ?? 0) + 1;
    remaining -= 1;
  }

  return base as TierAllocation;
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
  const allocation = allocateAcrossPlannableTiers(totalPerBundle, getPlannableTiers(regions, countries));
  const lookup = new Map<string, number>();
  for (const cell of inventory) {
    lookup.set(`${cell.bundle}|${cell.scopeTier}|${cell.scopeKey}`, cell.count);
  }

  const current = (bundle: string, scopeTier: ScenarioScopeTier, scopeKey: string): number => {
    return lookup.get(`${bundle}|${scopeTier}|${scopeKey}`) ?? 0;
  };

  const deficits: DeficitCell[] = [];
  const regionalTargets = distributeEvenly(allocation.regional, regions.length);
  const highCountries = countries.filter((country) => country.blitz_priority === 'high');
  const mediumCountries = countries.filter((country) => country.blitz_priority === 'medium');
  const lowCountries = countries.filter((country) => country.blitz_priority === 'low');
  const totalPriorityWeight =
    highCountries.length * PRIORITY_WEIGHTS.high +
    mediumCountries.length * PRIORITY_WEIGHTS.medium +
    lowCountries.length * PRIORITY_WEIGHTS.low;

  function exclusiveTargetForCountry(priority: BlitzPriority, bundleWeight: number): number {
    if (totalPriorityWeight === 0 || allocation.exclusive === 0) return 0;
    const share = PRIORITY_WEIGHTS[priority] / totalPriorityWeight;
    const countForTier = priority === 'high' ? highCountries.length : priority === 'medium' ? mediumCountries.length : lowCountries.length;
    if (countForTier === 0) return 0;
    const tierTotal = Math.round(allocation.exclusive * share * countForTier * bundleWeight);
    return Math.max(1, Math.round(tierTotal / countForTier));
  }

  for (const bundle of bundles) {
    const bundleWeight = BUNDLE_DOMAIN_WEIGHTS[bundle] ?? 1.0;

    const universalCurrent = current(bundle, 'universal', 'universal');
    const universalTarget = Math.max(1, Math.round(allocation.universal * bundleWeight));
    const universalDeficit = Math.max(0, universalTarget - universalCurrent);
    if (universalDeficit > 0) {
      const urgency = universalCurrent < universalTarget * 0.5 ? 2 : 1;
      deficits.push({ bundle, scopeTier: 'universal', scopeKey: 'universal', current: universalCurrent, target: universalTarget, deficit: universalDeficit, score: universalDeficit * SCOPE_TIER_RATIOS.universal * urgency });
    }

    regions.forEach((region, index) => {
      const scopeKey = `region:${region}`;
      const regionalCurrent = current(bundle, 'regional', scopeKey);
      const regionalTarget = Math.max(1, Math.round((regionalTargets[index] ?? 0) * bundleWeight));
      const regionalDeficit = Math.max(0, regionalTarget - regionalCurrent);
      if (regionalDeficit > 0) {
        const urgency = regionalCurrent < regionalTarget * 0.5 ? 2 : 1;
        deficits.push({ bundle, scopeTier: 'regional', scopeKey, region, current: regionalCurrent, target: regionalTarget, deficit: regionalDeficit, score: regionalDeficit * SCOPE_TIER_RATIOS.regional * urgency });
      }
    });

    for (const country of countries) {
      const scopeKey = `country:${country.id}`;
      const exclusiveCurrent = current(bundle, 'exclusive', scopeKey);
      const exclusiveTarget = exclusiveTargetForCountry(country.blitz_priority, bundleWeight);
      const exclusiveDeficit = Math.max(0, exclusiveTarget - exclusiveCurrent);
      if (exclusiveDeficit > 0) {
        const urgency = exclusiveCurrent < exclusiveTarget * 0.5 ? 2 : 1;
        deficits.push({ bundle, scopeTier: 'exclusive', scopeKey, country: country.id, current: exclusiveCurrent, target: exclusiveTarget, deficit: exclusiveDeficit, score: exclusiveDeficit * SCOPE_TIER_RATIOS.exclusive * PRIORITY_WEIGHTS[country.blitz_priority] * urgency });
      }
    }
  }

  deficits.sort((left, right) => right.score - left.score);
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

export function groupDeficitsIntoJobs(
  deficits: DeficitCell[],
  availableSlots: number,
  maxJobsPerBlitz: number,
  options?: BlitzPlanningOptions,
): BlitzPlanRequest[] {
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
      slot = { scopeTier: deficit.scopeTier, scopeKey: deficit.scopeKey, region: deficit.region, country: deficit.country, bundles: new Set(), totalDeficit: 0 };
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
    const count = Math.max(1, Math.min(Math.ceil(slot.totalDeficit / bundles.length), Math.floor(MAX_SCENARIOS_PER_JOB / bundles.length)));
    const request: BlitzPlanRequest = {
      bundles,
      count,
      mode: 'blitz',
      scopeTier: slot.scopeTier,
      scopeKey: slot.scopeKey,
      sourceKind: 'evergreen',
      priority: 'normal',
      distributionConfig: { mode: 'auto' },
      description: formatBlitzJobDescription(slot.scopeTier, slot.scopeKey, bundles),
    };

    if (slot.scopeTier === 'regional' && slot.region) {
      request.region = slot.region;
      request.regions = [slot.region];
    }

    if (slot.scopeTier === 'exclusive' && slot.country) {
      request.applicable_countries = [slot.country];
      request.exclusivityReason = 'unique_institution';
    }

    return request;
  });
}

export function fitJobsToScenarioBudget(jobs: BlitzPlanRequest[], totalScenarios: number): BlitzPlanRequest[] {
  if (jobs.length === 0 || totalScenarios <= 0) return [];

  let remaining = totalScenarios;
  const fitted: BlitzPlanRequest[] = [];
  for (const job of jobs) {
    if (remaining <= 0) break;
    const bundleCount = job.bundles.length;
    if (bundleCount === 0) continue;

    const fullPasses = Math.min(job.count, Math.floor(remaining / bundleCount));
    if (fullPasses > 0) {
      fitted.push({ ...job, count: fullPasses, description: formatBlitzJobDescription(job.scopeTier ?? 'universal', job.scopeKey ?? 'universal', job.bundles) });
      remaining -= fullPasses * bundleCount;
      continue;
    }

    const partialBundles = job.bundles.slice(0, remaining);
    if (partialBundles.length > 0) {
      fitted.push({ ...job, bundles: partialBundles, count: 1, description: formatBlitzJobDescription(job.scopeTier ?? 'universal', job.scopeKey ?? 'universal', partialBundles) });
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
  const allocation = allocateAcrossPlannableTiers(totalScenarios, getPlannableTiers(regions, countries));
  const deficits = calculateDeficits(bundles, regions, countries, inventory, analysisTargetPerBundle);
  const candidateJobs = groupDeficitsIntoJobs(deficits, availableSlots, maxJobsPerBlitz, options);
  const plannedJobs = fitJobsToScenarioBudget(candidateJobs, totalScenarios);
  const totalDeficit = deficits.reduce((sum, deficit) => sum + deficit.deficit, 0);
  const scenariosToGenerate = plannedJobs.reduce((sum, job) => sum + job.bundles.length * job.count, 0);

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
