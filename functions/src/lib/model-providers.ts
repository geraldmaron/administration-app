/**
 * Model Providers Module
 *
 * OpenAI and LM Studio model routing for generation phases.
 */

import * as json5 from 'json5';

// Environment configuration - using getters for lazy evaluation
// This ensures secrets injected by Firebase are available at call time
function getOpenAIApiKey(): string {
  const key = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || '';
  if (!key) {
    console.debug('[OpenAI API] No API key configured via OPENAI_API_KEY or OPENAI_KEY');
  }
  return key;
}

function getOpenAIBaseUrl(): string {
  return process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
}

function describeError(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  let msg = err.message;
  const cause = (err as unknown as { cause?: unknown }).cause;
  if (cause) {
    msg += ` — cause: ${cause instanceof Error ? cause.message : String(cause)}`;
  }
  return msg;
}

function getLMStudioBaseUrl(): string {
  return process.env.LMSTUDIO_BASE_URL || 'http://localhost:1234/v1';
}

function getLMStudioModel(): string {
  return process.env.LMSTUDIO_MODEL || '';
}

// Model configuration per phase - also lazy to support runtime config
export function getPhaseModels() {
  return {
    concept: process.env.CONCEPT_MODEL || 'gpt-4o-mini',
    blueprint: process.env.BLUEPRINT_MODEL || 'gpt-4o-mini',
    drafter: process.env.DRAFTER_MODEL || 'gpt-4o-mini',
    embedding: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
    repair: process.env.REPAIR_MODEL || 'gpt-4o-mini',
    narrativeReview: process.env.NARRATIVE_REVIEW_MODEL || 'gpt-4o-mini',
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
export type Provider = 'openai' | 'lmstudio';

function getProvider(modelName: string): Provider {
  if (modelName.startsWith('lmstudio:')) {
    return 'lmstudio';
  }
  if (
    modelName.startsWith('gpt-') ||
    modelName.startsWith('o1') ||
    modelName.startsWith('o3') ||
    modelName.startsWith('text-embedding')
  ) {
    return 'openai';
  }
  // If LM Studio is configured, route unknown models there
  if (getLMStudioBaseUrl() && getLMStudioModel()) {
    return 'lmstudio';
  }
  throw new Error(`Unsupported model for OpenAI-only mode: ${modelName}`);
}

// Model configuration
export interface ModelConfig {
  maxTokens: number;
  temperature?: number;
  topP?: number;
  timeoutMs?: number; // Override default model timeout
}

// Default configs per phase
export const PHASE_CONFIGS: Record<string, ModelConfig> = {
  concept: { maxTokens: 4096, temperature: 0.7 },
  blueprint: { maxTokens: 4096, temperature: 0.6 },
  // drafter generates ~14K input + 3K output tokens; under Tier 1 rate limits
  // concurrent calls regularly take 60-120s+ when throttled. 300s keeps the call
  // alive within the Cloud Function's 540s budget.
  drafter: { maxTokens: 12288, temperature: 0.7, timeoutMs: 300000 },
  repair: { maxTokens: 4096, temperature: 0.3 },
};

// Timeout configuration per model (used unless config.timeoutMs is set)
function getModelTimeout(modelName: string): number {
  if (modelName.startsWith('o1')) return 120000; // 2 min for reasoning models
  if (modelName.startsWith('o3')) return 120000;
  if (modelName.startsWith('gpt-4o-mini')) return 240000; // 4 min — large drafter prompts routinely take 60-100s
  if (modelName.startsWith('gpt-4.1-mini')) return 240000;
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
// Concurrency Semaphore + TPM Throttle
// ---------------------------------------------------------------------------
// OpenAI gpt-4o-mini binding constraint is TPM.
// Tier 2 (2M TPM): ~17K tokens/call → ~117 safe calls/min → ~30 concurrent.
// Tier 1 (200K TPM): ~11 safe calls/min → 3 concurrent at drafter scale.
// Default of 3 is safe for Tier 1; override with OPENAI_MAX_CONCURRENT env var.

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

// TPM throttle: tracks tokens used in the current 60s window and gates new requests
// when the budget is almost exhausted. Budget and window are configurable via env vars.
class TpmThrottle {
  private readonly limitTpm: number;
  private usedThisWindow = 0;
  private windowStart = Date.now();

  constructor(limitTpm: number) {
    this.limitTpm = limitTpm;
  }

  private reset(): void {
    this.usedThisWindow = 0;
    this.windowStart = Date.now();
  }

  private msUntilReset(): number {
    return Math.max(0, 60000 - (Date.now() - this.windowStart));
  }

  /** Call before sending a request. Waits until enough TPM budget is available. */
  async reserve(estimatedTokens: number): Promise<void> {
    while (true) {
      const elapsed = Date.now() - this.windowStart;
      if (elapsed >= 60000) this.reset();

      if (this.usedThisWindow + estimatedTokens <= this.limitTpm * 0.9) {
        this.usedThisWindow += estimatedTokens;
        return;
      }

      const wait = this.msUntilReset() + 200;
      console.warn(`[TpmThrottle] Budget nearly exhausted (${this.usedThisWindow}/${this.limitTpm} TPM). Waiting ${wait}ms for window reset.`);
      await new Promise(resolve => setTimeout(resolve, wait));
    }
  }
}

// Conservative Tier 1 defaults — override via env vars when on higher tiers:
//   OPENAI_MAX_CONCURRENT=10 OPENAI_TPM_LIMIT=2000000 for Tier 2
const OPENAI_MAX_CONCURRENT = parseInt(process.env.OPENAI_MAX_CONCURRENT || (process.env.K_SERVICE ? '1' : '3'), 10);
const OPENAI_TPM_LIMIT = parseInt(process.env.OPENAI_TPM_LIMIT || '200000', 10);
const openAISemaphore = new Semaphore(OPENAI_MAX_CONCURRENT);
const openAITpmThrottle = new TpmThrottle(OPENAI_TPM_LIMIT);

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
  const timeout = config.timeoutMs ?? getModelTimeout(modelToUse);
  const maxRetries = parseInt(process.env.OPENAI_MAX_RETRIES || (process.env.K_SERVICE ? '1' : '3'), 10);
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

      console.log(`[OpenAI API] Request to ${modelToUse} at ${baseUrl} (attempt ${attempt + 1}/${maxRetries + 1})`);

      await openAISemaphore.acquire();
      const estimatedTokens = (config.maxTokens ?? 4096) + 4096;
      await openAITpmThrottle.reserve(estimatedTokens);
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
      console.error(`[OpenAI API] Error after ${elapsed}ms: ${describeError(error)}`);
      if (attempt < maxRetries) {
        const backoff = baseDelay * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5);
        await new Promise(resolve => setTimeout(resolve, backoff));
        continue;
      }
      return { data: null, usage: null, error: describeError(error) };
    }
  }

  return { data: null, usage: null, error: 'Max retries exceeded' };
}

