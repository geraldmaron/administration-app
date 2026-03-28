import type { GenerationJobRequest } from '@/lib/types';

type GenerationModelConfig = NonNullable<GenerationJobRequest['modelConfig']>;

const MODEL_KEYS = [
  'architectModel',
  'drafterModel',
  'repairModel',
  'contentQualityModel',
  'narrativeReviewModel',
  'embeddingModel',
] as const;

export function isOllamaModel(model?: string): boolean {
  return Boolean(model?.startsWith('ollama:'));
}

export function stripOllamaPrefix(model: string): string {
  return isOllamaModel(model) ? model.slice('ollama:'.length) : model;
}

export function getRequestedOllamaModels(modelConfig?: GenerationModelConfig): string[] {
  return MODEL_KEYS
    .map((key) => modelConfig?.[key])
    .filter((model): model is string => typeof model === 'string' && isOllamaModel(model));
}

export function hasRequestedOllamaModel(modelConfig?: GenerationModelConfig): boolean {
  return getRequestedOllamaModels(modelConfig).length > 0;
}

type GenerationPhase = 'architect' | 'drafter' | 'repair' | 'contentQuality' | 'narrativeReview';

const OLLAMA_PHASE_PREFERENCE: Record<GenerationPhase, string[]> = {
  architect: ['ai-reasoning', 'deepseek-r1:32b', 'ai-general', 'qwen3:30b', 'deepseek-r1:14b'],
  drafter: ['ai-reasoning', 'deepseek-r1:32b', 'ai-general', 'qwen3:30b', 'mistral-small:24b'],
  repair: ['ai-coding', 'ai-general', 'qwen3-coder:30b', 'qwen3:30b'],
  contentQuality: ['ai-fast', 'ai-general', 'qwen3:8b', 'gemma3:12b'],
  narrativeReview: ['ai-fast', 'ai-general', 'qwen3:8b', 'gemma3:12b'],
};

function resolveOllamaPhaseModel(phase: GenerationPhase, availableModels: string[]): string {
  for (const pref of OLLAMA_PHASE_PREFERENCE[phase]) {
    const match = availableModels.find(m => m === pref || m.startsWith(`${pref}:`));
    if (match) return match;
  }
  return availableModels[0] ?? 'ai-general:latest';
}

export function buildOllamaModelConfig(availableModels: string[]): GenerationModelConfig {
  const resolve = (phase: GenerationPhase): string =>
    `ollama:${resolveOllamaPhaseModel(phase, availableModels)}`;
  return {
    architectModel: resolve('architect'),
    drafterModel: resolve('drafter'),
    repairModel: resolve('repair'),
    contentQualityModel: resolve('contentQuality'),
    narrativeReviewModel: resolve('narrativeReview'),
  };
}