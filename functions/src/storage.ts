/**
 * Storage module: scenario persistence, similarity checks, and theme-based visibility.
 * Saves scenarios to Firestore and optional Cloud Storage JSON; applies conditions for
 * bailout/fiscal themes so they only show when budget/economy are low.
 */
import * as admin from 'firebase-admin';
import { Scenario } from './types';
import type { CountryWorldState } from './types';
import type { WorldEvent } from './lib/world-simulation';
import * as crypto from 'crypto';
import { type BundleId } from './data/schemas/bundleIds';
import type { NormalizedGenerationScope, ScenarioScopeTier, ScenarioSourceKind } from './shared/generation-contract';
import {
    generateEmbedding,
    getEmbeddingText,
    saveEmbedding,
    isSemanticDedupEnabled
} from './lib/semantic-dedup';
import { buildBestEffortMetricGates } from './lib/scenario-conditions';

// Ensure Firebase Admin is initialized
if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID || 'the-administration-3a072';
    console.log(`[Storage] Initializing Firebase Admin for project: ${projectId}`);
    admin.initializeApp({
        projectId: projectId,
        storageBucket: `${projectId}.firebasestorage.app`
    });
}

const db = admin.firestore();

function stripUndefined<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

function applyThemeConditions(scenario: Scenario): Scenario {
    const metricGates = buildBestEffortMetricGates({
        existingConditions: scenario.applicability?.metricGates,
        title: scenario.title,
        description: scenario.description,
        tags: scenario.metadata?.tags,
        requires: scenario.applicability?.requires,
    });
    return {
        ...scenario,
        applicability: {
            ...scenario.applicability,
            metricGates,
        },
    };
}

// ============================================================================
// IN-MEMORY CACHE FOR SIMILARITY CHECKS
// ============================================================================

interface CachedScenario {
    id: string;
    title: string;
    description: string;
    bundle: string;
    scopeTier?: ScenarioScopeTier;
    scopeKey?: string;
    sourceKind?: ScenarioSourceKind;
    regionTags?: string[];
    theme?: string;
    timestamp: number;
}

export interface ScenarioInventoryScopeFilter extends Pick<NormalizedGenerationScope, 'scopeTier' | 'scopeKey' | 'sourceKind'> {}

export interface ScenarioInventoryCounts {
    total: number;
    byScopeTier: Partial<Record<ScenarioScopeTier, number>>;
    bySourceKind: Partial<Record<ScenarioSourceKind, number>>;
}

interface BundleCache {
    scenarios: CachedScenario[];
    lastFetch: number;
    ttl: number; // Time to live in milliseconds
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const scenarioCache: Map<string, BundleCache> = new Map();

/**
 * Get cached scenarios for a bundle or fetch from Firestore if cache is stale
 * Reduces Firestore reads from ~100 to ~20 per bundle per 5 minutes
 */
async function getCachedScenariosForBundle(bundle: string): Promise<CachedScenario[]> {
    const now = Date.now();
    const cached = scenarioCache.get(bundle);

    // Return cached data if fresh
    if (cached && (now - cached.lastFetch) < cached.ttl) {
        console.log(`[Cache HIT] Using cached scenarios for bundle: ${bundle} (${cached.scenarios.length} scenarios)`);
        return cached.scenarios;
    }

    // Cache miss or stale - fetch from Firestore
    console.log(`[Cache MISS] Fetching scenarios for bundle: ${bundle}`);

    // Optimized query: only fetch minimal fields needed for similarity check
    // Reduces data transfer and processing time
    const recentScenarios = await db.collection('scenarios')
        .where('metadata.bundle', '==', bundle)
        .where('is_active', '==', true)
        .orderBy('created_at', 'desc')
        .limit(50) // Reduced from 100 to 50 for better performance
        .select('title', 'description', 'metadata.bundle', 'metadata.scopeTier', 'metadata.scopeKey', 'metadata.sourceKind', 'metadata.region_tags', 'metadata.theme')
        .get();

    const scenarios: CachedScenario[] = recentScenarios.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title || '',
        description: doc.data().description || '',
        bundle: doc.data().metadata?.bundle || bundle,
        scopeTier: doc.data().metadata?.scopeTier,
        scopeKey: doc.data().metadata?.scopeKey,
        sourceKind: doc.data().metadata?.sourceKind,
        regionTags: Array.isArray(doc.data().metadata?.region_tags) ? doc.data().metadata.region_tags : undefined,
        theme: doc.data().metadata?.theme,
        timestamp: now
    }));

    // Update cache
    scenarioCache.set(bundle, {
        scenarios,
        lastFetch: now,
        ttl: CACHE_TTL
    });

    console.log(`[Cache UPDATE] Stored ${scenarios.length} scenarios for bundle: ${bundle}`);
    return scenarios;
}

