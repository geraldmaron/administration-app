/**
 * Semantic deduplication using OpenAI embeddings + Firestore native vector search.
 *
 * Strategy:
 * - Generate embeddings for scenario title + description
 * - Store embeddings in Firestore as VectorValue fields
 * - Use Firestore findNearest() for similarity search (single indexed query, no in-memory compute)
 * - Threshold: cosine similarity >= 0.85 (cosine distance <= 0.15)
 *
 * Requires a Firestore composite vector index on scenario_embeddings:
 *   fields: [bundle (ASC), embedding (vector)]
 */

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import OpenAI from 'openai';

let db: admin.firestore.Firestore | null = null;

function getFirestore(): admin.firestore.Firestore {
    if (!db) {
        db = admin.firestore();
    }
    return db;
}

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
    if (!openaiClient) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY environment variable not set');
        }
        openaiClient = new OpenAI({ apiKey });
    }
    return openaiClient;
}

const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
const SIMILARITY_THRESHOLD = parseFloat(process.env.SEMANTIC_SIMILARITY_THRESHOLD || '0.85');
// COSINE distance = 1 - cosine_similarity, so threshold of 0.85 similarity = distance <= 0.15
const COSINE_DISTANCE_THRESHOLD = 1 - SIMILARITY_THRESHOLD;
const ENABLE_SEMANTIC_DEDUP = process.env.ENABLE_SEMANTIC_DEDUP !== 'false';

export async function generateEmbedding(text: string): Promise<number[]> {
    if (!ENABLE_SEMANTIC_DEDUP) {
        return [];
    }
    const client = getOpenAIClient();
    try {
        const response = await client.embeddings.create({
            model: EMBEDDING_MODEL,
            input: text,
            encoding_format: 'float',
        });
        return response.data[0].embedding;
    } catch (error: any) {
        console.error('[Embedding] Failed to generate embedding:', error.message);
        throw error;
    }
}

export function getEmbeddingText(scenario: { title: string; description: string }): string {
    return `${scenario.title}\n\n${scenario.description}`;
}

export async function saveEmbedding(
    scenarioId: string,
    embedding: number[],
    bundle: string,
    text: string
): Promise<void> {
    if (!ENABLE_SEMANTIC_DEDUP || embedding.length === 0) {
        return;
    }
    await getFirestore().collection('scenario_embeddings').doc(scenarioId).set({
        scenarioId,
        embedding: FieldValue.vector(embedding),
        bundle,
        text: text.substring(0, 500),
        createdAt: admin.firestore.Timestamp.now(),
    });
    console.log(`[Embedding] Saved embedding for scenario ${scenarioId} (bundle: ${bundle})`);
}

/**
 * Find a semantically similar scenario using Firestore native vector search.
 * Returns the closest match above the similarity threshold, or null if none found.
 */
export async function findSimilarByEmbedding(
    embedding: number[],
    bundle: string,
    excludeIds: string[] = []
): Promise<{ id: string; similarity: number } | null> {
    if (!ENABLE_SEMANTIC_DEDUP || embedding.length === 0) {
        return null;
    }
    try {
        const snapshot = await getFirestore()
            .collection('scenario_embeddings')
            .where('bundle', '==', bundle)
            .findNearest({
                vectorField: 'embedding',
                queryVector: embedding,
                limit: 10,
                distanceMeasure: 'COSINE',
                distanceResultField: 'vector_distance',
                distanceThreshold: COSINE_DISTANCE_THRESHOLD,
            })
            .get();

        for (const doc of snapshot.docs) {
            const data = doc.data();
            if (excludeIds.includes(data.scenarioId)) continue;
            const distance = data.vector_distance as number;
            const similarity = 1 - distance;
            console.log(`[Embedding] Found similar scenario: ${data.scenarioId} (similarity: ${similarity.toFixed(3)})`);
            return { id: data.scenarioId, similarity };
        }
        return null;
    } catch (error: any) {
        const msg: string = error?.message ?? String(error);
        const isIndexMissing =
            msg.includes('no matching index') ||
            msg.includes('index') ||
            msg.includes('FAILED_PRECONDITION') ||
            msg.includes('vector');
        if (isIndexMissing) {
            console.error(
                '[SemanticDedup] ⚠️  Vector index missing — semantic dedup DISABLED.\n' +
                '  Fix: Create a composite index on scenario_embeddings with fields:\n' +
                '    bundle ASC, embedding vector (768 or 1536 dims), __name__ ASC\n' +
                '  Until then, duplicate scenarios will not be caught by embedding similarity.'
            );
        } else {
            console.error('[Embedding] Error finding similar scenarios:', msg);
        }
        return null;
    }
}

export async function deleteEmbedding(scenarioId: string): Promise<void> {
    if (!ENABLE_SEMANTIC_DEDUP) {
        return;
    }
    try {
        await getFirestore().collection('scenario_embeddings').doc(scenarioId).delete();
        console.log(`[Embedding] Deleted embedding for scenario ${scenarioId}`);
    } catch (error: any) {
        console.warn('[Embedding] Failed to delete embedding:', error.message);
    }
}

export function isSemanticDedupEnabled(): boolean {
    return ENABLE_SEMANTIC_DEDUP;
}

/**
 * Compute Jaccard similarity between two tag arrays.
 * Returns a value between 0 (no overlap) and 1 (identical sets).
 */
export function tagJaccardSimilarity(tagsA: string[], tagsB: string[]): number {
    if (tagsA.length === 0 && tagsB.length === 0) return 0;
    const setA = new Set(tagsA);
    const setB = new Set(tagsB);
    let intersection = 0;
    for (const tag of setA) {
        if (setB.has(tag)) intersection++;
    }
    const union = setA.size + setB.size - intersection;
    return union === 0 ? 0 : intersection / union;
}

/**
 * Pre-filter check: returns true if the candidate's tags overlap significantly
 * with any existing scenario's tags in the same bundle, suggesting potential duplication.
 * Use as a cheap signal before expensive embedding comparison.
 *
 * @param candidateTags Tags of the new scenario
 * @param existingScenarioTags Array of tag arrays from existing scenarios
 * @param threshold Jaccard threshold (default 0.6 — 60% tag overlap)
 * @returns The index of the first overlapping scenario, or -1 if none
 */
export function findTagOverlap(
    candidateTags: string[],
    existingScenarioTags: string[][],
    threshold = 0.6
): number {
    if (candidateTags.length === 0) return -1;
    for (let i = 0; i < existingScenarioTags.length; i++) {
        if (tagJaccardSimilarity(candidateTags, existingScenarioTags[i]) >= threshold) {
            return i;
        }
    }
    return -1;
}
