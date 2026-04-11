/**
 * Validates LLM-related environment (OpenRouter-first cloud, optional legacy direct OpenAI, Ollama)
 * against resolved phase models so misconfiguration surfaces before generation runs.
 */

import {
  getResolvedGenerationModels,
  isOpenAIModel,
  isOllamaModel,
  isOpenRouterModel,
  type GenerationModelConfig,
} from './generation-models';

export interface ConfigValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  config: {
    hasOpenAI: boolean;
    hasOpenRouter: boolean;
    hasOpenRouterManagement: boolean;
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
  const hasOpenAI = !!process.env.OPENAI_API_KEY?.trim();
  const hasOpenRouter = !!process.env.OPENROUTER_API_KEY?.trim();
  const hasOpenRouterManagement = !!process.env.OPENROUTER_MANAGEMENT_KEY?.trim();
  const directOpenAIOk =
    process.env.USE_OPENAI_DIRECT === 'true' && hasOpenAI;

  if (hasOpenAI) {
    const key = process.env.OPENAI_API_KEY!.trim();
    if (!key.startsWith('sk-') && !key.startsWith('sess-')) {
      warnings.push('OPENAI_API_KEY does not start with expected prefix (sk- or sess-) — verify the key is correct');
    }
  }

  if (hasOpenRouter) {
    const key = process.env.OPENROUTER_API_KEY!.trim();
    if (!key.startsWith('sk-or-')) {
      warnings.push('OPENROUTER_API_KEY does not start with expected prefix (sk-or-) — verify the key is correct');
    }
  }

  if (hasOpenRouterManagement) {
    const key = process.env.OPENROUTER_MANAGEMENT_KEY!.trim();
    if (!key.startsWith('sk-or-')) {
      warnings.push('OPENROUTER_MANAGEMENT_KEY does not start with expected prefix (sk-or-) — verify the key is correct');
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
    if (!isOpenAIModel(model) && !isOllamaModel(model) && !isOpenRouterModel(model)) {
      errors.push(`${label} is set to ${model} but only OpenRouter (openrouter:*), OpenAI (gpt-*, o1, o3), and Ollama (ollama:*) models are supported`);
      continue;
    }
    if (isOpenRouterModel(model) && !hasOpenRouter) {
      errors.push(`${label} is set to ${model} but OPENROUTER_API_KEY is missing`);
    }
    if (isOpenAIModel(model) && !hasOpenRouter && !directOpenAIOk) {
      errors.push(
        `${label} is set to ${model} but cloud generation needs OPENROUTER_API_KEY, or USE_OPENAI_DIRECT=true with OPENAI_API_KEY`
      );
    }
  }

  // Check semantic deduplication. Embeddings can be served by either OpenAI
  // or OpenRouter (which proxies OpenAI embeddings), so either key is sufficient.
  const semanticDedupEnabled = process.env.ENABLE_SEMANTIC_DEDUP !== 'false';
  if (semanticDedupEnabled && !hasOpenRouter && !directOpenAIOk) {
    warnings.push(
      'Semantic deduplication is enabled but OPENROUTER_API_KEY is missing (or USE_OPENAI_DIRECT=true with OPENAI_API_KEY) — embedding-based dedup will be unavailable'
    );
  }

  // Informational only: we no longer enforce a preferred model per phase because
  // the per-phase routing table is now managed via env vars / Firestore config.
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    config: {
      hasOpenAI,
      hasOpenRouter,
      hasOpenRouterManagement,
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
  console.log(`  OpenRouter API: ${validation.config.hasOpenRouter ? '✓' : '✗'}`);
  console.log(`  OpenRouter Management: ${validation.config.hasOpenRouterManagement ? '✓' : '✗'}`);
  console.log(`  OpenAI API (USE_OPENAI_DIRECT only): ${validation.config.hasOpenAI ? '✓' : '✗'}`);
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
