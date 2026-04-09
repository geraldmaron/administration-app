/**
 * Configuration Validator for Multi-Model Generation System
 * Validates that all required environment variables are present for the new system
 */

import {
  getResolvedGenerationModels,
  isOpenAIModel,
  isOllamaModel,
  type GenerationModelConfig,
} from './generation-models';

export interface ConfigValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  config: {
    hasOpenAI: boolean;
    semanticDedupEnabled: boolean;
    models: {
      architect: string;
      blueprint: string;
      drafter: string;
      advisor: string;
      repair: string;
      contentQuality: string;
      narrativeReview: string;
      embedding: string;
    };
  };
}

export type RequestedModelConfig = GenerationModelConfig;

/**
 * Validate configuration for generation providers
 */
export function validateConfig(modelConfig?: RequestedModelConfig): ConfigValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required API keys
  const hasOpenAI = !!process.env.OPENAI_API_KEY;

  if (hasOpenAI) {
    const key = process.env.OPENAI_API_KEY!.trim();
    if (!key.startsWith('sk-') && !key.startsWith('sess-')) {
      warnings.push('OPENAI_API_KEY does not start with expected prefix (sk- or sess-) — verify the key is correct');
    }
  }

  const resolvedModels = getResolvedGenerationModels(modelConfig);
  const architectModel = resolvedModels.architect;
  const blueprintModel = resolvedModels.blueprint;
  const drafterModel = resolvedModels.drafter;
  const advisorModel = resolvedModels.advisor;
  const repairModel = resolvedModels.repair;
  const contentQualityModel = resolvedModels.contentQuality;
  const narrativeReviewModel = resolvedModels.narrativeReview;
  const embeddingModel = resolvedModels.embedding;

  const requiredModels = [
    ['architectModel', architectModel],
    ['blueprintModel', blueprintModel],
    ['drafterModel', drafterModel],
    ['advisorModel', advisorModel],
    ['repairModel', repairModel],
    ['contentQualityModel', contentQualityModel],
    ['narrativeReviewModel', narrativeReviewModel],
  ] as const;

  for (const [label, model] of requiredModels) {
    if (!isOpenAIModel(model) && !isOllamaModel(model)) {
      errors.push(`${label} is set to ${model} but only OpenAI (gpt-*, o1, o3) and Ollama (ollama:*) models are supported`);
      continue;
    }
    if (isOpenAIModel(model) && !hasOpenAI) {
      errors.push(`${label} is set to ${model} but OPENAI_API_KEY is missing`);
    }
  }

  // Check semantic deduplication
  const semanticDedupEnabled = process.env.ENABLE_SEMANTIC_DEDUP !== 'false';
  if (semanticDedupEnabled && !hasOpenAI) {
    warnings.push('Semantic deduplication is enabled but OPENAI_API_KEY is missing - embedding-based dedup will be unavailable');
  }

  // Warnings for non-optimal configurations
  if (architectModel !== 'gpt-4.1-mini') {
    warnings.push(`ARCHITECT_MODEL is ${architectModel} - recommended: gpt-4.1-mini for cost efficiency`);
  }
  if (drafterModel !== 'gpt-4.1' && drafterModel !== 'gpt-4.1-mini') {
    warnings.push(`DRAFTER_MODEL is ${drafterModel} - recommended: gpt-4.1 for quality or gpt-4.1-mini for cost efficiency`);
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
        advisor: advisorModel,
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
export function logConfigStatus(): void {
  const validation = validateConfig();
  
  console.log('[Config] Generation provider configuration:');
  console.log(`  OpenAI API: ${validation.config.hasOpenAI ? '✓' : '✗'}`);
  console.log(`  Semantic Dedup: ${validation.config.semanticDedupEnabled ? 'enabled' : 'disabled'}`);
  console.log(`  Models:`);
  console.log(`    - Architect: ${validation.config.models.architect}`);
  console.log(`    - Blueprint: ${validation.config.models.blueprint}`);
  console.log(`    - Drafter: ${validation.config.models.drafter}`);
  console.log(`    - Advisor: ${validation.config.models.advisor}`);
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
  } else {
    console.log('[Config] ✓ Configuration valid');
  }
}