async function callLMStudio<T>(
  config: ModelConfig,
  prompt: string,
  schema: object,
  modelOverride?: string
): Promise<CallResult<T>> {
  const rawModel = modelOverride || getLMStudioModel();
  const modelToUse = rawModel.startsWith('lmstudio:') ? rawModel.slice('lmstudio:'.length) : rawModel;
  const baseUrl = getLMStudioBaseUrl();
  const timeout = 180000;
  const maxRetries = 1;
  const baseDelay = 2000;

  if (!baseUrl) {
    return { data: null, usage: null, error: 'No LM Studio base URL configured' };
  }

  if (!modelToUse) {
    return { data: null, usage: null, error: 'No LM Studio model configured' };
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
        max_tokens: config.maxTokens,
        response_format: { type: 'json_object' }
      };

      if (config.temperature !== undefined) {
        requestBody.temperature = config.temperature;
      }

      console.log(`[LM Studio] Request to ${modelToUse} (attempt ${attempt + 1}/${maxRetries + 1})`);

      let response: Response;
      try {
        response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer lm-studio'
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeoutId);
      }
      const elapsed = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[LM Studio] Error ${response.status} after ${elapsed}ms: ${errorText.substring(0, 500)}`);
        if (attempt < maxRetries) {
          const backoff = baseDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, backoff));
          continue;
        }
        return { data: null, usage: null, error: `HTTP ${response.status}` };
      }

      const data = await response.json();
      const responseText = data.choices?.[0]?.message?.content?.trim();
      const usage: TokenUsage = {
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0,
        provider: 'lmstudio',
        model: modelToUse
      };

      console.log(`[LM Studio] Response in ${elapsed}ms, tokens: ${usage.inputTokens}+${usage.outputTokens}`);

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
          console.error('[LM Studio] Failed to parse JSON:', e);
          return { data: null, usage, error: 'JSON parse error' };
        }
      }
    } catch (error) {
      const elapsed = Date.now() - startTime;
      if (error instanceof Error && error.name === 'AbortError') {
        console.error(`[LM Studio] Timeout after ${elapsed}ms`);
        if (attempt < maxRetries) continue;
        return { data: null, usage: null, error: 'Timeout' };
      }
      console.error(`[LM Studio] Error after ${elapsed}ms: ${describeError(error)}`);
      if (attempt < maxRetries) {
        const backoff = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, backoff));
        continue;
      }
      return { data: null, usage: null, error: describeError(error) };
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
  if (provider === 'lmstudio') {
    return callLMStudio<T>(config, prompt, schema, modelToUse);
  }
  throw new Error(`Unsupported model: ${modelToUse}. Only OpenAI (gpt-*, o1, o3, text-embedding*) and LM Studio (lmstudio:*) models are supported.`);
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
  'gpt-4.1-mini': { input: 0.40, output: 1.60 },
  'gpt-4o': { input: 2.50, output: 10.00 },
  'o1-mini': { input: 1.10, output: 4.40 },
  'o3-mini': { input: 1.10, output: 4.40 },
  'text-embedding-3-small': { input: 0.02, output: 0 },
  'lmstudio': { input: 0, output: 0 },
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
  lmstudio: { inputTokens: number; outputTokens: number; costUsd: number };
  totalUsd: number;
} {
  const result = {
    openai: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
    lmstudio: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
    totalUsd: 0
  };

  for (const usage of usages) {
    if (!usage) continue;
    const cost = calculateCost(usage);

    if (usage.provider === 'openai') {
      result.openai.inputTokens += usage.inputTokens;
      result.openai.outputTokens += usage.outputTokens;
      result.openai.costUsd += cost;
    } else if (usage.provider === 'lmstudio') {
      result.lmstudio.inputTokens += usage.inputTokens;
      result.lmstudio.outputTokens += usage.outputTokens;
      result.lmstudio.costUsd += cost;
    }
    result.totalUsd += cost;
  }

  return result;
}

export async function testLMStudioConnection(): Promise<{ connected: boolean; models: string[]; error?: string }> {
  const baseUrl = getLMStudioBaseUrl();
  if (!baseUrl) {
    return { connected: false, models: [], error: 'No LM Studio base URL configured' };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${baseUrl}/models`, {
      headers: { 'Authorization': 'Bearer lm-studio' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return { connected: false, models: [], error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    const models = (data.data || []).map((m: any) => m.id).filter(Boolean);
    return { connected: true, models };
  } catch (error) {
    return { connected: false, models: [], error: error instanceof Error ? error.message : String(error) };
  }
}
