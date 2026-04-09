import type { GenerationJobRequest } from '@/lib/types';

type GenerationModelConfig = NonNullable<GenerationJobRequest['modelConfig']>;

const MODEL_KEYS = [
  'architectModel',
  'drafterModel',
  'advisorModel',
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

type GenerationPhase = 'architect' | 'drafter' | 'advisor' | 'repair' | 'contentQuality' | 'narrativeReview';

const OLLAMA_PHASE_PREFERENCE: Record<GenerationPhase, string[]> = {
  architect:       ['ai-general', 'qwen3.5:35b', 'qwen3:30b', 'ai-coding', 'qwen3-coder:30b', 'phi4:14b', 'gemma3:12b', 'mistral-small:24b', 'ai-fast', 'qwen3:8b'],
  drafter:         ['ai-coding', 'devstral-small-2', 'qwen3-coder:30b', 'ai-general', 'qwen3.5:35b', 'qwen3:30b', 'phi4:14b', 'gemma3:12b', 'mistral-small:24b', 'ai-fast', 'qwen3:8b'],
  advisor:         ['ai-fast', 'qwen3:8b', 'ai-general', 'qwen3.5:35b', 'gemma3:12b'],
  repair:          ['ai-coding', 'devstral-small-2', 'qwen3-coder:30b', 'ai-general', 'qwen3.5:35b', 'ai-fast', 'qwen3:8b', 'gemma3:12b'],
  contentQuality:  ['ai-general', 'qwen3.5:35b', 'qwen3:30b', 'gemma3:12b', 'ai-fast', 'qwen3:8b'],
  narrativeReview: ['ai-general', 'qwen3.5:35b', 'qwen3:30b', 'phi4:14b', 'gemma3:12b', 'ai-fast', 'qwen3:8b'],
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
    advisorModel: resolve('advisor'),
    repairModel: resolve('repair'),
    contentQualityModel: resolve('contentQuality'),
    narrativeReviewModel: resolve('narrativeReview'),
  };
}

export function hasMeaningfulModelConfig(config?: GenerationModelConfig | null): boolean {
  return MODEL_KEYS.some(
    (key) => typeof config?.[key] === 'string' && (config[key] as string).length > 0,
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
