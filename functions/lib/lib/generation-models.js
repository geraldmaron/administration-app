"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOpenAIModel = isOpenAIModel;
exports.isOllamaModel = isOllamaModel;
exports.stripOllamaPrefix = stripOllamaPrefix;
exports.getRequestedModels = getRequestedModels;
exports.getRequestedOllamaModels = getRequestedOllamaModels;
exports.getSharedOllamaModel = getSharedOllamaModel;
exports.isOllamaGeneration = isOllamaGeneration;
exports.getModelFamily = getModelFamily;
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
    return Boolean(model === null || model === void 0 ? void 0 : model.startsWith('ollama:'));
}
function stripOllamaPrefix(model) {
    return isOllamaModel(model) ? model.slice('ollama:'.length) : model;
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
function getSharedOllamaModel(modelConfig) {
    return getRequestedOllamaModels(modelConfig)[0];
}
function isOllamaGeneration(modelConfig) {
    return Boolean(getSharedOllamaModel(modelConfig));
}
function getModelFamily(modelConfig) {
    return isOllamaGeneration(modelConfig) ? 'ollama' : 'openai';
}
function resolvePhaseModel(modelConfig, phase) {
    const sharedOllamaModel = getSharedOllamaModel(modelConfig);
    switch (phase) {
        case 'architect':
            return (modelConfig === null || modelConfig === void 0 ? void 0 : modelConfig.architectModel) || getDefaultArchitectModel();
        case 'drafter':
            return (modelConfig === null || modelConfig === void 0 ? void 0 : modelConfig.drafterModel) || getDefaultDrafterModel();
        case 'repair':
            return (modelConfig === null || modelConfig === void 0 ? void 0 : modelConfig.repairModel) || sharedOllamaModel || getDefaultRepairModel();
        case 'contentQuality':
            return (modelConfig === null || modelConfig === void 0 ? void 0 : modelConfig.contentQualityModel) || sharedOllamaModel || 'gpt-4o-mini';
        case 'narrativeReview':
            return (modelConfig === null || modelConfig === void 0 ? void 0 : modelConfig.narrativeReviewModel) || sharedOllamaModel || getDefaultNarrativeReviewModel();
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