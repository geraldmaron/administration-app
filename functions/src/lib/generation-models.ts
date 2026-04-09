import type { GenerationModelConfig } from '../shared/generation-contract';
export type { GenerationModelConfig };

export type GenerationPhase = 'architect' | 'drafter' | 'advisor' | 'repair' | 'contentQuality' | 'narrativeReview';

export type ModelFamily = 'openai' | 'ollama';

export const MAX_OLLAMA_BUNDLES_PER_JOB = 2;

const LANGUAGE_MODEL_KEYS = [
  'architectModel',
  'drafterModel',
  'advisorModel',
  'repairModel',
  'contentQualityModel',
  'narrativeReviewModel',
] as const;

const ALL_MODEL_KEYS = [...LANGUAGE_MODEL_KEYS, 'embeddingModel'] as const;

function getDefaultArchitectModel(): string {
  return process.env.ARCHITECT_MODEL || process.env.CONCEPT_MODEL || 'gpt-4.1-mini';
}

function getDefaultDrafterModel(): string {
  return process.env.DRAFTER_MODEL || 'gpt-4.1';
}

function getDefaultRepairModel(): string {
  return process.env.REPAIR_MODEL || 'gpt-4.1-mini';
}

function getDefaultNarrativeReviewModel(): string {
  return process.env.NARRATIVE_REVIEW_MODEL || 'gpt-4.1-mini';
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

export function getMaxBundlesPerJob(modelConfig?: GenerationModelConfig): number {
  return isOllamaGeneration(modelConfig) ? MAX_OLLAMA_BUNDLES_PER_JOB : Number.POSITIVE_INFINITY;
}

export function exceedsBundleLimitForModel(bundleCount: number, modelConfig?: GenerationModelConfig): boolean {
  return bundleCount > getMaxBundlesPerJob(modelConfig);
}

/**
 * Optimal Ollama model selection per generation phase.
 * Semantic aliases (ai-reasoning, ai-coding, ai-fast, ai-general) are preferred first
 * as they are purpose-mapped on the Corsair server. Falls back to raw model names
 * for servers without the aliased setup.
 *
 * Phase strategy:
 * - architect: needs creative/general intelligence, NOT reasoning (DeepSeek-R1 burns 200s+ on thinking tokens)
 * - drafter: needs structured JSON output fidelity — coding-tuned models excel here
 * - advisor: speed matters most; 8B is sufficient for feedback synthesis
 * - repair: coding model for structured fix generation
 * - contentQuality/narrativeReview: general intelligence, medium speed
 *
 * Model tier on Corsair (64GB VRAM):
 *   ai-general   = qwen3.5:35b (preferred) or qwen3:30b MoE — 62 tok/s, creative/general
 *   ai-coding    = qwen3-coder:30b MoE — 63 tok/s, structured output
 *   ai-fast      = qwen3:8b — 38 tok/s, low latency
 *   ai-reasoning = deepseek-r1:32b — 11 tok/s (avoid for non-math phases)
 */
const OLLAMA_PHASE_PREFERENCE: Record<GenerationPhase, string[]> = {
  architect:       ['ai-general', 'qwen3.5:35b', 'qwen3:30b', 'ai-coding', 'qwen3-coder:30b', 'phi4:14b', 'gemma3:12b', 'mistral-small:24b', 'ai-fast', 'qwen3:8b'],
  drafter:         ['ai-coding', 'devstral-small-2', 'qwen3-coder:30b', 'ai-general', 'qwen3.5:35b', 'qwen3:30b', 'phi4:14b', 'gemma3:12b', 'mistral-small:24b', 'ai-fast', 'qwen3:8b'],
  advisor:         ['ai-fast', 'qwen3:8b', 'ai-general', 'qwen3.5:35b', 'gemma3:12b'],
  repair:          ['ai-coding', 'devstral-small-2', 'qwen3-coder:30b', 'ai-general', 'qwen3.5:35b', 'ai-fast', 'qwen3:8b', 'gemma3:12b'],
  contentQuality:  ['ai-general', 'qwen3.5:35b', 'qwen3:30b', 'gemma3:12b', 'ai-fast', 'qwen3:8b'],
  narrativeReview: ['ai-general', 'qwen3.5:35b', 'qwen3:30b', 'phi4:14b', 'gemma3:12b', 'ai-fast', 'qwen3:8b'],
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
    advisorModel: resolve('advisor'),
    repairModel: resolve('repair'),
    contentQualityModel: resolve('contentQuality'),
    narrativeReviewModel: resolve('narrativeReview'),
  };
}

