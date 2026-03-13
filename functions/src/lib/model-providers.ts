/**
 * Model Providers Module
 * 
 * OpenAI-only model routing for generation phases.
 * Moonshot environment variables remain supported as legacy config but are
 * not used by runtime routing.
 */

import * as json5 from 'json5';

// Environment configuration - using getters for lazy evaluation
// This ensures secrets injected by Firebase are available at call time
function getOpenAIApiKey(): string {
  return process.env.OPENAI_API_KEY || '';
}

function getOpenAIBaseUrl(): string {
  return process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
}

// Legacy compatibility: retained for non-routing code paths
function getMoonshotApiKey(): string {
  return process.env.MOONSHOT_API_KEY || '';
}

// Legacy compatibility: retained for non-routing code paths
function getMoonshotBaseUrl(): string {
  return process.env.MOONSHOT_BASE_URL || 'https://api.moonshot.ai/v1';
}

// Model configuration per phase - also lazy to support runtime config
export function getPhaseModels() {
  return {
    concept: process.env.CONCEPT_MODEL || 'gpt-4o-mini',
    blueprint: process.env.BLUEPRINT_MODEL || 'gpt-4o-mini',
    drafter: process.env.DRAFTER_MODEL || 'gpt-4o-mini',
    embedding: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
    repair: process.env.REPAIR_MODEL || 'gpt-4o-mini',
  };
}

// Legacy export for backward compatibility
export const PHASE_MODELS = {
  get concept() { return process.env.CONCEPT_MODEL || 'gpt-4o-mini'; },
  get blueprint() { return process.env.BLUEPRINT_MODEL || 'gpt-4o-mini'; },
  get drafter() { return process.env.DRAFTER_MODEL || 'gpt-4o-mini'; },
  get embedding() { return process.env.EMBEDDING_MODEL || 'text-embedding-3-small'; },
};

// Provider detection from model name
export type Provider = 'openai' | 'moonshot';

function getProvider(modelName: string): Provider {
  if (
    modelName.startsWith('gpt-') ||
    modelName.startsWith('o1') ||
    modelName.startsWith('o3') ||
    modelName.startsWith('text-embedding')
  ) {
    return 'openai';
  }
  throw new Error(`Unsupported model for OpenAI-only mode: ${modelName}`);
}

// Model configuration
export interface ModelConfig {
  maxTokens: number;
  temperature?: number;
  topP?: number;
  thinking?: { type: 'enabled' | 'disabled' };
}

// Default configs per phase
export const PHASE_CONFIGS: Record<string, ModelConfig> = {
  concept: { maxTokens: 4096, temperature: 0.7 },
  blueprint: { maxTokens: 4096, temperature: 0.6 },
  drafter: { maxTokens: 12288, temperature: 0.7 },
  repair: { maxTokens: 4096, temperature: 0.3 },
};

// Timeout configuration per model
function getModelTimeout(modelName: string): number {
  if (modelName.startsWith('o1')) return 120000; // 2 min for reasoning models
  if (modelName.startsWith('o3')) return 120000;
  if (modelName.startsWith('gpt-4o-mini')) return 60000; // 1 min
  return 90000;
}

// Cost tracking
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  provider: Provider;
  model: string;
}

export interface CallResult<T> {
  data: T | null;
  usage: TokenUsage | null;
  error?: string;
}

interface RetryTelemetry {
  rateLimitRetries: number;
  serverRetries: number;
}

let retryTelemetry: RetryTelemetry = {
  rateLimitRetries: 0,
  serverRetries: 0,
};

export function resetProviderRetryTelemetry(): void {
  retryTelemetry = { rateLimitRetries: 0, serverRetries: 0 };
}

export function getProviderRetryTelemetry(): RetryTelemetry {
  return { ...retryTelemetry };
}

// ---------------------------------------------------------------------------
// Concurrency Semaphore
// ---------------------------------------------------------------------------
// OpenAI gpt-4o-mini binding constraint is TPM.
// Tier 2 (2M TPM): ~14K tokens/call → ~142 calls/min max → ~35 safe concurrent.
// Tier 1 (200K TPM): ~14 safe concurrent.
// Default of 20 is conservative for Tier 2 and workable for most Tier 1 workloads.
// Override with OPENAI_MAX_CONCURRENT env var.

