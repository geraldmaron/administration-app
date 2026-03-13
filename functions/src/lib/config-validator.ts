/**
 * Configuration Validator for Multi-Model Generation System
 * Validates that all required environment variables are present for the new system
 */

export interface ConfigValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  config: {
    hasOpenAI: boolean;
    hasMoonshot: boolean;
    semanticDedupEnabled: boolean;
    models: {
      concept: string;
      blueprint: string;
      drafter: string;
      embedding: string;
    };
  };
}

/**
 * Validate configuration for OpenAI-first generation system
 */
export function validateConfig(): ConfigValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required API keys
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasMoonshot = !!process.env.MOONSHOT_API_KEY;

  if (!hasOpenAI) {
    errors.push('OPENAI_API_KEY is not set - generation and embeddings will fail');
  }

  // Check model configuration
  const conceptModel = process.env.CONCEPT_MODEL || 'gpt-4o-mini';
  const blueprintModel = process.env.BLUEPRINT_MODEL || 'gpt-4o-mini';
  const drafterModel = process.env.DRAFTER_MODEL || 'gpt-4o-mini';
  const embeddingModel = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';

  // Validate model-provider alignment
  if (conceptModel.startsWith('gpt-') && !hasOpenAI) {
    errors.push(`CONCEPT_MODEL is set to ${conceptModel} but OPENAI_API_KEY is missing`);
  }
  if (blueprintModel.startsWith('gpt-') && !hasOpenAI) {
    errors.push(`BLUEPRINT_MODEL is set to ${blueprintModel} but OPENAI_API_KEY is missing`);
  }
  if (!drafterModel.startsWith('gpt-') && !drafterModel.startsWith('o1') && !drafterModel.startsWith('o3')) {
    errors.push(`DRAFTER_MODEL is set to ${drafterModel} but only OpenAI models are supported in OpenAI-only mode`);
  }
  if (embeddingModel.startsWith('text-embedding') && !hasOpenAI) {
    errors.push(`EMBEDDING_MODEL is set to ${embeddingModel} but OPENAI_API_KEY is missing`);
  }

  // Check semantic deduplication
  const semanticDedupEnabled = process.env.ENABLE_SEMANTIC_DEDUP !== 'false';
  if (semanticDedupEnabled && !hasOpenAI) {
    warnings.push('Semantic deduplication is enabled but OPENAI_API_KEY is missing - will fall back to legacy dedup');
  }

  // Warnings for non-optimal configurations
  if (conceptModel !== 'gpt-4o-mini') {
    warnings.push(`CONCEPT_MODEL is ${conceptModel} - recommended: gpt-4o-mini for cost efficiency`);
  }
  if (drafterModel !== 'gpt-4o-mini') {
    warnings.push(`DRAFTER_MODEL is ${drafterModel} - recommended: gpt-4o-mini for low-cost operation`);
  }
  if (hasMoonshot) {
    warnings.push('MOONSHOT_API_KEY is set but Moonshot routing is disabled in OpenAI-only mode');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    config: {
      hasOpenAI,
      hasMoonshot,
      semanticDedupEnabled,
      models: {
        concept: conceptModel,
        blueprint: blueprintModel,
        drafter: drafterModel,
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
  
  console.log('[Config] OpenAI-only Generation System Configuration:');
  console.log(`  OpenAI API: ${validation.config.hasOpenAI ? '✓' : '✗'}`);
  console.log(`  Moonshot API (legacy env): ${validation.config.hasMoonshot ? 'present' : 'not set'}`);
  console.log(`  Semantic Dedup: ${validation.config.semanticDedupEnabled ? 'enabled' : 'disabled'}`);
  console.log(`  Models:`);
  console.log(`    - Concept: ${validation.config.models.concept}`);
  console.log(`    - Blueprint: ${validation.config.models.blueprint}`);
  console.log(`    - Drafter: ${validation.config.models.drafter}`);
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
