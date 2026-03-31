import { describe, it, expect } from 'vitest';
import {
  allocateByRatio,
  calculateDeficits,
  groupDeficitsIntoJobs,
  fitJobsToScenarioBudget,
  buildBlitzPlan,
  SCOPE_TIER_RATIOS,
  type CountryEntry,
  type InventoryCell,
} from './blitz-planner';

const BUNDLES = ['economy', 'politics', 'military'];
const REGIONS = ['europe', 'caribbean'];
const COUNTRIES: CountryEntry[] = [
  { id: 'us', region: 'north_america', blitz_priority: 'high' },
  { id: 'gb', region: 'europe', blitz_priority: 'high' },
  { id: 'jm', region: 'caribbean', blitz_priority: 'low' },
];

const TARGET_PER_BUNDLE = 20;

describe('allocateByRatio', () => {
  it('distributes according to canonical scope tier ratios', () => {
    const alloc = allocateByRatio(100);
    expect(alloc.universal).toBe(40);
    expect(alloc.regional).toBe(25);
    expect(alloc.cluster).toBe(25);
    expect(alloc.exclusive).toBe(10);
  });

  it('sums to the requested total', () => {
    for (const total of [1, 7, 13, 24, 50, 99, 200]) {
      const alloc = allocateByRatio(total);
      const sum = alloc.universal + alloc.regional + alloc.cluster + alloc.exclusive;
      expect(sum).toBe(total);
    }
  });

  it('handles zero gracefully', () => {
    const alloc = allocateByRatio(0);
    expect(alloc.universal + alloc.regional + alloc.cluster + alloc.exclusive).toBe(0);
  });

  it('uses largest-remainder for fractional allocation', () => {
    const alloc = allocateByRatio(10);
    expect(alloc.universal).toBe(4);
    expect(alloc.regional + alloc.cluster).toBe(5);
    expect(alloc.exclusive).toBe(1);
    expect(alloc.universal + alloc.regional + alloc.cluster + alloc.exclusive).toBe(10);
  });

  it('preserves the 40/25/25/10 ratio for large totals', () => {
    const alloc = allocateByRatio(1000);
    expect(alloc.universal).toBe(400);
    expect(alloc.regional).toBe(250);
    expect(alloc.cluster).toBe(250);
    expect(alloc.exclusive).toBe(100);
  });
});

describe('calculateDeficits', () => {
  it('returns deficits for empty inventory', () => {
    const deficits = calculateDeficits(BUNDLES, REGIONS, COUNTRIES, [], TARGET_PER_BUNDLE);
    expect(deficits.length).toBeGreaterThan(0);

    const universalDeficits = deficits.filter((d) => d.scopeTier === 'universal');
    expect(universalDeficits).toHaveLength(3);
    const alloc = allocateByRatio(TARGET_PER_BUNDLE);
    for (const d of universalDeficits) {
      expect(d.current).toBe(0);
      expect(d.target).toBe(alloc.universal);
      expect(d.deficit).toBe(alloc.universal);
    }
  });

  it('returns no deficits when inventory meets ratio targets', () => {
    const alloc = allocateByRatio(TARGET_PER_BUNDLE);
    const inventory: InventoryCell[] = [];
    for (const bundle of BUNDLES) {
      inventory.push({ bundle, scopeTier: 'universal', scopeKey: 'universal', count: alloc.universal });
      for (const region of REGIONS) {
        inventory.push({ bundle, scopeTier: 'regional', scopeKey: `region:${region}`, count: Math.ceil(alloc.regional / REGIONS.length) });
      }
    }

    const deficits = calculateDeficits(BUNDLES, REGIONS, [], inventory, TARGET_PER_BUNDLE);
    const nonExclusive = deficits.filter((d) => d.scopeTier !== 'exclusive');
    expect(nonExclusive).toHaveLength(0);
  });

  it('applies urgency boost when below 50% of target', () => {
    const alloc = allocateByRatio(TARGET_PER_BUNDLE);
    const inventory: InventoryCell[] = [
      { bundle: 'economy', scopeTier: 'universal', scopeKey: 'universal', count: Math.floor(alloc.universal * 0.3) },
      { bundle: 'politics', scopeTier: 'universal', scopeKey: 'universal', count: Math.floor(alloc.universal * 0.7) },
    ];

    const deficits = calculateDeficits(['economy', 'politics'], [], [], inventory, TARGET_PER_BUNDLE);
    const economy = deficits.find((d) => d.bundle === 'economy' && d.scopeTier === 'universal')!;
    const politics = deficits.find((d) => d.bundle === 'politics' && d.scopeTier === 'universal')!;

    expect(economy.score).toBeGreaterThan(politics.score);
  });

  it('applies priority weight for exclusive deficits', () => {
    const highCountry: CountryEntry = { id: 'us', region: 'north_america', blitz_priority: 'high' };
    const lowCountry: CountryEntry = { id: 'jm', region: 'caribbean', blitz_priority: 'low' };

    const deficits = calculateDeficits(['economy'], [], [highCountry, lowCountry], [], TARGET_PER_BUNDLE);
    const us = deficits.find((d) => d.country === 'us');
    const jm = deficits.find((d) => d.country === 'jm');

    if (us && jm) {
      expect(us.score).toBeGreaterThan(jm.score);
    }
  });

  it('sorts deficits by score descending', () => {
    const deficits = calculateDeficits(BUNDLES, REGIONS, COUNTRIES, [], TARGET_PER_BUNDLE);
    for (let i = 1; i < deficits.length; i++) {
      expect(deficits[i - 1].score).toBeGreaterThanOrEqual(deficits[i].score);
    }
  });

  it('regional targets distribute evenly across regions', () => {
    const deficits = calculateDeficits(['economy'], REGIONS, [], [], TARGET_PER_BUNDLE);
    const regionalDeficits = deficits.filter((d) => d.scopeTier === 'regional');
    const alloc = allocateByRatio(TARGET_PER_BUNDLE);
    const totalRegionalTarget = regionalDeficits.reduce((s, d) => s + d.target, 0);
    expect(totalRegionalTarget).toBe(alloc.regional);
  });
});