const SHORTHAND_TO_CANONICAL: Record<string, keyof GenerationModelConfig> = {
  architect: 'architectModel',
  drafter: 'drafterModel',
  advisor: 'advisorModel',
  repair: 'repairModel',
  contentQuality: 'contentQualityModel',
  narrativeReview: 'narrativeReviewModel',
  embedding: 'embeddingModel',
};

export function normalizeModelConfig(config?: Record<string, unknown> | null): GenerationModelConfig | undefined {
  if (!config) return undefined;
  const result: Record<string, unknown> = { ...config };
  for (const [shorthand, canonical] of Object.entries(SHORTHAND_TO_CANONICAL)) {
    if (shorthand in result && !(canonical in result)) {
      result[canonical] = result[shorthand];
      delete result[shorthand];
    }
  }
  return result as GenerationModelConfig;
}

export function hasMeaningfulModelConfig(config?: GenerationModelConfig | null): boolean {
  return LANGUAGE_MODEL_KEYS.some(
    (key) => typeof config?.[key] === 'string' && (config[key] as string).length > 0
  );
}

export async function fetchOllamaModels(baseUrl: string): Promise<string[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${baseUrl}/models`, {
      headers: { Authorization: 'Bearer ollama' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || []).map((m: { id?: string }) => m.id).filter(Boolean) as string[];
  } catch {
    return [];
  }
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
    case 'advisor':
      return modelConfig?.advisorModel || (isOllama ? ollamaFallback() : 'gpt-4.1-mini');
    case 'repair':
      return modelConfig?.repairModel || (isOllama ? ollamaFallback() : getDefaultRepairModel());
    case 'contentQuality':
      return modelConfig?.contentQualityModel || (isOllama ? ollamaFallback() : 'gpt-4.1-mini');
    case 'narrativeReview':
      return modelConfig?.narrativeReviewModel || (isOllama ? ollamaFallback() : getDefaultNarrativeReviewModel());
  }
}

export function buildOpenAIFullSendModelConfig(): GenerationModelConfig {
  return {
    architectModel: process.env.FULL_SEND_ARCHITECT_MODEL || 'gpt-4.1-mini',
    drafterModel: process.env.FULL_SEND_DRAFTER_MODEL || 'gpt-4.1',
    advisorModel: process.env.FULL_SEND_ADVISOR_MODEL || 'gpt-4.1-mini',
    repairModel: process.env.FULL_SEND_REPAIR_MODEL || 'gpt-4.1-mini',
    contentQualityModel: process.env.FULL_SEND_CONTENT_QUALITY_MODEL || 'gpt-4.1-mini',
    narrativeReviewModel: process.env.FULL_SEND_NARRATIVE_REVIEW_MODEL || 'gpt-4.1-mini',
    embeddingModel: process.env.FULL_SEND_EMBEDDING_MODEL || 'text-embedding-3-small',
  };
}

export function getResolvedGenerationModels(modelConfig?: GenerationModelConfig): {
  architect: string;
  blueprint: string;
  drafter: string;
  advisor: string;
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
    advisor: resolvePhaseModel(modelConfig, 'advisor'),
    repair: resolvePhaseModel(modelConfig, 'repair'),
    contentQuality: resolvePhaseModel(modelConfig, 'contentQuality'),
    narrativeReview: resolvePhaseModel(modelConfig, 'narrativeReview'),
    embedding: modelConfig?.embeddingModel || getDefaultEmbeddingModel(),
  };
}
