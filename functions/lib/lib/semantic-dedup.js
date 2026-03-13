"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateEmbedding = generateEmbedding;
exports.getEmbeddingText = getEmbeddingText;
exports.saveEmbedding = saveEmbedding;
exports.findSimilarByEmbedding = findSimilarByEmbedding;
exports.deleteEmbedding = deleteEmbedding;
exports.isSemanticDedupEnabled = isSemanticDedupEnabled;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const openai_1 = __importDefault(require("openai"));
let db = null;
function getFirestore() {
    if (!db) {
        db = admin.firestore();
    }
    return db;
}
let openaiClient = null;
function getOpenAIClient() {
    if (!openaiClient) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY environment variable not set');
        }
        openaiClient = new openai_1.default({ apiKey });
    }
    return openaiClient;
}
const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
const SIMILARITY_THRESHOLD = parseFloat(process.env.SEMANTIC_SIMILARITY_THRESHOLD || '0.85');
// COSINE distance = 1 - cosine_similarity, so threshold of 0.85 similarity = distance <= 0.15
const COSINE_DISTANCE_THRESHOLD = 1 - SIMILARITY_THRESHOLD;
const ENABLE_SEMANTIC_DEDUP = process.env.ENABLE_SEMANTIC_DEDUP !== 'false';
async function generateEmbedding(text) {
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
    }
    catch (error) {
        console.error('[Embedding] Failed to generate embedding:', error.message);
        throw error;
    }
}
function getEmbeddingText(scenario) {
    return `${scenario.title}\n\n${scenario.description}`;
}
async function saveEmbedding(scenarioId, embedding, bundle, text) {
    if (!ENABLE_SEMANTIC_DEDUP || embedding.length === 0) {
        return;
    }
    await getFirestore().collection('scenario_embeddings').doc(scenarioId).set({
        scenarioId,
        embedding: firestore_1.FieldValue.vector(embedding),
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
async function findSimilarByEmbedding(embedding, bundle, excludeIds = []) {
    var _a;
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
            if (excludeIds.includes(data.scenarioId))
                continue;
            const distance = data.vector_distance;
            const similarity = 1 - distance;
            console.log(`[Embedding] Found similar scenario: ${data.scenarioId} (similarity: ${similarity.toFixed(3)})`);
            return { id: data.scenarioId, similarity };
        }
        return null;
    }
    catch (error) {
        const msg = (_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : String(error);
        const isIndexMissing = msg.includes('no matching index') ||
            msg.includes('index') ||
            msg.includes('FAILED_PRECONDITION') ||
            msg.includes('vector');
        if (isIndexMissing) {
            console.error('[SemanticDedup] ⚠️  Vector index missing — semantic dedup DISABLED.\n' +
                '  Fix: Create a composite index on scenario_embeddings with fields:\n' +
                '    bundle ASC, embedding vector (768 or 1536 dims), __name__ ASC\n' +
                '  Until then, duplicate scenarios will not be caught by embedding similarity.');
        }
        else {
            console.error('[Embedding] Error finding similar scenarios:', msg);
        }
        return null;
    }
}
async function deleteEmbedding(scenarioId) {
    if (!ENABLE_SEMANTIC_DEDUP) {
        return;
    }
    try {
        await getFirestore().collection('scenario_embeddings').doc(scenarioId).delete();
        console.log(`[Embedding] Deleted embedding for scenario ${scenarioId}`);
    }
    catch (error) {
        console.warn('[Embedding] Failed to delete embedding:', error.message);
    }
}
function isSemanticDedupEnabled() {
    return ENABLE_SEMANTIC_DEDUP;
}
//# sourceMappingURL=semantic-dedup.js.map