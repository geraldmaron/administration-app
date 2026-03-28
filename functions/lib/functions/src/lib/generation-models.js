"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOpenAIModel = isOpenAIModel;
exports.isOllamaModel = isOllamaModel;
exports.stripOllamaPrefix = stripOllamaPrefix;
exports.getRequestedModels = getRequestedModels;
exports.getRequestedOllamaModels = getRequestedOllamaModels;
exports.isOllamaGeneration = isOllamaGeneration;
exports.getModelFamily = getModelFamily;
exports.resolveOllamaPhaseModel = resolveOllamaPhaseModel;
exports.buildOllamaModelConfig = buildOllamaModelConfig;
exports.resolvePhaseModel = resolvePhaseModel;
exports.getResolvedGenerationModels = getResolvedGenerationModels;
const LANGUAGE_MODEL_KEYS = [
    'architectModel',
    'drafterModel',
    'repairModel',
    'contentQualityModel',
    'narrativeReviewModel',
];
const ALL_MODEL_KEYS = [...LANGUAGE_MODEL_KEYS, 'embeddingModel'];
function getDefaultArchitectModel() {
    return process.env.ARCHITECT_MODEL || process.env.CONCEPT_MODEL || 'gpt-4o-mini';
}
function getDefaultDrafterModel() {
    return process.env.DRAFTER_MODEL || 'gpt-4o-mini';
}
function getDefaultRepairModel() {
    return process.env.REPAIR_MODEL || 'gpt-4o-mini';
}
function getDefaultNarrativeReviewModel() {
    return process.env.NARRATIVE_REVIEW_MODEL || 'gpt-4o-mini';
}
function getDefaultEmbeddingModel() {
    return process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
}
function isOpenAIModel(model) {
    return (model.startsWith('gpt-') ||
        model.startsWith('o1') ||
        model.startsWith('o3') ||
        model.startsWith('text-embedding'));
}
function isOllamaModel(model) {
    return model.startsWith('ollama:');
}
function stripOllamaPrefix(model) {
    return model.startsWith('ollama:') ? model.slice('ollama:'.length) : model;
}
function getRequestedModels(modelConfig, options) {
    const keys = (options === null || options === void 0 ? void 0 : options.includeEmbedding) ? ALL_MODEL_KEYS : LANGUAGE_MODEL_KEYS;
    return keys
        .map((key) => modelConfig === null || modelConfig === void 0 ? void 0 : modelConfig[key])
        .filter((model) => typeof model === 'string' && model.length > 0);
}
function getRequestedOllamaModels(modelConfig, options) {
    return getRequestedModels(modelConfig, options).filter(isOllamaModel);
}
function isOllamaGeneration(modelConfig) {
    return getRequestedModels(modelConfig).some(isOllamaModel);
}
function getModelFamily(modelConfig) {
    return isOllamaGeneration(modelConfig) ? 'ollama' : 'openai';
}
/**
 * Optimal Ollama model selection per generation phase.
 * Maps phase requirements to model capability tiers:
 *   - reasoning: complex concept ideation, needs deep thinking
 *   - general: balanced creative writing + structured output
 *   - coding: precise JSON manipulation, schema compliance
 *   - fast: lightweight evaluation/scoring
 */
const OLLAMA_PHASE_PREFERENCE = {
    architect: ['ai-reasoning', 'deepseek-r1:32b', 'ai-general', 'qwen3:30b', 'deepseek-r1:14b'],
    drafter: ['ai-reasoning', 'deepseek-r1:32b', 'ai-general', 'qwen3:30b', 'mistral-small:24b'],
    repair: ['ai-coding', 'ai-general', 'qwen3-coder:30b', 'qwen3:30b'],
    contentQuality: ['ai-fast', 'ai-general', 'qwen3:8b', 'gemma3:12b'],
    narrativeReview: ['ai-fast', 'ai-general', 'qwen3:8b', 'gemma3:12b'],
};
function resolveOllamaPhaseModel(phase, availableModels) {
    const prefs = OLLAMA_PHASE_PREFERENCE[phase];
    for (const pref of prefs) {
        const match = availableModels.find(m => m === pref || m.startsWith(`${pref}:`));
        if (match)
            return match;
    }
    return availableModels[0];
}
function buildOllamaModelConfig(availableModels) {
    const resolve = (phase) => {
        const model = resolveOllamaPhaseModel(phase, availableModels);
        return model ? `ollama:${model}` : `ollama:${availableModels[0]}`;
    };
    return {
        architectModel: resolve('architect'),
        drafterModel: resolve('drafter'),
        repairModel: resolve('repair'),
        contentQualityModel: resolve('contentQuality'),
        narrativeReviewModel: resolve('narrativeReview'),
    };
}
/**
 * Resolve the model for a given generation phase.
 * When the phase model is not explicitly configured, falls back to:
 *   1. The first requested Ollama model (if this is an Ollama generation run)
 *   2. The environment-variable default (OpenAI path)
 */
function resolvePhaseModel(modelConfig, phase) {
    const ollamaFallback = () => {
        const firstOllama = getRequestedOllamaModels(modelConfig)[0];
        return firstOllama !== null && firstOllama !== void 0 ? firstOllama : getDefaultRepairModel();
    };
    const isOllama = isOllamaGeneration(modelConfig);
    switch (phase) {
        case 'architect':
            return (modelConfig === null || modelConfig === void 0 ? void 0 : modelConfig.architectModel) || getDefaultArchitectModel();
        case 'drafter':
            return (modelConfig === null || modelConfig === void 0 ? void 0 : modelConfig.drafterModel) || getDefaultDrafterModel();
        case 'repair':
            return (modelConfig === null || modelConfig === void 0 ? void 0 : modelConfig.repairModel) || (isOllama ? ollamaFallback() : getDefaultRepairModel());
        case 'contentQuality':
            return (modelConfig === null || modelConfig === void 0 ? void 0 : modelConfig.contentQualityModel) || (isOllama ? ollamaFallback() : 'gpt-4o-mini');
        case 'narrativeReview':
            return (modelConfig === null || modelConfig === void 0 ? void 0 : modelConfig.narrativeReviewModel) || (isOllama ? ollamaFallback() : getDefaultNarrativeReviewModel());
    }
}
function getResolvedGenerationModels(modelConfig) {
    const architect = resolvePhaseModel(modelConfig, 'architect');
    return {
        architect,
        blueprint: architect,
        drafter: resolvePhaseModel(modelConfig, 'drafter'),
        repair: resolvePhaseModel(modelConfig, 'repair'),
        contentQuality: resolvePhaseModel(modelConfig, 'contentQuality'),
        narrativeReview: resolvePhaseModel(modelConfig, 'narrativeReview'),
        embedding: (modelConfig === null || modelConfig === void 0 ? void 0 : modelConfig.embeddingModel) || getDefaultEmbeddingModel(),
    };
}
//# sourceMappingURL=generation-models.js.map