/**
 * Clear cache for a specific bundle (call after saving new scenario)
 */
function invalidateBundleCache(bundle: string): void {
    scenarioCache.delete(bundle);
    console.log(`[Cache INVALIDATE] Cleared cache for bundle: ${bundle}`);
}

/**
 * Returns the titles of the most recently generated active scenarios for a bundle.
 * Reuses the existing 5-minute in-memory cache — no extra Firestore reads.
 */
export async function getRecentScenarioTitles(bundle: string, limit = 30): Promise<string[]> {
    const scenarios = await getCachedScenariosForBundle(bundle);
    return scenarios
        .slice(0, limit)
        .map((s) => s.title)
        .filter(Boolean);
}

function matchesScopeFilter(scenario: CachedScenario, scope?: ScenarioInventoryScopeFilter): boolean {
    if (!scope) return true;
    if (scope.scopeTier && scenario.scopeTier !== scope.scopeTier) return false;
    if (scope.scopeKey && scenario.scopeKey !== scope.scopeKey) return false;
    if (scope.sourceKind && scenario.sourceKind !== scope.sourceKind) return false;
    return true;
}

export async function getRecentScenarioSummaries(
    bundle: string,
    limit = 30,
    scope?: ScenarioInventoryScopeFilter
): Promise<Array<{ title: string; description: string }>> {
    const scenarios = await getCachedScenariosForBundle(bundle);
    return scenarios
        .filter((scenario) => matchesScopeFilter(scenario, scope))
        .slice(0, limit)
        .filter((s) => s.title)
        .map((s) => ({ title: s.title, description: (s.description || '').substring(0, 80) }));
}

/**
 * Returns a frequency map of themes used by active scenarios in a bundle.
 * Used to identify underrepresented themes for the architect prompt.
 */
export async function getThemeDistribution(bundle: string, scope?: ScenarioInventoryScopeFilter): Promise<Map<string, number>> {
    const snapshot = await db
        .collection('scenarios')
        .where('metadata.bundle', '==', bundle)
        .where('is_active', '==', true)
        .orderBy('created_at', 'desc')
        .limit(100)
        .select('metadata.theme', 'metadata.scopeTier', 'metadata.scopeKey', 'metadata.sourceKind')
        .get();

    const counts = new Map<string, number>();
    for (const doc of snapshot.docs) {
        const metadata = doc.data()?.metadata;
        if (!matchesScopeFilter({
            id: doc.id,
            title: '',
            description: '',
            bundle,
            scopeTier: metadata?.scopeTier,
            scopeKey: metadata?.scopeKey,
            sourceKind: metadata?.sourceKind,
            timestamp: 0,
        }, scope)) {
            continue;
        }
        const theme: string | undefined = doc.data()?.metadata?.theme;
        if (theme) {
            counts.set(theme, (counts.get(theme) ?? 0) + 1);
        }
    }
    return counts;
}

export async function getActiveBundleCountByScope(
    bundle: BundleId,
    db: admin.firestore.Firestore,
    scope?: ScenarioInventoryScopeFilter
): Promise<number> {
    if (!scope) {
        return getActiveBundleCount(bundle, db);
    }

    let query: admin.firestore.Query = db
        .collection('scenarios')
        .where('metadata.bundle', '==', bundle)
        .where('is_active', '==', true);
    if (scope.scopeTier) query = query.where('metadata.scopeTier', '==', scope.scopeTier);
    if (scope.scopeKey) query = query.where('metadata.scopeKey', '==', scope.scopeKey);
    if (scope.sourceKind) query = query.where('metadata.sourceKind', '==', scope.sourceKind);

    const snap = await query.count().get();
    return snap.data().count;
}

