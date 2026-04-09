import { allocateByRatio, buildBlitzPlan, calculateDeficits, fitJobsToScenarioBudget, groupDeficitsIntoJobs, type CountryEntry, type InventoryCell } from '../lib/blitz-planner';

const BUNDLES = ['economy', 'politics', 'military'];
const REGIONS = ['europe', 'caribbean'];
const COUNTRIES: CountryEntry[] = [
  { id: 'us', region: 'north_america', blitz_priority: 'high' },
  { id: 'gb', region: 'europe', blitz_priority: 'high' },
  { id: 'jm', region: 'caribbean', blitz_priority: 'low' },
];

const TARGET_PER_BUNDLE = 20;

describe('functions blitz planner', () => {
  test('allocates by canonical ratio', () => {
    const allocation = allocateByRatio(100);
    expect(allocation).toEqual({ universal: 20, regional: 25, cluster: 30, exclusive: 25 });
  });

  test('calculates deficits for empty inventory', () => {
    const deficits = calculateDeficits(BUNDLES, REGIONS, COUNTRIES, [], TARGET_PER_BUNDLE);
    expect(deficits.length).toBeGreaterThan(0);
    expect(deficits.some((entry) => entry.scopeTier === 'universal')).toBe(true);
  });

  test('groups same-scope deficits into shared jobs', () => {
    const deficits = calculateDeficits(BUNDLES, [], [], [], TARGET_PER_BUNDLE);
    const jobs = groupDeficitsIntoJobs(deficits, 10, 8);
    const universalJob = jobs.find((job) => job.scopeKey === 'universal');
    expect(universalJob).toBeDefined();
    expect(universalJob?.bundles.length).toBe(3);
  });

  test('limits bundles per blitz job for ollama runs', () => {
    const deficits = calculateDeficits(BUNDLES, [], [], [], TARGET_PER_BUNDLE);
    const jobs = groupDeficitsIntoJobs(deficits, 10, 8, {
      modelConfig: { drafterModel: 'ollama:phi4:14b' },
    });
    const universalJob = jobs.find((job) => job.scopeKey === 'universal');
    expect(universalJob).toBeDefined();
    expect(universalJob?.bundles.length).toBeLessThanOrEqual(2);
  });

  test('fits jobs to scenario budget', () => {
    const deficits = calculateDeficits(BUNDLES, REGIONS, COUNTRIES, [], TARGET_PER_BUNDLE);
    const jobs = groupDeficitsIntoJobs(deficits, 10, 8);
    const fitted = fitJobsToScenarioBudget(jobs, 12);
    const total = fitted.reduce((sum, job) => sum + job.bundles.length * job.count, 0);
    expect(total).toBeLessThanOrEqual(12);
  });

  test('builds complete blitz preview', () => {
    const inventory: InventoryCell[] = [];
    const plan = buildBlitzPlan(BUNDLES, REGIONS, COUNTRIES, inventory, TARGET_PER_BUNDLE, 24, 10, 8);
    expect(plan.summary.totalRequested).toBe(24);
    expect(plan.plannedJobs.length).toBeGreaterThan(0);
    expect(plan.summary.scenariosToGenerate).toBeLessThanOrEqual(24);
  });

  test('reallocates unsupported cluster share so requested output remains fully plannable', () => {
    const inventory: InventoryCell[] = [];
    const plan = buildBlitzPlan(BUNDLES, REGIONS, COUNTRIES, inventory, TARGET_PER_BUNDLE, 20, 10, 8);
    expect(plan.allocation.cluster).toBe(0);
    expect(plan.allocation.universal + plan.allocation.regional + plan.allocation.cluster + plan.allocation.exclusive).toBe(20);
    expect(plan.summary.scenariosToGenerate).toBe(20);
  });

  test('builds more smaller jobs for ollama runs', () => {
    const inventory: InventoryCell[] = [];
    const plan = buildBlitzPlan(BUNDLES, REGIONS, COUNTRIES, inventory, TARGET_PER_BUNDLE, 24, 10, 8, {
      modelConfig: { drafterModel: 'ollama:phi4:14b' },
    });
    expect(plan.plannedJobs.every((job) => job.bundles.length <= 2)).toBe(true);
  });
});
