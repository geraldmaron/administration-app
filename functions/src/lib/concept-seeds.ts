import type { BundleId } from '../data/schemas/bundleIds';
import type { ScenarioScopeTier, ScenarioSourceKind } from '../types';

export interface ConceptSeed {
  bundle: BundleId;
  concept: string;
  theme: string;
  severity: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  primaryMetrics?: string[];
  secondaryMetrics?: string[];
  actorPattern?: 'domestic' | 'ally' | 'adversary' | 'border_rival' | 'legislature' | 'cabinet' | 'judiciary' | 'mixed';
  optionShape?: 'redistribute' | 'regulate' | 'escalate' | 'negotiate' | 'invest' | 'cut' | 'reform' | 'delay';
  loopEligible?: boolean;
  scopeTier?: ScenarioScopeTier;
  scopeKey?: string;
  sourceKind?: ScenarioSourceKind;
  active?: boolean;
  rank?: number;
}

interface SeedQuery {
  bundle: BundleId;
  scopeTier: ScenarioScopeTier;
  scopeKey: string;
  count: number;
}

function getFirestore(): FirebaseFirestore.Firestore {
  const admin = require('firebase-admin');
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  return admin.firestore();
}

function getSeedPriority(seed: ConceptSeed, query: SeedQuery): number {
  let priority = 0;
  const seedScopeTier = seed.scopeTier ?? 'universal';
  const seedScopeKey = seed.scopeKey ?? 'universal';

  if (seedScopeTier === query.scopeTier) priority += 20;
  if (seedScopeKey === query.scopeKey) priority += 20;
  if (seedScopeTier === 'universal') priority += 10;
  if (seedScopeKey === 'universal') priority += 10;
  priority += Math.max(0, 10 - (seed.rank ?? 10));

  return priority;
}

export function selectSeedConcepts(seeds: ConceptSeed[], query: SeedQuery): ConceptSeed[] {
  const eligible = seeds
    .filter((seed) => seed.active !== false)
    .sort((left, right) => {
      const priorityDiff = getSeedPriority(right, query) - getSeedPriority(left, query);
      if (priorityDiff !== 0) return priorityDiff;
      const rankDiff = (left.rank ?? 999) - (right.rank ?? 999);
      if (rankDiff !== 0) return rankDiff;
      return left.concept.localeCompare(right.concept);
    });

  const selected: ConceptSeed[] = [];
  const usedLanes = new Set<string>();

  const laneFor = (seed: ConceptSeed) => [
    seed.severity ?? 'unknown',
    seed.difficulty ?? 'unknown',
    seed.actorPattern ?? 'unknown',
    seed.optionShape ?? 'unknown',
    seed.theme ?? 'unknown',
    seed.primaryMetrics?.[0] ?? 'unknown',
  ].join('|');

  for (const seed of eligible) {
    if (selected.length >= query.count) break;
    const lane = laneFor(seed);
    if (usedLanes.has(lane)) continue;
    usedLanes.add(lane);
    selected.push(seed);
  }

  if (selected.length < query.count) {
    const usedThemes = new Set(selected.map((s) => s.theme ?? 'unknown'));
    for (const seed of eligible) {
      if (selected.length >= query.count) break;
      if (selected.includes(seed)) continue;
      const theme = seed.theme ?? 'unknown';
      if (!usedThemes.has(theme)) {
        usedThemes.add(theme);
        selected.push(seed);
      }
    }
  }

  for (const seed of eligible) {
    if (selected.length >= query.count) break;
    if (selected.includes(seed)) continue;
    selected.push(seed);
  }

  return selected;
}

export async function getSeedConcepts(query: SeedQuery): Promise<ConceptSeed[]> {
  try {
    const db = getFirestore();
    const snapshot = await db.collection('concept_seeds')
      .where('bundle', '==', query.bundle)
      .get();

    if (snapshot.empty) return [];

    const seeds = snapshot.docs.map((doc) => doc.data() as ConceptSeed);
    return selectSeedConcepts(seeds, query);
  } catch (error) {
    console.error('[ConceptSeeds] Failed to load concept seeds:', error);
    return [];
  }
}