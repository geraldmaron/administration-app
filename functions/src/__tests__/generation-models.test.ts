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
      ADVISOR_MODEL: 'gpt-4.1-mini',
      REPAIR_MODEL: 'gpt-4o-mini',
      CONTENT_QUALITY_MODEL: 'gpt-4.1-mini',
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

  it('resolves gpt-* models when env overrides set them (routed via OpenRouter in production)', () => {
    expect(getResolvedGenerationModels()).toEqual({
      architect: 'gpt-4o-mini',
      advisor: 'gpt-4.1-mini',
      blueprint: 'gpt-4o-mini',
      drafter: 'gpt-4o-mini',
      repair: 'gpt-4o-mini',
      contentQuality: 'gpt-4.1-mini',
      narrativeReview: 'gpt-4o-mini',
      embedding: 'text-embedding-3-small',
    });
  });

  it('resolves OpenRouter-style defaults when phase env vars are unset', () => {
    process.env = { ...originalEnv };
    delete process.env.ARCHITECT_MODEL;
    delete process.env.CONCEPT_MODEL;
    delete process.env.DRAFTER_MODEL;
    delete process.env.REPAIR_MODEL;
    delete process.env.NARRATIVE_REVIEW_MODEL;
    delete process.env.ADVISOR_MODEL;
    delete process.env.CONTENT_QUALITY_MODEL;
    delete process.env.EMBEDDING_MODEL;
    delete process.env.USE_OPENAI_DIRECT;
    delete process.env.USE_OPENROUTER_DEFAULTS;
    expect(getResolvedGenerationModels()).toEqual({
      architect: 'google/gemini-2.5-flash',
      advisor: 'google/gemini-2.0-flash-001',
      blueprint: 'google/gemini-2.5-flash',
      drafter: 'openai/gpt-4.1-mini',
      repair: 'openai/gpt-4.1-mini',
      contentQuality: 'google/gemini-2.0-flash-001',
      narrativeReview: 'google/gemini-2.5-flash',
      embedding: 'openai/text-embedding-3-small',
    });
  });

  it('uses openrouter model family for cloud-only runs', () => {
    process.env = { ...originalEnv };
    delete process.env.USE_OPENAI_DIRECT;
    expect(getModelFamily()).toBe('openrouter');
  });

  it('strips the ollama prefix only when present', () => {
    expect(stripOllamaPrefix('ollama:qwen3:14b')).toBe('qwen3:14b');
    expect(stripOllamaPrefix('gpt-4o-mini')).toBe('gpt-4o-mini');
  });
});