export async function getActiveScenarioInventory(
    bundle: BundleId,
    scope?: ScenarioInventoryScopeFilter
): Promise<ScenarioInventoryCounts> {
    const snapshot = await db
        .collection('scenarios')
        .where('metadata.bundle', '==', bundle)
        .where('is_active', '==', true)
        .select('metadata.scopeTier', 'metadata.scopeKey', 'metadata.sourceKind')
        .get();

    const counts: ScenarioInventoryCounts = {
        total: 0,
        byScopeTier: {},
        bySourceKind: {},
    };

    for (const doc of snapshot.docs) {
        const metadata = doc.data()?.metadata;
        const candidate: CachedScenario = {
            id: doc.id,
            title: '',
            description: '',
            bundle,
            scopeTier: metadata?.scopeTier,
            scopeKey: metadata?.scopeKey,
            sourceKind: metadata?.sourceKind,
            timestamp: 0,
        };

        if (!matchesScopeFilter(candidate, scope)) continue;

        counts.total += 1;
        if (candidate.scopeTier) {
            counts.byScopeTier[candidate.scopeTier] = (counts.byScopeTier[candidate.scopeTier] ?? 0) + 1;
        }
        if (candidate.sourceKind) {
            counts.bySourceKind[candidate.sourceKind] = (counts.bySourceKind[candidate.sourceKind] ?? 0) + 1;
        }
    }

    return counts;
}

/**
 * Clear entire cache (useful for testing or manual refresh)
 */
export function clearScenarioCache(): void {
    scenarioCache.clear();
    console.log('[Cache CLEAR] All scenario caches cleared');
}

/**
 * Check if a scenario with the given ID already exists
 */
export async function scenarioExists(scenarioId: string): Promise<boolean> {
    const doc = await db.collection('scenarios').doc(scenarioId).get();
    return doc.exists;
}

/**
 * Calculate similarity between two strings using Levenshtein distance
 * Returns a value between 0 (completely different) and 1 (identical)
 */
function calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase());
    return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    return matrix[str2.length][str1.length];
}

/**
 * Check for semantically similar scenarios in the database
 * Returns the ID of a similar scenario if found, null otherwise
 * 
 * OPTIMIZATION: Uses in-memory cache to reduce Firestore reads from ~100 to ~20 per bundle
 * Cache TTL: 5 minutes per bundle
 */
export async function findSimilarScenario(
    scenario: Scenario,
    similarityThreshold: number = 0.85
): Promise<string | null> {
    const bundle = scenario.metadata?.bundle || 'general';

    // Use cached scenarios (reduces Firestore reads by ~80%)
    const cachedScenarios = await getCachedScenariosForBundle(bundle);

    for (const existing of cachedScenarios) {
        // Compare titles
        const titleSimilarity = calculateSimilarity(scenario.title, existing.title);
        if (titleSimilarity >= similarityThreshold) {
            console.log(`[Similarity] Found similar by title: ${existing.id} (${(titleSimilarity * 100).toFixed(1)}%)`);
            return existing.id;
        }

        // Compare descriptions
        const descSimilarity = calculateSimilarity(scenario.description, existing.description);
        if (descSimilarity >= similarityThreshold) {
            console.log(`[Similarity] Found similar by description: ${existing.id} (${(descSimilarity * 100).toFixed(1)}%)`);
            return existing.id;
        }
    }

    return null;
}

/**
 * Generate a unique scenario ID with timestamp and hash to prevent collisions
 */
export function generateUniqueScenarioId(baseId: string, scenario: Scenario): string {
    // Create a hash of key scenario properties
    const content = JSON.stringify({
        title: scenario.title,
        description: scenario.description,
        bundle: scenario.metadata?.bundle
    });
    const hash = crypto.createHash('md5').update(content).digest('hex').substring(0, 8);
    const timestamp = Date.now().toString(36);

    // Clean the base ID
    const cleanBaseId = baseId.replace(/[^a-z0-9_]/gi, '_').toLowerCase();

    return `${cleanBaseId}_${timestamp}_${hash}`;
}