describe('groupDeficitsIntoJobs', () => {
  it('returns empty array when no deficits', () => {
    const jobs = groupDeficitsIntoJobs([], 10, 8);
    expect(jobs).toHaveLength(0);
  });

  it('returns empty array when no available slots', () => {
    const deficits = calculateDeficits(BUNDLES, REGIONS, COUNTRIES, [], TARGET_PER_BUNDLE);
    const jobs = groupDeficitsIntoJobs(deficits, 0, 8);
    expect(jobs).toHaveLength(0);
  });

  it('groups bundles sharing the same scope into one job', () => {
    const deficits = calculateDeficits(BUNDLES, [], [], [], TARGET_PER_BUNDLE);
    const jobs = groupDeficitsIntoJobs(deficits, 10, 8);

    const universalJob = jobs.find((j) => j.scopeKey === 'universal');
    expect(universalJob).toBeDefined();
    expect(universalJob!.bundles.length).toBe(3);
  });

  it('respects max 5 bundles per job', () => {
    const manyBundles = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    const deficits = calculateDeficits(manyBundles, [], [], [], TARGET_PER_BUNDLE);
    const jobs = groupDeficitsIntoJobs(deficits, 10, 8);

    for (const job of jobs) {
      expect(job.bundles.length).toBeLessThanOrEqual(5);
    }
  });

  it('respects max jobs limit', () => {
    const deficits = calculateDeficits(BUNDLES, REGIONS, COUNTRIES, [], TARGET_PER_BUNDLE);
    const jobs = groupDeficitsIntoJobs(deficits, 10, 2);
    expect(jobs.length).toBeLessThanOrEqual(2);
  });

  it('sets correct scope fields on regional jobs', () => {
    const deficits = calculateDeficits(['economy'], ['europe'], [], [], TARGET_PER_BUNDLE);
    const jobs = groupDeficitsIntoJobs(deficits, 10, 8);

    const regionalJob = jobs.find((j) => j.scopeTier === 'regional');
    expect(regionalJob).toBeDefined();
    expect(regionalJob!.regions).toEqual(['europe']);
    expect(regionalJob!.region).toBe('europe');
  });

  it('sets correct scope fields on exclusive jobs', () => {
    const countries: CountryEntry[] = [{ id: 'us', region: 'north_america', blitz_priority: 'high' }];
    const deficits = calculateDeficits(['economy'], [], countries, [], TARGET_PER_BUNDLE);
    const jobs = groupDeficitsIntoJobs(deficits, 10, 8);

    const exclusiveJob = jobs.find((j) => j.scopeTier === 'exclusive');
    if (exclusiveJob) {
      expect(exclusiveJob.applicable_countries).toEqual(['us']);
      expect(exclusiveJob.exclusivityReason).toBe('unique_institution');
    }
  });

  it('sets mode to blitz on all jobs', () => {
    const deficits = calculateDeficits(BUNDLES, REGIONS, COUNTRIES, [], TARGET_PER_BUNDLE);
    const jobs = groupDeficitsIntoJobs(deficits, 10, 8);
    for (const job of jobs) {
      expect(job.mode).toBe('blitz');
    }
  });

  it('derives count per bundle from deficit magnitude', () => {
    const deficits = calculateDeficits(BUNDLES, [], [], [], TARGET_PER_BUNDLE);
    const jobs = groupDeficitsIntoJobs(deficits, 10, 8);
    for (const job of jobs) {
      expect(job.count).toBeGreaterThanOrEqual(1);
      expect(job.count * job.bundles.length).toBeLessThanOrEqual(50);
    }
  });
});