class Semaphore {
  private permits: number;
  private readonly queue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return Promise.resolve();
    }
    return new Promise(resolve => this.queue.push(resolve));
  }

  release(): void {
    const next = this.queue.shift();
    if (next) {
      next();
    } else {
      this.permits++;
    }
  }
}

const OPENAI_MAX_CONCURRENT = parseInt(process.env.OPENAI_MAX_CONCURRENT || '20', 10);
const openAISemaphore = new Semaphore(OPENAI_MAX_CONCURRENT);

/**
 * Call OpenAI API
 */
async function callOpenAI<T>(
  config: ModelConfig,
  prompt: string,
  schema: object,
  modelOverride?: string
): Promise<CallResult<T>> {
  const modelToUse = modelOverride || 'gpt-4o-mini';
  const timeout = getModelTimeout(modelToUse);
  const maxRetries = 3;
  const baseDelay = 2000;

  const apiKey = getOpenAIApiKey();
  const baseUrl = getOpenAIBaseUrl();

  if (!apiKey) {
    console.error('[OpenAI API] No API key configured');
    return { data: null, usage: null, error: 'No OpenAI API key' };
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const requestBody: Record<string, any> = {
        model: modelToUse,
        messages: [
          {
            role: 'system',
            content: 'You are a precise JSON generator for a geopolitical simulation game. Generate realistic, nuanced political scenarios. Always respond with valid JSON matching the requested schema. Never include explanatory text.'
          },
          {
            role: 'user',
            content: `${prompt}\n\nRespond with ONLY valid JSON matching this schema:\n${JSON.stringify(schema, null, 2)}`
          }
        ],
        max_completion_tokens: config.maxTokens,
        response_format: { type: 'json_object' }
      };

      // Apply temperature for non-reasoning models
      if (config.temperature !== undefined && !modelToUse.startsWith('o1')) {
        requestBody.temperature = config.temperature;
      }

      console.log(`[OpenAI API] Request to ${modelToUse} (attempt ${attempt + 1}/${maxRetries + 1})`);

      await openAISemaphore.acquire();
      let response: Response;
      try {
        response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeoutId);
        openAISemaphore.release();
      }
      const elapsed = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[OpenAI API] Error ${response.status} after ${elapsed}ms: ${errorText.substring(0, 500)}`);

        if (response.status === 429 || response.status >= 500) {
          if (response.status === 429) {
            retryTelemetry.rateLimitRetries++;
          } else {
            retryTelemetry.serverRetries++;
          }
          if (attempt < maxRetries) {
            // Respect Retry-After header if present (in seconds)
            const retryAfterHeader = response.headers.get('retry-after');
            const retryAfterMs = retryAfterHeader ? parseFloat(retryAfterHeader) * 1000 : 0;
            // Exponential backoff with full jitter to avoid thundering herd
            const backoff = baseDelay * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5);
            const delay = Math.max(retryAfterMs, backoff);
            console.warn(`[OpenAI API] Retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        return { data: null, usage: null, error: `HTTP ${response.status}` };
      }

      const data = await response.json();
      const responseText = data.choices?.[0]?.message?.content?.trim();
      const usage: TokenUsage = {
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0,
        provider: 'openai',
        model: modelToUse
      };

      console.log(`[OpenAI API] Response in ${elapsed}ms, tokens: ${usage.inputTokens}+${usage.outputTokens}`);

      if (!responseText) {
        return { data: null, usage, error: 'Empty response' };
      }

      try {
        let cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) cleaned = jsonMatch[0];
        return { data: JSON.parse(cleaned), usage };
      } catch {
        try {
          return { data: json5.parse(responseText), usage };
        } catch (e) {
          console.error('[OpenAI API] Failed to parse JSON:', e);
          return { data: null, usage, error: 'JSON parse error' };
        }
      }
    } catch (error) {
      const elapsed = Date.now() - startTime;
      if (error instanceof Error && error.name === 'AbortError') {
        console.error(`[OpenAI API] Timeout after ${elapsed}ms`);
        if (attempt < maxRetries) continue;
        return { data: null, usage: null, error: 'Timeout' };
      }
      console.error(`[OpenAI API] Error after ${elapsed}ms:`, error);
      if (attempt < maxRetries) {
        const backoff = baseDelay * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5);
        await new Promise(resolve => setTimeout(resolve, backoff));
        continue;
      }
      return { data: null, usage: null, error: String(error) };
    }
  }

  return { data: null, usage: null, error: 'Max retries exceeded' };
}

