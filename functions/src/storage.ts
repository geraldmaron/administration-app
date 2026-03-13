/**
 * Storage module: scenario persistence, similarity checks, and theme-based visibility.
 * Saves scenarios to Firestore and optional Cloud Storage JSON; applies conditions for
 * bailout/fiscal themes so they only show when budget/economy are low.
 */
import * as admin from 'firebase-admin';
import { Scenario } from './types';
import * as crypto from 'crypto';
import {
    generateEmbedding,
    getEmbeddingText,
    saveEmbedding,
    isSemanticDedupEnabled
} from './lib/semantic-dedup';

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
const storage = admin.storage();

/** Keywords that indicate bailout/fiscal-crisis scenarios; only show when budget/economy are strained. */
const FISCAL_BAILOUT_KEYWORDS = /\b(bailout|austerity|sovereign debt|fiscal crisis|imf|budget crisis|debt crisis|emergency loan|default on debt)\b/i;

/**
 * Apply theme-based visibility conditions before save. Bailout/fiscal-crisis scenarios
 * get metric conditions so they only appear when budget and economy are low.
 */
function applyThemeConditions(scenario: Scenario): Scenario {
    if (scenario.conditions && scenario.conditions.length > 0) return scenario;
    const text = [scenario.title, scenario.description, ...(scenario.metadata?.tags ?? [])].join(' ').toLowerCase();
    if (!FISCAL_BAILOUT_KEYWORDS.test(text)) return scenario;
    return {
        ...scenario,
        conditions: [
            { metricId: 'metric_budget', max: 45 },
            { metricId: 'metric_economy', max: 50 },
        ],
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
    timestamp: number;
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
        .select('title', 'description', 'metadata.bundle') // Only fetch needed fields
        .get();

    const scenarios: CachedScenario[] = recentScenarios.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title || '',
        description: doc.data().description || '',
        bundle: doc.data().metadata?.bundle || bundle,
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

    // Explicitly use the correct project bucket
    const bucket = storage.bucket('the-administration-3a072.firebasestorage.app');

    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');

    // 3. Save Full JSON to Cloud Storage (High volume, low cost)
    // Path: scenarios/2024/05/news_20240514_example.json
    const storagePath = bucket ? `scenarios/${year}/${month}/${scenarioToSave.id}.json` : undefined;
    const file = bucket && storagePath ? bucket.file(storagePath) : null;

    if (file && storagePath) {
        try {
            await file.save(JSON.stringify(scenarioToSave, null, 2), {
                contentType: 'application/json',
                metadata: {
                    created: new Date().toISOString(),
                    scenarioId: scenarioToSave.id,
                    severity: scenarioToSave.metadata?.severity || 'medium',
                    source: scenarioToSave.metadata?.source || 'manual'
                }
            });
            console.log(`[Storage] Saved JSON backup to ${storagePath}`);
        } catch (err: any) {
            console.warn(`[Storage] Failed to save file ${storagePath}:`, err.message);
        }
    }

    // 4. Atomically check existence and write to Firestore via transaction.
    // Closes the race condition where two parallel saves of the same scenario ID
    // could both pass the pre-check above and then both commit.
    const firestoreData = {
        ...scenarioToSave,
        ...(storagePath ? { storage_path: storagePath } : {}),
        metadata: {
            ...(scenarioToSave.metadata || {}),
            mode_availability: scenarioToSave.metadata?.mode_availability || []
        },
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        type: 'generated',
        source: scenarioToSave.metadata?.source || 'manual',
        is_active: true
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
                    getEmbeddingText(scenario)
                );
            } else {
                // Generate embedding on the fly (for manual scenarios)
                const embeddingText = getEmbeddingText(scenario);
                const newEmbedding = await generateEmbedding(embeddingText);
                await saveEmbedding(scenario.id, newEmbedding, bundle, embeddingText);
            }
        } catch (error: any) {
            console.warn(`[Storage] Failed to save embedding (non-fatal):`, error.message);
        }
    }

    // Invalidate cache for this bundle to ensure fresh data on next similarity check
    invalidateBundleCache(bundle);

    console.log(`Saved scenario ${scenario.id} to Firestore${storagePath ? ` and Storage (${storagePath})` : ''} [source: ${scenario.metadata?.source || 'manual'}].`);
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
        const { created_at, storage_path, type, is_active, source, ...scenarioData } = data;
        scenarios.push(scenarioData as Scenario);
    });

    return scenarios;
}