describe('buildBlitzPlan', () => {
  it('returns a complete plan with allocation and summary', () => {
    const requestedTotal = 24;
    const plan = buildBlitzPlan(BUNDLES, REGIONS, COUNTRIES, [], TARGET_PER_BUNDLE, requestedTotal, 10, 8);

    expect(plan.allocation).toBeDefined();
    expect(plan.allocation.universal + plan.allocation.regional + plan.allocation.cluster + plan.allocation.exclusive).toBe(requestedTotal);
    expect(plan.deficits.length).toBeGreaterThan(0);
    expect(plan.plannedJobs.length).toBeGreaterThan(0);
    expect(plan.summary.totalRequested).toBe(requestedTotal);
    expect(plan.summary.totalDeficit).toBeGreaterThan(0);
    expect(plan.summary.jobsToCreate).toBe(plan.plannedJobs.length);
    expect(plan.summary.availableSlots).toBe(10);
    expect(plan.summary.scenariosToGenerate).toBeLessThanOrEqual(requestedTotal);
  });

  it('returns empty jobs when inventory is full', () => {
    const alloc = allocateByRatio(TARGET_PER_BUNDLE);
    const inventory: InventoryCell[] = [];
    for (const bundle of BUNDLES) {
      inventory.push({ bundle, scopeTier: 'universal', scopeKey: 'universal', count: alloc.universal });
      for (const region of REGIONS) {
        inventory.push({ bundle, scopeTier: 'regional', scopeKey: `region:${region}`, count: alloc.regional });
      }
      for (const country of COUNTRIES) {
        inventory.push({ bundle, scopeTier: 'exclusive', scopeKey: `country:${country.id}`, count: 100 });
      }
    }

    const plan = buildBlitzPlan(BUNDLES, REGIONS, COUNTRIES, inventory, TARGET_PER_BUNDLE, 24, 10, 8);
    expect(plan.deficits).toHaveLength(0);
    expect(plan.plannedJobs).toHaveLength(0);
    expect(plan.summary.totalDeficit).toBe(0);
  });

  it('respects different target counts', () => {
    const small = buildBlitzPlan(BUNDLES, REGIONS, COUNTRIES, [], TARGET_PER_BUNDLE, 10, 10, 8);
    const large = buildBlitzPlan(BUNDLES, REGIONS, COUNTRIES, [], TARGET_PER_BUNDLE, 100, 10, 8);

    expect(large.summary.totalDeficit).toBe(small.summary.totalDeficit);
    expect(large.allocation.universal).toBeGreaterThan(small.allocation.universal);
    expect(large.summary.scenariosToGenerate).toBeGreaterThanOrEqual(small.summary.scenariosToGenerate);
  });
});

describe('fitJobsToScenarioBudget', () => {
  it('caps planned output to the requested total', () => {
    const deficits = calculateDeficits(BUNDLES, REGIONS, COUNTRIES, [], TARGET_PER_BUNDLE);
    const jobs = groupDeficitsIntoJobs(deficits, 10, 8);
    const fitted = fitJobsToScenarioBudget(jobs, 11);

    const total = fitted.reduce((sum, job) => sum + (job.bundles.length * job.count), 0);
    expect(total).toBe(11);
  });

  it('keeps higher-priority bundles when a partial final job is required', () => {
    const jobs = [
      {
        bundles: ['economy', 'politics', 'military'],
        count: 2,
        mode: 'blitz' as const,
        scopeTier: 'universal' as const,
        scopeKey: 'universal',
        sourceKind: 'evergreen' as const,
        priority: 'normal' as const,
        distributionConfig: { mode: 'auto' as const },
      },
    ];

    const fitted = fitJobsToScenarioBudget(jobs, 2);
    expect(fitted).toHaveLength(1);
    expect(fitted[0].bundles).toEqual(['economy', 'politics']);
    expect(fitted[0].count).toBe(1);
  });
});
