"use strict";
/**
 * Configuration Validator for Multi-Model Generation System
 * Validates that all required environment variables are present for the new system
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateConfig = validateConfig;
exports.logConfigStatus = logConfigStatus;
function isOpenAIModel(model) {
    return model.startsWith('gpt-') || model.startsWith('o1') || model.startsWith('o3') || model.startsWith('text-embedding');
}
function isLMStudioModel(model) {
    return model.startsWith('lmstudio:');
}
function getSharedLMStudioModel(modelConfig) {
    return [
        modelConfig === null || modelConfig === void 0 ? void 0 : modelConfig.architectModel,
        modelConfig === null || modelConfig === void 0 ? void 0 : modelConfig.drafterModel,
        modelConfig === null || modelConfig === void 0 ? void 0 : modelConfig.repairModel,
        modelConfig === null || modelConfig === void 0 ? void 0 : modelConfig.contentQualityModel,
        modelConfig === null || modelConfig === void 0 ? void 0 : modelConfig.narrativeReviewModel,
    ].find((model) => Boolean(model && isLMStudioModel(model)));
}
function getDefaultArchitectModel() {
    return process.env.ARCHITECT_MODEL || process.env.CONCEPT_MODEL || 'gpt-4o-mini';
}
/**
 * Validate configuration for generation providers
 */
function validateConfig(modelConfig) {
    const errors = [];
    const warnings = [];
    // Check required API keys
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    if (hasOpenAI) {
        const key = process.env.OPENAI_API_KEY.trim();
        if (!key.startsWith('sk-') && !key.startsWith('sess-')) {
            warnings.push('OPENAI_API_KEY does not start with expected prefix (sk- or sess-) — verify the key is correct');
        }
    }
    const sharedLMStudioModel = getSharedLMStudioModel(modelConfig);
    const architectModel = (modelConfig === null || modelConfig === void 0 ? void 0 : modelConfig.architectModel) || getDefaultArchitectModel();
    const blueprintModel = architectModel;
    const drafterModel = (modelConfig === null || modelConfig === void 0 ? void 0 : modelConfig.drafterModel) || process.env.DRAFTER_MODEL || 'gpt-4o-mini';
    const repairModel = (modelConfig === null || modelConfig === void 0 ? void 0 : modelConfig.repairModel) || sharedLMStudioModel || process.env.REPAIR_MODEL || 'gpt-4o-mini';
    const contentQualityModel = (modelConfig === null || modelConfig === void 0 ? void 0 : modelConfig.contentQualityModel) || sharedLMStudioModel || 'gpt-4o-mini';
    const narrativeReviewModel = (modelConfig === null || modelConfig === void 0 ? void 0 : modelConfig.narrativeReviewModel) || sharedLMStudioModel || process.env.NARRATIVE_REVIEW_MODEL || 'gpt-4o-mini';
    const embeddingModel = (modelConfig === null || modelConfig === void 0 ? void 0 : modelConfig.embeddingModel) || process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
    const requiredModels = [
        ['architectModel', architectModel],
        ['blueprintModel', blueprintModel],
        ['drafterModel', drafterModel],
        ['repairModel', repairModel],
        ['contentQualityModel', contentQualityModel],
        ['narrativeReviewModel', narrativeReviewModel],
    ];
    for (const [label, model] of requiredModels) {
        if (!isOpenAIModel(model) && !isLMStudioModel(model)) {
            errors.push(`${label} is set to ${model} but only OpenAI (gpt-*, o1, o3, text-embedding*) and LM Studio (lmstudio:*) models are supported`);
            continue;
        }
        if (isOpenAIModel(model) && !hasOpenAI) {
            errors.push(`${label} is set to ${model} but OPENAI_API_KEY is missing`);
        }
    }
    // Check semantic deduplication
    const semanticDedupEnabled = process.env.ENABLE_SEMANTIC_DEDUP !== 'false';
    const lmStudioOnlyRun = requiredModels.every(([, model]) => isLMStudioModel(model));
    if (semanticDedupEnabled && !hasOpenAI && !lmStudioOnlyRun) {
        warnings.push('Semantic deduplication is enabled but OPENAI_API_KEY is missing - embedding-based dedup will be unavailable');
    }
    if (semanticDedupEnabled && lmStudioOnlyRun) {
        warnings.push('Semantic deduplication is OpenAI-only and will be skipped for LM Studio-only generation runs');
    }
    // Warnings for non-optimal configurations
    if (architectModel !== 'gpt-4o-mini' && !isLMStudioModel(architectModel)) {
        warnings.push(`ARCHITECT_MODEL is ${architectModel} - recommended: gpt-4o-mini for cost efficiency`);
    }
    if (drafterModel !== 'gpt-4o-mini' && !isLMStudioModel(drafterModel)) {
        warnings.push(`DRAFTER_MODEL is ${drafterModel} - recommended: gpt-4o-mini for low-cost operation`);
    }
    return {
        valid: errors.length === 0,
        errors,
        warnings,
        config: {
            hasOpenAI,
            semanticDedupEnabled,
            models: {
                architect: architectModel,
                blueprint: blueprintModel,
                drafter: drafterModel,
                repair: repairModel,
                contentQuality: contentQualityModel,
                narrativeReview: narrativeReviewModel,
                embedding: embeddingModel
            }
        }
    };
}
/**
 * Log configuration status at startup
 */
function logConfigStatus() {
    const validation = validateConfig();
    console.log('[Config] Generation provider configuration:');
    console.log(`  OpenAI API: ${validation.config.hasOpenAI ? '✓' : '✗'}`);
    console.log(`  Semantic Dedup: ${validation.config.semanticDedupEnabled ? 'enabled' : 'disabled'}`);
    console.log(`  Models:`);
    console.log(`    - Architect: ${validation.config.models.architect}`);
    console.log(`    - Blueprint: ${validation.config.models.blueprint}`);
    console.log(`    - Drafter: ${validation.config.models.drafter}`);
    console.log(`    - Repair: ${validation.config.models.repair}`);
    console.log(`    - Content Quality: ${validation.config.models.contentQuality}`);
    console.log(`    - Narrative Review: ${validation.config.models.narrativeReview}`);
    console.log(`    - Embedding: ${validation.config.models.embedding}`);
    if (validation.warnings.length > 0) {
        console.warn('[Config] Warnings:');
        validation.warnings.forEach(w => console.warn(`  ⚠ ${w}`));
    }
    if (!validation.valid) {
        console.error('[Config] ERRORS (will retry at runtime):');
        validation.errors.forEach(e => console.error(`  ✗ ${e}`));
        // Don't throw during deployment cold start - secrets may not be available yet
        // Functions will fail at runtime if truly misconfigured
    }
    else {
        console.log('[Config] ✓ Configuration valid');
    }
}
//# sourceMappingURL=config-validator.js.map