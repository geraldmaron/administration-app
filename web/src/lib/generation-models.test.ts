import { describe, expect, it } from 'vitest';
import { getRequestedOllamaModels, hasRequestedOllamaModel, stripOllamaPrefix } from './generation-models';

describe('web generation-models', () => {
  it('detects requested ollama models across the admin request config', () => {
    const modelConfig = {
      architectModel: 'gpt-4o-mini',
      drafterModel: 'ollama:qwen3:14b',
      contentQualityModel: 'ollama:qwen3:14b',
    };

    expect(hasRequestedOllamaModel(modelConfig)).toBe(true);
    expect(getRequestedOllamaModels(modelConfig)).toEqual(['ollama:qwen3:14b', 'ollama:qwen3:14b']);
  });

  it('strips ollama prefixes for direct probes only', () => {
    expect(stripOllamaPrefix('ollama:qwen3:14b')).toBe('qwen3:14b');
    expect(stripOllamaPrefix('gpt-4o-mini')).toBe('gpt-4o-mini');
  });
});