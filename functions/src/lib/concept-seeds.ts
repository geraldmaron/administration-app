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

/**
 * Compute a fingerprint for a concept to detect duplicates.
 * Format: "bundle|theme|primaryMetric|actorPattern"
 */
export function computeConceptFingerprint(concept: ConceptSeed): string {
  return [
    concept.bundle,
    (concept.theme || 'unknown').toLowerCase().trim(),
    (concept.primaryMetrics?.[0] || 'unknown').toLowerCase().trim(),
    concept.actorPattern || 'unknown',
  ].join('|');
}

/**
 * Get recent concept fingerprints for a bundle (last N days).
 * Used to detect and skip duplicate concepts.
 */
export async function getRecentConceptFingerprints(
  bundle: BundleId,
  days: number = 7
): Promise<Set<string>> {
  try {
    const db = getFirestore();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const snapshot = await db.collection('concept_seeds')
      .where('bundle', '==', bundle)
      .where('persistedAt', '>=', cutoff)
      .get();

    const fingerprints = new Set<string>();
    for (const doc of snapshot.docs) {
      const data = doc.data() as ConceptSeed & { fingerprint?: string };
      if (data.fingerprint) {
        fingerprints.add(data.fingerprint);
      } else {
        fingerprints.add(computeConceptFingerprint(data));
      }
    }
    return fingerprints;
  } catch (error) {
    console.error('[ConceptSeeds] Failed to load recent fingerprints:', error);
    return new Set();
  }
}

/**
 * Persist a concept that successfully produced a passing scenario.
 * Builds the concept seed library over time for fallback use.
 */
export async function persistAcceptedConcept(
  concept: ConceptSeed,
  bundle: BundleId
): Promise<void> {
  try {
    const db = getFirestore();
    const fingerprint = computeConceptFingerprint(concept);

    const existing = await db.collection('concept_seeds')
      .where('bundle', '==', bundle)
      .where('fingerprint', '==', fingerprint)
      .limit(1)
      .get();

    if (!existing.empty) return;

    await db.collection('concept_seeds').add({
      ...concept,
      bundle,
      fingerprint,
      active: true,
      persistedAt: new Date(),
    });
    console.log(`[ConceptSeeds] Persisted accepted concept: ${concept.theme || concept.concept?.slice(0, 40)}`);
  } catch (error) {
    console.warn('[ConceptSeeds] Failed to persist concept (non-fatal):', error);
  }
}

/**
 * Check concepts for diversity and deduplicate against recent concepts.
 * Returns the filtered list with duplicates replaced by seed fallbacks where available.
 */
export async function deduplicateAndDiversifyConcepts(
  concepts: ConceptSeed[],
  bundle: BundleId,
  scopeTier: ScenarioScopeTier,
  scopeKey: string
): Promise<ConceptSeed[]> {
  if (concepts.length === 0) return concepts;

  const recentFingerprints = await getRecentConceptFingerprints(bundle, 7);
  const seeds = await getSeedConcepts({ bundle, scopeTier, scopeKey, count: concepts.length * 2 });

  const result: ConceptSeed[] = [];
  const usedFingerprints = new Set<string>();
  const usedThemes = new Set<string>();
  const usedActorPatterns = new Set<string>();
  let seedIdx = 0;

  for (const concept of concepts) {
    const fp = computeConceptFingerprint(concept);
    const theme = (concept.theme || 'unknown').toLowerCase();

    if (recentFingerprints.has(fp) || usedFingerprints.has(fp)) {
      let replaced = false;
      while (seedIdx < seeds.length) {
        const seed = seeds[seedIdx++];
        const seedFp = computeConceptFingerprint(seed);
        if (!recentFingerprints.has(seedFp) && !usedFingerprints.has(seedFp)) {
          result.push(seed);
          usedFingerprints.add(seedFp);
          usedThemes.add((seed.theme || 'unknown').toLowerCase());
          usedActorPatterns.add(seed.actorPattern || 'unknown');
          replaced = true;
          console.log(`[ConceptSeeds] Replaced duplicate concept "${theme}" with seed "${seed.theme}"`);
          break;
        }
      }
      if (!replaced) {
        result.push(concept);
        usedFingerprints.add(fp);
        usedThemes.add(theme);
        usedActorPatterns.add(concept.actorPattern || 'unknown');
      }
    } else {
      result.push(concept);
      usedFingerprints.add(fp);
      usedThemes.add(theme);
      usedActorPatterns.add(concept.actorPattern || 'unknown');
    }
  }

  if (result.length >= 3 && usedThemes.size < 3) {
    console.warn(`[ConceptSeeds] Low theme diversity: only ${usedThemes.size} distinct themes across ${result.length} concepts`);
  }
  if (result.length >= 3 && usedActorPatterns.size < 2) {
    console.warn(`[ConceptSeeds] Low actor pattern diversity: only ${usedActorPatterns.size} patterns across ${result.length} concepts`);
  }

  return result;
}