export async function saveScenario(
    scenario: Scenario,
    options: { skipDuplicateCheck?: boolean; skipSimilarityCheck?: boolean } = {}
): Promise<{ saved: boolean; reason?: string; existingId?: string }> {
    const acceptanceMetadata = (scenario.metadata as any)?.acceptanceMetadata;
    const scopeTier = scenario.metadata?.scopeTier;
    const scopeKey = scenario.metadata?.scopeKey;
    const sourceKind = scenario.metadata?.sourceKind;

    if (
        !acceptanceMetadata?.policyVersion ||
        !acceptanceMetadata?.countrySource?.kind ||
        !acceptanceMetadata?.acceptedAt ||
        !acceptanceMetadata?.scopeTier ||
        !acceptanceMetadata?.scopeKey ||
        !acceptanceMetadata?.sourceKind ||
        !acceptanceMetadata?.modelFamily
    ) {
        console.warn(`[Storage] Scenario ${scenario.id} is missing acceptance metadata. Rejecting save.`);
        return { saved: false, reason: 'missing_acceptance_metadata' };
    }

    if (!scopeTier || !scopeKey || !sourceKind) {
        console.warn(`[Storage] Scenario ${scenario.id} is missing scope metadata. Rejecting save.`);
        return { saved: false, reason: 'missing_scope_metadata' };
    }

    if (acceptanceMetadata.scopeTier !== scopeTier || acceptanceMetadata.scopeKey !== scopeKey || acceptanceMetadata.sourceKind !== sourceKind) {
        console.warn(`[Storage] Scenario ${scenario.id} has mismatched acceptance metadata. Rejecting save.`);
        return { saved: false, reason: 'mismatched_acceptance_scope_metadata' };
    }

    if (scopeTier === 'cluster' && !scenario.metadata?.clusterId) {
        console.warn(`[Storage] Scenario ${scenario.id} is missing clusterId for cluster scope. Rejecting save.`);
        return { saved: false, reason: 'missing_cluster_id' };
    }

    if (scopeTier === 'regional' && (!Array.isArray(scenario.metadata?.region_tags) || scenario.metadata.region_tags.length === 0)) {
        console.warn(`[Storage] Scenario ${scenario.id} is missing region_tags for regional scope. Rejecting save.`);
        return { saved: false, reason: 'missing_region_tags' };
    }

    if (scopeTier === 'exclusive') {
        if (!scenario.metadata?.exclusivityReason) {
            console.warn(`[Storage] Scenario ${scenario.id} is missing exclusivityReason for exclusive scope. Rejecting save.`);
            return { saved: false, reason: 'missing_exclusivity_reason' };
        }
        if (!Array.isArray(scenario.applicability?.applicableCountryIds) || scenario.applicability.applicableCountryIds.length === 0) {
            console.warn(`[Storage] Scenario ${scenario.id} is missing applicability.applicableCountryIds for exclusive scope. Rejecting save.`);
            return { saved: false, reason: 'missing_applicable_countries' };
        }
    }

    // 1. Fast pre-check for exact ID collision (non-transactional, quick exit)
    if (!options.skipDuplicateCheck) {
        const exists = await scenarioExists(scenario.id);
        if (exists) {
            console.warn(`Scenario with ID ${scenario.id} already exists. Skipping save.`);
            return { saved: false, reason: 'duplicate_id', existingId: scenario.id };
        }
    }

    // 2. Check for semantic similarity
    if (!options.skipSimilarityCheck) {
        const similarId = await findSimilarScenario(scenario);
        if (similarId) {
            console.warn(`Similar scenario found: ${similarId}. Skipping save.`);
            return { saved: false, reason: 'similar_content', existingId: similarId };
        }
    }

    // Apply theme-based conditions (e.g. bailout/fiscal only when metrics are strained)
    const scenarioToSave = applyThemeConditions(scenario);

    // 3. Atomically check existence and write to Firestore via transaction.
    // Closes the race condition where two parallel saves of the same scenario ID
    // could both pass the pre-check above and then both commit.
    // Strip legacy fields that have been unified into applicability
    const { conditions: _legacyConditions, relationship_conditions: _legacyRelConds, ...scenarioWithoutLegacy } = scenarioToSave as any;
    const { requires: _metaRequires, applicable_countries: _metaApplicableCountries, ...cleanMetadata } = (scenarioToSave.metadata || {}) as any;

    const firestoreData = {
        ...stripUndefined({
            ...scenarioWithoutLegacy,
            metadata: cleanMetadata,
            type: 'generated',
            is_active: true,
        }),
        created_at: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = db.collection('scenarios').doc(scenario.id);
    const committed = await db.runTransaction(async (tx) => {
        const existing = await tx.get(docRef);
        if (existing.exists) {
            return false;
        }
        tx.set(docRef, firestoreData);
        return true;
    });

    if (!committed) {
        console.warn(`[Storage] Transaction found duplicate for ${scenario.id}. Skipping save.`);
        return { saved: false, reason: 'duplicate_id', existingId: scenario.id };
    }

    // 5. Save embedding if semantic dedup is enabled
    const bundle = scenario.metadata?.bundle || 'general';
    const scenarioTags = Array.isArray(scenario.metadata?.tags) ? scenario.metadata!.tags! : [];
    if (isSemanticDedupEnabled()) {
        try {
            // Check if embedding was pre-computed during generation
            const embedding = (scenario as any)._embedding;

            if (embedding) {
                // Use pre-computed embedding
                await saveEmbedding(
                    scenario.id,
                    embedding,
                    bundle,
                    getEmbeddingText(scenario),
                    scenarioTags
                );
            } else {
                // Generate embedding on the fly (for manual scenarios)
                const embeddingText = getEmbeddingText(scenario);
                const newEmbedding = await generateEmbedding(embeddingText);
                await saveEmbedding(scenario.id, newEmbedding, bundle, embeddingText, scenarioTags);
            }
        } catch (error: any) {
            console.warn(`[Storage] Failed to save embedding (non-fatal):`, error.message);
        }
    }

    // Invalidate cache for this bundle to ensure fresh data on next similarity check
    invalidateBundleCache(bundle);

    console.log(`Saved scenario ${scenario.id} to Firestore [source: ${scenario.metadata?.sourceKind || 'manual'}].`);
    return { saved: true };
}

/**
 * Fetch scenarios from Firestore with optional news filtering.
 * When hideNewsScenarios is true, news-generated scenarios are excluded.
 * @param hideNewsScenarios Whether to exclude news-generated scenarios (default: false, meaning news is shown)
 * @param limit Maximum number of scenarios to fetch
 */
export async function fetchScenarios(hideNewsScenarios: boolean = false, limit: number = 100): Promise<Scenario[]> {
    let query = db.collection('scenarios')
        .where('is_active', '==', true)
        .orderBy('created_at', 'desc')
        .limit(limit);

    // Filter out news scenarios when requested
    if (hideNewsScenarios) {
        query = query.where('source', '!=', 'news') as admin.firestore.Query;
    }

    const snapshot = await query.get();
    const scenarios: Scenario[] = [];

    snapshot.forEach(doc => {
        const data = doc.data();
        // Remove Firestore-specific fields
        const { created_at, type, is_active, source, ...scenarioData } = data;
        scenarios.push(scenarioData as Scenario);
    });

    return scenarios;
}

export async function getActiveBundleCount(
    bundle: BundleId,
    db: admin.firestore.Firestore
): Promise<number> {
    const snap = await db
        .collection('scenarios')
        .where('metadata.bundle', '==', bundle)
        .where('is_active', '==', true)
        .count()
        .get();
    return snap.data().count;
}

export async function saveWorldEvent(event: WorldEvent): Promise<void> {
    await db.collection('world_events').doc(event.id).set(stripUndefined(event));
}

export async function getRecentWorldEvents(sinceTimestamp: string, limit = 20): Promise<WorldEvent[]> {
    const snap = await db
        .collection('world_events')
        .where('timestamp', '>', sinceTimestamp)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

    return snap.docs.map((doc) => doc.data() as WorldEvent);
}

export async function saveCountryWorldState(
    state: CountryWorldState,
    firestore: admin.firestore.Firestore = db,
): Promise<void> {
    await firestore.collection('country_world_state').doc(state.countryId).set(stripUndefined(state));
}

export async function loadCountryWorldStates(
    countryIds: string[],
    firestore: admin.firestore.Firestore = db,
): Promise<Map<string, CountryWorldState>> {
    if (countryIds.length === 0) return new Map();
    const chunks: string[][] = [];
    for (let i = 0; i < countryIds.length; i += 30) {
        chunks.push(countryIds.slice(i, i + 30));
    }
    const results = new Map<string, CountryWorldState>();
    await Promise.all(chunks.map(async chunk => {
        const snap = await firestore
            .collection('country_world_state')
            .where(admin.firestore.FieldPath.documentId(), 'in', chunk)
            .get();
        snap.docs.forEach(doc => results.set(doc.id, doc.data() as CountryWorldState));
    }));
    return results;
}