/**
 * Call Moonshot API
 */
async function callMoonshot<T>(
  config: ModelConfig,
  prompt: string,
  schema: object,
  modelOverride?: string
): Promise<CallResult<T>> {
  const modelToUse = modelOverride || 'kimi-k2-turbo-preview';
  const isK25 = modelToUse === 'kimi-k2.5';
  const timeout = getModelTimeout(modelToUse);
  const maxRetries = 3;
  const baseDelay = 3000;

  const apiKey = getMoonshotApiKey();
  const baseUrl = getMoonshotBaseUrl();

  if (!apiKey) {
    console.error('[Moonshot API] No API key configured');
    return { data: null, usage: null, error: 'No Moonshot API key' };
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const requestBody: Record<string, any> = {
        model: modelToUse,
        messages: [
          {
            role: 'system',
            content: 'You are a precise JSON generator for a geopolitical simulation game. Generate realistic, nuanced political scenarios. Always respond with valid JSON matching the requested schema. Never include explanatory text.'
          },
          {
            role: 'user',
            content: `${prompt}\n\nRespond with ONLY valid JSON matching this schema:\n${JSON.stringify(schema, null, 2)}`
          }
        ],
        max_completion_tokens: config.maxTokens,
        response_format: { type: 'json_object' }
      };

      if (isK25) {
        if (config.thinking) requestBody.thinking = config.thinking;
      } else {
        if (config.temperature !== undefined) requestBody.temperature = config.temperature;
        if (config.topP !== undefined) requestBody.top_p = config.topP;
      }

      console.log(`[Moonshot API] Request to ${modelToUse} (attempt ${attempt + 1}/${maxRetries + 1})`);

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const elapsed = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Moonshot API] Error ${response.status} after ${elapsed}ms: ${errorText.substring(0, 500)}`);

        if (response.status === 400) {
          return { data: null, usage: null, error: 'Bad request' };
        }

        if ((response.status === 429 || response.status >= 500) && attempt < maxRetries) {
          if (response.status === 429) {
            retryTelemetry.rateLimitRetries++;
          } else {
            retryTelemetry.serverRetries++;
          }
          // Respect Retry-After header if present (in seconds)
          const retryAfterHeader = response.headers.get('retry-after');
          const retryAfterMs = retryAfterHeader ? parseFloat(retryAfterHeader) * 1000 : 0;
          // Exponential backoff with full jitter to avoid thundering herd
          const backoff = baseDelay * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5);
          const delay = Math.max(retryAfterMs, backoff);
          console.warn(`[Moonshot API] Retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        return { data: null, usage: null, error: `HTTP ${response.status}` };
      }

      const data = await response.json();
      const responseText = data.choices?.[0]?.message?.content?.trim();
      const usage: TokenUsage = {
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0,
        provider: 'moonshot',
        model: modelToUse
      };

      console.log(`[Moonshot API] Response in ${elapsed}ms, tokens: ${usage.inputTokens}+${usage.outputTokens}`);

      if (!responseText) {
        return { data: null, usage, error: 'Empty response' };
      }

      try {
        let cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) cleaned = jsonMatch[0];
        return { data: JSON.parse(cleaned), usage };
      } catch {
        try {
          return { data: json5.parse(responseText), usage };
        } catch (e) {
          console.error('[Moonshot API] Failed to parse JSON:', e);
          return { data: null, usage, error: 'JSON parse error' };
        }
      }
    } catch (error) {
      const elapsed = Date.now() - startTime;
      if (error instanceof Error && error.name === 'AbortError') {
        console.error(`[Moonshot API] Timeout after ${elapsed}ms`);
        if (isK25) return { data: null, usage: null, error: 'Timeout (k2.5)' };
        if (attempt < maxRetries) continue;
        return { data: null, usage: null, error: 'Timeout' };
      }
      console.error(`[Moonshot API] Error after ${elapsed}ms:`, error);
      if (attempt < maxRetries) {
        const backoff = baseDelay * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5);
        await new Promise(resolve => setTimeout(resolve, backoff));
        continue;
      }
      return { data: null, usage: null, error: String(error) };
    }
  }

  return { data: null, usage: null, error: 'Max retries exceeded' };
}

