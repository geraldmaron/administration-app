import type { GenerationModelConfig } from '../shared/generation-contract';
export type { GenerationModelConfig };

export type GenerationPhase = 'architect' | 'drafter' | 'repair' | 'contentQuality' | 'narrativeReview';

export type ModelFamily = 'openai' | 'ollama';

const LANGUAGE_MODEL_KEYS = [
  'architectModel',
  'drafterModel',
  'repairModel',
  'contentQualityModel',
  'narrativeReviewModel',
] as const;

const ALL_MODEL_KEYS = [...LANGUAGE_MODEL_KEYS, 'embeddingModel'] as const;

function getDefaultArchitectModel(): string {
  return process.env.ARCHITECT_MODEL || process.env.CONCEPT_MODEL || 'gpt-4o-mini';
}

function getDefaultDrafterModel(): string {
  return process.env.DRAFTER_MODEL || 'gpt-4o-mini';
}

function getDefaultRepairModel(): string {
  return process.env.REPAIR_MODEL || 'gpt-4o-mini';
}

function getDefaultNarrativeReviewModel(): string {
  return process.env.NARRATIVE_REVIEW_MODEL || 'gpt-4o-mini';
}

function getDefaultEmbeddingModel(): string {
  return process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
}

export function isOpenAIModel(model: string): boolean {
  return (
    model.startsWith('gpt-') ||
    model.startsWith('o1') ||
    model.startsWith('o3') ||
    model.startsWith('text-embedding')
  );
}

export function isOllamaModel(model: string): boolean {
  return model.startsWith('ollama:');
}

export function stripOllamaPrefix(model: string): string {
  return model.startsWith('ollama:') ? model.slice('ollama:'.length) : model;
}

export function getRequestedModels(
  modelConfig?: GenerationModelConfig,
  options?: { includeEmbedding?: boolean }
): string[] {
  const keys = options?.includeEmbedding ? ALL_MODEL_KEYS : LANGUAGE_MODEL_KEYS;
  return keys
    .map((key) => modelConfig?.[key])
    .filter((model): model is string => typeof model === 'string' && model.length > 0);
}

export function getRequestedOllamaModels(
  modelConfig?: GenerationModelConfig,
  options?: { includeEmbedding?: boolean }
): string[] {
  return getRequestedModels(modelConfig, options).filter(isOllamaModel);
}

export function isOllamaGeneration(modelConfig?: GenerationModelConfig): boolean {
  return getRequestedModels(modelConfig).some(isOllamaModel);
}

export function getModelFamily(modelConfig?: GenerationModelConfig): ModelFamily {
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
const OLLAMA_PHASE_PREFERENCE: Record<GenerationPhase, string[]> = {
  architect: ['ai-reasoning', 'deepseek-r1:32b', 'ai-general', 'qwen3:30b', 'deepseek-r1:14b'],
  drafter: ['ai-reasoning', 'deepseek-r1:32b', 'ai-general', 'qwen3:30b', 'mistral-small:24b'],
  repair: ['ai-coding', 'ai-general', 'qwen3-coder:30b', 'qwen3:30b'],
  contentQuality: ['ai-fast', 'ai-general', 'qwen3:8b', 'gemma3:12b'],
  narrativeReview: ['ai-fast', 'ai-general', 'qwen3:8b', 'gemma3:12b'],
};

export function resolveOllamaPhaseModel(phase: GenerationPhase, availableModels: string[]): string | undefined {
  const prefs = OLLAMA_PHASE_PREFERENCE[phase];
  for (const pref of prefs) {
    const match = availableModels.find(m => m === pref || m.startsWith(`${pref}:`));
    if (match) return match;
  }
  return availableModels[0];
}

export function buildOllamaModelConfig(availableModels: string[]): GenerationModelConfig {
  const resolve = (phase: GenerationPhase): string => {
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
export function resolvePhaseModel(
  modelConfig: GenerationModelConfig | undefined,
  phase: GenerationPhase
): string {
  const ollamaFallback = (): string => {
    const firstOllama = getRequestedOllamaModels(modelConfig)[0];
    return firstOllama ?? getDefaultRepairModel();
  };

  const isOllama = isOllamaGeneration(modelConfig);

  switch (phase) {
    case 'architect':
      return modelConfig?.architectModel || getDefaultArchitectModel();
    case 'drafter':
      return modelConfig?.drafterModel || getDefaultDrafterModel();
    case 'repair':
      return modelConfig?.repairModel || (isOllama ? ollamaFallback() : getDefaultRepairModel());
    case 'contentQuality':
      return modelConfig?.contentQualityModel || (isOllama ? ollamaFallback() : 'gpt-4o-mini');
    case 'narrativeReview':
      return modelConfig?.narrativeReviewModel || (isOllama ? ollamaFallback() : getDefaultNarrativeReviewModel());
  }
}

export function getResolvedGenerationModels(modelConfig?: GenerationModelConfig): {
  architect: string;
  blueprint: string;
  drafter: string;
  repair: string;
  contentQuality: string;
  narrativeReview: string;
  embedding: string;
} {
  const architect = resolvePhaseModel(modelConfig, 'architect');

  return {
    architect,
    blueprint: architect,
    drafter: resolvePhaseModel(modelConfig, 'drafter'),
    repair: resolvePhaseModel(modelConfig, 'repair'),
    contentQuality: resolvePhaseModel(modelConfig, 'contentQuality'),
    narrativeReview: resolvePhaseModel(modelConfig, 'narrativeReview'),
    embedding: modelConfig?.embeddingModel || getDefaultEmbeddingModel(),
  };
}
