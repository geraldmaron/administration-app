import {
  exceedsBundleLimitForModel,
  getModelFamily,
  getMaxBundlesPerJob,
  getRequestedOllamaModels,
  getResolvedGenerationModels,
  isOllamaGeneration,
  resolvePhaseModel,
  stripOllamaPrefix,
} from '../lib/generation-models';

describe('generation-models', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      ARCHITECT_MODEL: 'gpt-4o-mini',
      CONCEPT_MODEL: 'gpt-4o-mini',
      DRAFTER_MODEL: 'gpt-4o-mini',
      REPAIR_MODEL: 'gpt-4o-mini',
      NARRATIVE_REVIEW_MODEL: 'gpt-4o-mini',
      EMBEDDING_MODEL: 'text-embedding-3-small',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('inherits the first requested ollama model for repair and review phases', () => {
    const modelConfig = {
      architectModel: 'ollama:qwen3:30b',
      drafterModel: 'ollama:qwen3:30b',
    };

    expect(isOllamaGeneration(modelConfig)).toBe(true);
    expect(getModelFamily(modelConfig)).toBe('ollama');
    expect(resolvePhaseModel(modelConfig, 'repair')).toBe('ollama:qwen3:30b');
    expect(resolvePhaseModel(modelConfig, 'contentQuality')).toBe('ollama:qwen3:30b');
    expect(resolvePhaseModel(modelConfig, 'narrativeReview')).toBe('ollama:qwen3:30b');
  });

  it('keeps mixed runs openai-backed while still exposing requested ollama models', () => {
    const modelConfig = {
      architectModel: 'gpt-4o-mini',
      drafterModel: 'ollama:qwen3:14b',
      embeddingModel: 'text-embedding-3-small',
    };

    expect(isOllamaGeneration(modelConfig)).toBe(true);
    expect(getModelFamily(modelConfig)).toBe('ollama');
    expect(getRequestedOllamaModels(modelConfig, { includeEmbedding: true })).toEqual(['ollama:qwen3:14b']);
    expect(resolvePhaseModel(modelConfig, 'architect')).toBe('gpt-4o-mini');
    expect(resolvePhaseModel(modelConfig, 'repair')).toBe('ollama:qwen3:14b');
  });

  it('applies stricter bundle limits for ollama generation jobs', () => {
    const modelConfig = {
      drafterModel: 'ollama:phi4:14b',
    };

    expect(getMaxBundlesPerJob(modelConfig)).toBe(2);
    expect(exceedsBundleLimitForModel(3, modelConfig)).toBe(true);
    expect(exceedsBundleLimitForModel(2, modelConfig)).toBe(false);
    expect(exceedsBundleLimitForModel(10)).toBe(false);
  });

  it('resolves default models when no overrides are provided', () => {
    expect(getResolvedGenerationModels()).toEqual({
      architect: 'gpt-4o-mini',
      advisor: 'gpt-4o-mini',
      blueprint: 'gpt-4o-mini',
      drafter: 'gpt-4o-mini',
      repair: 'gpt-4o-mini',
      contentQuality: 'gpt-4o-mini',
      narrativeReview: 'gpt-4o-mini',
      embedding: 'text-embedding-3-small',
    });
  });

  it('strips the ollama prefix only when present', () => {
    expect(stripOllamaPrefix('ollama:qwen3:14b')).toBe('qwen3:14b');
    expect(stripOllamaPrefix('gpt-4o-mini')).toBe('gpt-4o-mini');
  });
});