/**
 * Unified model call router
 * Routes to appropriate provider based on model name
 */
export async function callModelProvider<T>(
  config: ModelConfig,
  prompt: string,
  schema: object,
  modelOverride?: string
): Promise<CallResult<T>> {
  const modelToUse = modelOverride || PHASE_MODELS.drafter;
  const provider = getProvider(modelToUse);
  if (provider === 'openai') {
    return callOpenAI<T>(config, prompt, schema, modelToUse);
  }
  return callMoonshot<T>(config, prompt, schema, modelToUse);
}

/**
 * Generate embeddings using OpenAI
 * Uses text-embedding-3-small for cost efficiency ($0.02/1M tokens)
 */
export async function generateEmbedding(text: string): Promise<{ embedding: number[] | null; usage: TokenUsage | null }> {
  const modelToUse = PHASE_MODELS.embedding;
  const apiKey = getOpenAIApiKey();
  const baseUrl = getOpenAIBaseUrl();

  if (!apiKey) {
    console.error('[OpenAI Embedding] No API key configured');
    return { embedding: null, usage: null };
  }

  try {
    const response = await fetch(`${baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelToUse,
        input: text.substring(0, 8000), // Limit input for cost
        encoding_format: 'float'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[OpenAI Embedding] Error ${response.status}: ${errorText.substring(0, 200)}`);
      return { embedding: null, usage: null };
    }

    const data = await response.json();
    const usage: TokenUsage = {
      inputTokens: data.usage?.total_tokens || 0,
      outputTokens: 0,
      provider: 'openai',
      model: modelToUse
    };

    return { embedding: data.data?.[0]?.embedding || null, usage };
  } catch (error) {
    console.error('[OpenAI Embedding] Error:', error);
    return { embedding: null, usage: null };
  }
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

/**
 * Cost calculation helpers (USD per 1M tokens)
 */
const COST_PER_MILLION: Record<string, { input: number; output: number }> = {
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4o': { input: 2.50, output: 10.00 },
  'o1-mini': { input: 1.10, output: 4.40 },
  'o3-mini': { input: 1.10, output: 4.40 },
  'text-embedding-3-small': { input: 0.02, output: 0 },
};

export function calculateCost(usage: TokenUsage): number {
  const costs = COST_PER_MILLION[usage.model] || { input: 0.50, output: 2.00 };
  return (usage.inputTokens * costs.input + usage.outputTokens * costs.output) / 1_000_000;
}

/**
 * Aggregate costs from multiple usages
 */
export function aggregateCosts(usages: (TokenUsage | null)[]): {
  openai: { inputTokens: number; outputTokens: number; costUsd: number };
  moonshot: { inputTokens: number; outputTokens: number; costUsd: number };
  totalUsd: number;
} {
  const result = {
    openai: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
    moonshot: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
    totalUsd: 0
  };

  for (const usage of usages) {
    if (!usage) continue;
    const cost = calculateCost(usage);
    
    if (usage.provider === 'openai') {
      result.openai.inputTokens += usage.inputTokens;
      result.openai.outputTokens += usage.outputTokens;
      result.openai.costUsd += cost;
    } else {
      result.moonshot.inputTokens += usage.inputTokens;
      result.moonshot.outputTokens += usage.outputTokens;
      result.moonshot.costUsd += cost;
    }
    result.totalUsd += cost;
  }

  return result;
}
