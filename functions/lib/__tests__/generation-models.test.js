"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const generation_models_1 = require("../lib/generation-models");
describe('generation-models', () => {
    const originalEnv = Object.assign({}, process.env);
    beforeEach(() => {
        process.env = Object.assign(Object.assign({}, originalEnv), { ARCHITECT_MODEL: 'gpt-4o-mini', CONCEPT_MODEL: 'gpt-4o-mini', DRAFTER_MODEL: 'gpt-4o-mini', REPAIR_MODEL: 'gpt-4o-mini', NARRATIVE_REVIEW_MODEL: 'gpt-4o-mini', EMBEDDING_MODEL: 'text-embedding-3-small' });
    });
    afterAll(() => {
        process.env = originalEnv;
    });
    it('inherits the first requested ollama model for repair and review phases', () => {
        const modelConfig = {
            architectModel: 'ollama:qwen3:30b',
            drafterModel: 'ollama:qwen3:30b',
        };
        expect((0, generation_models_1.isOllamaGeneration)(modelConfig)).toBe(true);
        expect((0, generation_models_1.getModelFamily)(modelConfig)).toBe('ollama');
        expect((0, generation_models_1.resolvePhaseModel)(modelConfig, 'repair')).toBe('ollama:qwen3:30b');
        expect((0, generation_models_1.resolvePhaseModel)(modelConfig, 'contentQuality')).toBe('ollama:qwen3:30b');
        expect((0, generation_models_1.resolvePhaseModel)(modelConfig, 'narrativeReview')).toBe('ollama:qwen3:30b');
    });
    it('keeps mixed runs openai-backed while still exposing requested ollama models', () => {
        const modelConfig = {
            architectModel: 'gpt-4o-mini',
            drafterModel: 'ollama:qwen3:14b',
            embeddingModel: 'text-embedding-3-small',
        };
        expect((0, generation_models_1.isOllamaGeneration)(modelConfig)).toBe(true);
        expect((0, generation_models_1.getModelFamily)(modelConfig)).toBe('ollama');
        expect((0, generation_models_1.getRequestedOllamaModels)(modelConfig, { includeEmbedding: true })).toEqual(['ollama:qwen3:14b']);
        expect((0, generation_models_1.resolvePhaseModel)(modelConfig, 'architect')).toBe('gpt-4o-mini');
        expect((0, generation_models_1.resolvePhaseModel)(modelConfig, 'repair')).toBe('ollama:qwen3:14b');
    });
    it('resolves default models when no overrides are provided', () => {
        expect((0, generation_models_1.getResolvedGenerationModels)()).toEqual({
            architect: 'gpt-4o-mini',
            blueprint: 'gpt-4o-mini',
            drafter: 'gpt-4o-mini',
            repair: 'gpt-4o-mini',
            contentQuality: 'gpt-4o-mini',
            narrativeReview: 'gpt-4o-mini',
            embedding: 'text-embedding-3-small',
        });
    });
    it('strips the ollama prefix only when present', () => {
        expect((0, generation_models_1.stripOllamaPrefix)('ollama:qwen3:14b')).toBe('qwen3:14b');
        expect((0, generation_models_1.stripOllamaPrefix)('gpt-4o-mini')).toBe('gpt-4o-mini');
    });
});
//# sourceMappingURL=generation-models.test.js.map