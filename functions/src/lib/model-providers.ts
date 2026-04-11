/**
 * HTTP clients and routing for LLM calls: OpenRouter-first cloud (including `gpt-*` aliases),
 * optional direct OpenAI when `USE_OPENAI_DIRECT` + `OPENAI_API_KEY`, and Ollama/Corsair local.
 */

import * as http from 'node:http';
import * as https from 'node:https';
import * as json5 from 'json5';
import {
  isOpenAIModel,
  isOllamaModel,
  isOpenRouterModel,
  stripOllamaPrefix,
  stripOpenRouterPrefix,
  getDefaultConceptModel,
  getDefaultBlueprintModel,
  getDefaultDrafterModel,
  getDefaultRepairModel,
  getDefaultContentQualityModel,
  getDefaultNarrativeReviewModel,
  getDefaultEmbeddingModel,
  getDefaultActionResolutionModel,
} from './generation-models';

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

// OpenRouter is the primary cloud LLM gateway. All new cloud generation should
// route through OpenRouter; OpenAI direct access remains only as an optional
// fallback for legacy paths.
export function getOpenRouterApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY || '';
  if (!key) {
    console.debug('[OpenRouter] No API key configured via OPENROUTER_API_KEY');
  }
  return key;
}

// Management key is a separate scoped credential used for billing / provisioning
// endpoints (balance, usage aggregation, key rotation). Never used for chat calls.
export function getOpenRouterManagementKey(): string {
  return process.env.OPENROUTER_MANAGEMENT_KEY || '';
}

export function getOpenRouterBaseUrl(): string {
  return process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
}

// Optional attribution headers required by OpenRouter's leaderboard / rate policies.
export function getOpenRouterReferer(): string {
  return process.env.OPENROUTER_HTTP_REFERER || 'https://the-administration.app';
}

export function getOpenRouterAppTitle(): string {
  return process.env.OPENROUTER_APP_TITLE || 'The Administration';
}

function getOllamaBaseUrl(): string {
  return process.env.OLLAMA_BASE_URL || process.env.OLLAMA_REMOTE_BASE_URL || '';
}

async function resolveOllamaBaseUrl(): Promise<string> {
  return process.env.OLLAMA_BASE_URL || process.env.OLLAMA_REMOTE_BASE_URL || '';
}

function getOllamaModel(): string {
  return process.env.OLLAMA_MODEL || '';
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

// Model configuration per phase - lazy getters, all backed by generation-models.ts registry.
export function getPhaseModels() {
  return {
    concept: getDefaultConceptModel(),
    blueprint: getDefaultBlueprintModel(),
    drafter: getDefaultDrafterModel(),
    embedding: getDefaultEmbeddingModel(),
    repair: getDefaultRepairModel(),
    contentQuality: getDefaultContentQualityModel(),
    narrativeReview: getDefaultNarrativeReviewModel(),
    actionResolution: getDefaultActionResolutionModel(),
  };
}

export const PHASE_MODELS = {
  get concept() { return getDefaultConceptModel(); },
  get blueprint() { return getDefaultBlueprintModel(); },
  get drafter() { return getDefaultDrafterModel(); },
  get embedding() { return getDefaultEmbeddingModel(); },
};

// Provider detection from model name
export type Provider = 'openai' | 'ollama' | 'openrouter';

function getProvider(modelName: string): Provider {
  if (isOllamaModel(modelName)) return 'ollama';
  if (isOpenRouterModel(modelName)) return 'openrouter';
  if (isOpenAIModel(modelName)) {
    // Cloud generation uses OpenRouter for `gpt-*` / OpenAI-style IDs. Legacy direct OpenAI only when
    // `USE_OPENAI_DIRECT=true` and `OPENAI_API_KEY` are both set.
    if (process.env.USE_OPENAI_DIRECT === 'true' && getOpenAIApiKey()) return 'openai';
    if (getOpenRouterApiKey()) return 'openrouter';
    throw new Error(
      `Model "${modelName}" requires OPENROUTER_API_KEY for cloud generation, or set USE_OPENAI_DIRECT=true with OPENAI_API_KEY`
    );
  }
  if (getOllamaBaseUrl() && getOllamaModel()) return 'ollama';
  throw new Error(`Unsupported model: ${modelName}. Only OpenRouter (vendor/slug or openrouter:*), OpenAI (gpt-*, o1, o3), and Ollama (ollama:*) models are supported.`);
}

/**
 * OpenAI-style model IDs that should be auto-rewritten to an OpenRouter slug
 * when the request is routed through OpenRouter. Extend as needed.
 */
const OPENROUTER_MODEL_ALIAS: Record<string, string> = {
  'gpt-4.1': 'openai/gpt-4.1',
  'gpt-4.1-mini': 'openai/gpt-4.1-mini',
  'gpt-4o': 'openai/gpt-4o',
  'gpt-4o-mini': 'openai/gpt-4o-mini',
  'o1-mini': 'openai/o1-mini',
  'o3-mini': 'openai/o3-mini',
  'text-embedding-3-small': 'openai/text-embedding-3-small',
  'text-embedding-3-large': 'openai/text-embedding-3-large',
};

function toOpenRouterSlug(modelName: string): string {
  const stripped = stripOpenRouterPrefix(modelName);
  if (stripped.includes('/')) return stripped;
  return OPENROUTER_MODEL_ALIAS[stripped] ?? stripped;
}

// Model configuration
export interface ModelConfig {
  maxTokens: number;
  temperature?: number;
  topP?: number;
  timeoutMs?: number; // Override default model timeout
  maxRetries?: number;
  noThink?: boolean; // Suppress thinking tokens for qwen3/deepseek-r1 models
}

// Default configs per phase
export const PHASE_CONFIGS: Record<string, ModelConfig> = {
  concept: { maxTokens: 4096, temperature: 0.7 },
  blueprint: { maxTokens: 4096, temperature: 0.6 },
  // drafter generates ~14K input + 3K output tokens; under Tier 1 rate limits
  // concurrent calls regularly take 60-120s+ when throttled. 300s keeps the call
  // alive within the Cloud Function's 540s budget.
  drafter: { maxTokens: 12288, temperature: 0.4, timeoutMs: 300000 },
  repair: { maxTokens: 8192, temperature: 0.3 },
  actionResolution: { maxTokens: 1024, temperature: 0.6, timeoutMs: 15000, maxRetries: 1 },
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
// Job-level event handler (wired by the local runner for real-time Firestore logging)
// ---------------------------------------------------------------------------
export interface ModelEvent {
  level: 'info' | 'warning' | 'error' | 'success';
  code: string;
  message: string;
  data?: Record<string, unknown>;
}

type ModelEventHandler = (event: ModelEvent) => void;
let _modelEventHandler: ModelEventHandler | null = null;

export function setModelEventHandler(fn: ModelEventHandler | null): void {
  _modelEventHandler = fn;
}

function emitModelEvent(event: ModelEvent): void {
  if (_modelEventHandler) {
    try { _modelEventHandler(event); } catch { /* never throw from event emission */ }
  }
}

function startRequestHeartbeat(params: {
  provider: Provider;
  model: string;
  attempt: number;
  maxAttempts: number;
  timeoutMs: number;
  intervalMs?: number;
}): () => void {
  const { provider, model, attempt, maxAttempts, timeoutMs, intervalMs = 15000 } = params;
  const startedAt = Date.now();
  const timer = setInterval(() => {
    const elapsedMs = Date.now() - startedAt;
    const elapsedSeconds = Math.round(elapsedMs / 1000);
    const timeoutSeconds = Math.round(timeoutMs / 1000);
    const prefix = provider === 'ollama' ? 'Ollama' : 'OpenAI API';
    const message = `${model} still running (${elapsedSeconds}s elapsed / ${timeoutSeconds}s timeout, attempt ${attempt}/${maxAttempts})`;
    console.log(`[${prefix}] … ${message}`);
    emitModelEvent({
      level: 'info',
      code: 'llm_progress',
      message,
      data: { provider, model, elapsedMs, timeoutMs, attempt, maxAttempts },
    });
  }, intervalMs);

  if (typeof timer.unref === 'function') {
    timer.unref();
  }

  return () => clearInterval(timer);
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
  private readonly queue: Array<{ resolve: () => void; reject: (err: Error) => void; timer?: ReturnType<typeof setTimeout> }> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  acquire(timeoutMs?: number): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const entry = { resolve, reject, timer: undefined as ReturnType<typeof setTimeout> | undefined };
      this.queue.push(entry);
      if (timeoutMs && timeoutMs > 0) {
        entry.timer = setTimeout(() => {
          const idx = this.queue.indexOf(entry);
          if (idx !== -1) {
            this.queue.splice(idx, 1);
            reject(new Error(`Semaphore acquire timed out after ${timeoutMs}ms`));
          }
        }, timeoutMs);
      }
    });
  }

  release(): void {
    const next = this.queue.shift();
    if (next) {
      if (next.timer) clearTimeout(next.timer);
      next.resolve();
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
const OPENAI_MAX_CONCURRENT = parseInt(process.env.OPENAI_MAX_CONCURRENT || (process.env.K_SERVICE ? '2' : '3'), 10);
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
  const modelToUse = modelOverride || 'gpt-4.1-mini';
  const timeout = config.timeoutMs ?? getModelTimeout(modelToUse);
  const maxRetries = config.maxRetries ?? parseInt(process.env.OPENAI_MAX_RETRIES || (process.env.K_SERVICE ? '2' : '3'), 10);
  const baseDelay = 2000;

  const apiKey = getOpenAIApiKey();
  const baseUrl = getOpenAIBaseUrl();

  if (!apiKey) {
    console.error('[OpenAI API] No API key configured');
    return { data: null, usage: null, error: 'No OpenAI API key' };
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const startTime = Date.now();
    let stopHeartbeat: (() => void) | null = null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const useStructuredOutput = /^gpt-4\.[1-9]|^gpt-4\.1|^gpt-5/.test(modelToUse);

      const requestBody: Record<string, any> = {
        model: modelToUse,
        messages: [
          {
            role: 'system',
            content: 'You are a precise JSON generator for a geopolitical simulation game. Generate realistic, nuanced political scenarios. Always respond with valid JSON matching the requested schema. Never include explanatory text.'
          },
          {
            role: 'user',
            content: useStructuredOutput
              ? prompt
              : `${prompt}\n\nRespond with ONLY valid JSON matching this schema:\n${JSON.stringify(schema, null, 2)}`
          }
        ],
        max_completion_tokens: config.maxTokens,
        response_format: useStructuredOutput
          ? { type: 'json_schema', json_schema: { name: 'response', schema, strict: false } }
          : { type: 'json_object' },
      };

      // Apply temperature for non-reasoning models
      if (config.temperature !== undefined && !modelToUse.startsWith('o1')) {
        requestBody.temperature = config.temperature;
      }

      console.log(`[OpenAI API] Request to ${modelToUse} at ${baseUrl} (attempt ${attempt + 1}/${maxRetries + 1})`);
      emitModelEvent({
        level: 'info',
        code: 'llm_request',
        message: `→ ${modelToUse} (attempt ${attempt + 1}/${maxRetries + 1}) — ${prompt.length} chars`,
        data: { model: modelToUse, promptLength: prompt.length, attempt: attempt + 1, promptPreview: prompt.length > 600 ? prompt.slice(0, 600) + '\n…[truncated]' : prompt },
      });
      stopHeartbeat = startRequestHeartbeat({
        provider: 'openai',
        model: modelToUse,
        attempt: attempt + 1,
        maxAttempts: maxRetries + 1,
        timeoutMs: timeout,
      });

      await openAISemaphore.acquire(Math.floor(timeout / 2));
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
      stopHeartbeat?.();
      stopHeartbeat = null;

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
      emitModelEvent({
        level: 'info',
        code: 'llm_response',
        message: `← ${modelToUse} ${elapsed}ms — ${usage.inputTokens}↑ ${usage.outputTokens}↓ tokens`,
        data: { provider: 'openai' as const, model: modelToUse, elapsed, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, responsePreview: responseText ? (responseText.length > 800 ? responseText.slice(0, 800) + '\n…[truncated]' : responseText) : undefined },
      });

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
      stopHeartbeat?.();
      stopHeartbeat = null;
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

// ---------------------------------------------------------------------------
// OpenRouter provider
// ---------------------------------------------------------------------------
// OpenRouter exposes an OpenAI-compatible /chat/completions API behind a single
// key, routing to dozens of upstream vendors (Anthropic, Google, Meta, DeepSeek,
// Qwen, OpenAI, etc.). Using OpenRouter lets us pick the best per-phase model
// without juggling vendor-specific SDKs and without a hard OpenAI dependency.

const OPENROUTER_MAX_CONCURRENT = parseInt(
  process.env.OPENROUTER_MAX_CONCURRENT || (process.env.K_SERVICE ? '4' : '6'),
  10,
);
const OPENROUTER_TPM_LIMIT = parseInt(process.env.OPENROUTER_TPM_LIMIT || '1000000', 10);
const openRouterSemaphore = new Semaphore(OPENROUTER_MAX_CONCURRENT);
const openRouterTpmThrottle = new TpmThrottle(OPENROUTER_TPM_LIMIT);

async function callOpenRouter<T>(
  config: ModelConfig,
  prompt: string,
  schema: object,
  modelOverride?: string,
): Promise<CallResult<T>> {
  const modelToUse = toOpenRouterSlug(modelOverride || 'google/gemini-2.5-flash');
  const timeout = config.timeoutMs ?? getModelTimeout(modelToUse);
  const maxRetries = config.maxRetries ?? parseInt(
    process.env.OPENROUTER_MAX_RETRIES || (process.env.K_SERVICE ? '2' : '3'),
    10,
  );
  const baseDelay = 2000;

  const apiKey = getOpenRouterApiKey();
  const baseUrl = getOpenRouterBaseUrl();

  if (!apiKey) {
    console.error('[OpenRouter] No API key configured');
    return { data: null, usage: null, error: 'No OpenRouter API key' };
  }

  // OpenRouter supports structured JSON output for most vendors, but not all.
  // Anthropic + Google honour json_schema; older vendors only honour json_object.
  // We send json_schema when the slug is from a vendor known to support it.
  const vendorSupportsJsonSchema = /^(openai|anthropic|google|mistralai|meta-llama|qwen|deepseek)\//i.test(modelToUse);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const startTime = Date.now();
    let stopHeartbeat: (() => void) | null = null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const isAnthropicModel = modelToUse.startsWith('anthropic/');
      const isGoogleModel = modelToUse.startsWith('google/');
      const systemContent = 'You are a precise JSON generator for a geopolitical simulation game. Generate realistic, nuanced political scenarios. Always respond with valid JSON matching the requested schema. Never include explanatory text.';

      const systemMessage: Record<string, unknown> = {
        role: 'system',
        content: isAnthropicModel
          ? [{ type: 'text', text: systemContent, cache_control: { type: 'ephemeral' } }]
          : systemContent,
      };

      const providerRouting: Record<string, unknown> = isAnthropicModel
        ? { order: ['Anthropic'], allow_fallbacks: false }
        : isGoogleModel
          ? { order: ['Google'] }
          : {};

      const requestBody: Record<string, unknown> = {
        model: modelToUse,
        messages: [
          systemMessage,
          {
            role: 'user',
            content: vendorSupportsJsonSchema
              ? prompt
              : `${prompt}\n\nRespond with ONLY valid JSON matching this schema:\n${JSON.stringify(schema, null, 2)}`,
          },
        ],
        max_tokens: config.maxTokens,
        ...(Object.keys(providerRouting).length > 0 ? { provider: providerRouting } : {}),
        response_format: vendorSupportsJsonSchema
          ? { type: 'json_schema', json_schema: { name: 'response', schema, strict: false } }
          : { type: 'json_object' },
      };

      if (config.temperature !== undefined && !/^openai\/o[0-9]/.test(modelToUse)) {
        requestBody.temperature = config.temperature;
      }
      if (config.topP !== undefined) {
        requestBody.top_p = config.topP;
      }

      console.log(`[OpenRouter] Request to ${modelToUse} at ${baseUrl} (attempt ${attempt + 1}/${maxRetries + 1})`);
      emitModelEvent({
        level: 'info',
        code: 'llm_request',
        message: `→ ${modelToUse} (attempt ${attempt + 1}/${maxRetries + 1}) — ${prompt.length} chars`,
        data: {
          provider: 'openrouter',
          model: modelToUse,
          promptLength: prompt.length,
          attempt: attempt + 1,
          promptPreview: prompt.length > 600 ? prompt.slice(0, 600) + '\n…[truncated]' : prompt,
        },
      });
      stopHeartbeat = startRequestHeartbeat({
        provider: 'openrouter',
        model: modelToUse,
        attempt: attempt + 1,
        maxAttempts: maxRetries + 1,
        timeoutMs: timeout,
      });

      await openRouterSemaphore.acquire(Math.floor(timeout / 2));
      const estimatedTokens = (config.maxTokens ?? 4096) + 4096;
      await openRouterTpmThrottle.reserve(estimatedTokens);

      let response: Response;
      try {
        response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': getOpenRouterReferer(),
            'X-Title': getOpenRouterAppTitle(),
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
        openRouterSemaphore.release();
      }

      const elapsed = Date.now() - startTime;
      stopHeartbeat?.();
      stopHeartbeat = null;

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[OpenRouter] Error ${response.status} after ${elapsed}ms: ${errorText.substring(0, 500)}`);

        if (response.status === 429 || response.status >= 500) {
          if (response.status === 429) {
            retryTelemetry.rateLimitRetries++;
          } else {
            retryTelemetry.serverRetries++;
          }
          if (attempt < maxRetries) {
            const retryAfterHeader = response.headers.get('retry-after');
            const retryAfterMs = retryAfterHeader ? parseFloat(retryAfterHeader) * 1000 : 0;
            const backoff = baseDelay * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5);
            const delay = Math.max(retryAfterMs, backoff);
            console.warn(`[OpenRouter] Retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
        }
        return { data: null, usage: null, error: `HTTP ${response.status}: ${errorText.substring(0, 200)}` };
      }

      const data = await response.json();
      const responseText: string | undefined = data.choices?.[0]?.message?.content?.trim();
      const usage: TokenUsage = {
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0,
        provider: 'openrouter',
        model: modelToUse,
      };

      console.log(`[OpenRouter] Response in ${elapsed}ms, tokens: ${usage.inputTokens}+${usage.outputTokens}`);
      emitModelEvent({
        level: 'info',
        code: 'llm_response',
        message: `← ${modelToUse} ${elapsed}ms — ${usage.inputTokens}↑ ${usage.outputTokens}↓ tokens`,
        data: {
          provider: 'openrouter' as const,
          model: modelToUse,
          elapsed,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          responsePreview: responseText
            ? (responseText.length > 800 ? responseText.slice(0, 800) + '\n…[truncated]' : responseText)
            : undefined,
        },
      });

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
        } catch (parseErr) {
          console.error('[OpenRouter] Failed to parse JSON:', parseErr);
          return { data: null, usage, error: 'JSON parse error' };
        }
      }
    } catch (error) {
      const elapsed = Date.now() - startTime;
      stopHeartbeat?.();
      stopHeartbeat = null;
      if (error instanceof Error && error.name === 'AbortError') {
        console.error(`[OpenRouter] Timeout after ${elapsed}ms`);
        if (attempt < maxRetries) continue;
        return { data: null, usage: null, error: 'Timeout' };
      }
      console.error(`[OpenRouter] Error after ${elapsed}ms: ${describeError(error)}`);
      if (attempt < maxRetries) {
        const backoff = baseDelay * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5);
        await new Promise((resolve) => setTimeout(resolve, backoff));
        continue;
      }
      return { data: null, usage: null, error: describeError(error) };
    }
  }

  return { data: null, usage: null, error: 'Max retries exceeded' };
}

// ---------------------------------------------------------------------------
// Ollama provider
// ---------------------------------------------------------------------------

async function callOllama<T>(
  config: ModelConfig,
  prompt: string,
  schema: object,
  modelOverride?: string
): Promise<CallResult<T>> {
  const rawModel = modelOverride || getOllamaModel();
  const modelToUse = stripOllamaPrefix(rawModel);
  const baseUrl = await resolveOllamaBaseUrl();
  const timeout = config.timeoutMs ?? parseInt(process.env.OLLAMA_TIMEOUT || '300000', 10);
  const maxRetries = parseInt(process.env.OLLAMA_MAX_RETRIES || '3', 10);
  const baseDelay = 2000;

  if (!baseUrl) {
    return { data: null, usage: null, error: 'No Ollama base URL configured (set OLLAMA_BASE_URL env var or world_state/generation_config.ollama_base_url in Firestore)' };
  }
  if (!modelToUse) {
    return { data: null, usage: null, error: 'No Ollama model configured' };
  }

  try {
    const preCheckUrl = new URL(`${baseUrl}/models`);
    const preCheckLib = preCheckUrl.protocol === 'https:' ? https : http;
    await new Promise<void>((resolve) => {
      const req = preCheckLib.request(
        { hostname: preCheckUrl.hostname, port: preCheckUrl.port || (preCheckUrl.protocol === 'https:' ? '443' : '80'), path: preCheckUrl.pathname, method: 'GET', headers: { Authorization: 'Bearer ollama' }, timeout: 5000 },
        (res) => { res.resume(); resolve(); }
      );
      req.on('error', () => resolve());
      req.on('timeout', () => { req.destroy(); resolve(); });
      req.end();
    });
  } catch {
    console.warn(`[Ollama] Pre-check to ${baseUrl}/models failed (non-fatal)`);
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const startTime = Date.now();
    let stopHeartbeat: (() => void) | null = null;

    try {
      const signal = AbortSignal.timeout(timeout);
      const OLLAMA_MAX_OUTPUT_TOKENS = 16384;

      // Matches both named reasoning families and custom alias tags (e.g. ai-reasoning, r1-distill)
      const isThinkingModel = /qwen3|deepseek-r1|deepseek-r2|reasoning|:r1\b/i.test(modelToUse);
      const suppressThinking = isThinkingModel && config.noThink !== false;
      // Reasoning models consume thinking tokens from the max_tokens budget before writing output.
      // Without /no_think the default 4096 is exhausted by reasoning alone. Use a larger budget
      // whenever thinking is active so there is headroom for the actual JSON response.
      const effectiveMaxTokens = suppressThinking
        ? Math.min(config.maxTokens ?? OLLAMA_MAX_OUTPUT_TOKENS, OLLAMA_MAX_OUTPUT_TOKENS)
        : (isThinkingModel
          ? OLLAMA_MAX_OUTPUT_TOKENS
          : Math.min(config.maxTokens ?? OLLAMA_MAX_OUTPUT_TOKENS, OLLAMA_MAX_OUTPUT_TOKENS));
      const systemContent = suppressThinking
        ? 'You are a precise JSON generator for a geopolitical simulation game. Generate realistic, nuanced, DETAILED political scenarios. Write LONG, vivid, specific text — never brief or generic. Every description must be 60-100 words. Every option text must be 50-80 words. Every outcomeSummary must be 250+ characters. Every outcomeContext must be 400+ characters with 4-6 sentences. Short output will be REJECTED. Always respond with valid JSON only. Never include explanatory text. Do not use chain-of-thought reasoning.'
        : 'You are a precise JSON generator for a geopolitical simulation game. Generate realistic, nuanced, DETAILED political scenarios. Write LONG, vivid, specific text — never brief or generic. Every description must be 60-100 words. Every option text must be 50-80 words. Every outcomeSummary must be 250+ characters. Every outcomeContext must be 400+ characters with 4-6 sentences. Short output will be REJECTED. Always respond with valid JSON. Never include explanatory text.';
      const userContent = suppressThinking ? `${prompt} /no_think` : prompt;

      const requestBody: Record<string, unknown> = {
        model: modelToUse,
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: userContent },
        ],
        max_tokens: effectiveMaxTokens,
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'response', schema, strict: false },
        },
        options: { num_ctx: 16384 },
      };
      if (config.temperature !== undefined) {
        requestBody.temperature = config.temperature;
      }

      console.log(`[Ollama] Request to ${modelToUse} (attempt ${attempt + 1}/${maxRetries + 1}, timeout=${timeout / 1000}s)`);
      // Show a live tail of the prompt so the task/concept is visible before the wait
      const promptTail = prompt.length > 800 ? '…' + prompt.slice(-800) : prompt;
      console.log(`[Ollama] ── prompt tail ──────────────────────────────────────────────`);
      console.log(promptTail);
      console.log(`[Ollama] ────────────────────────────────────────────────────────────`);
      emitModelEvent({
        level: 'info',
        code: 'llm_request',
        message: `→ ${modelToUse} (attempt ${attempt + 1}/${maxRetries + 1}) — ${prompt.length} chars`,
        data: { model: modelToUse, promptLength: prompt.length, attempt: attempt + 1, promptPreview: prompt.length > 600 ? prompt.slice(0, 600) + '\n…[truncated]' : prompt },
      });
      stopHeartbeat = startRequestHeartbeat({
        provider: 'ollama',
        model: modelToUse,
        attempt: attempt + 1,
        maxAttempts: maxRetries + 1,
        timeoutMs: timeout,
      });

      const streamingBody = { ...requestBody, stream: true, stream_options: { include_usage: true } };
      const bodyStr = JSON.stringify(streamingBody);
      const { statusCode, responseText: streamedContent, usage: streamUsage, finishReason } = await new Promise<{
        statusCode: number;
        responseText: string;
        usage: { prompt_tokens: number; completion_tokens: number };
        finishReason: string;
      }>((resolve, reject) => {
        const reqUrl = new URL(`${baseUrl}/chat/completions`);
        const lib = reqUrl.protocol === 'https:' ? https : http;
        let fullContent = '';
        let thinkingContent = '';
        let inThinking = false;
        let lastUsage = { prompt_tokens: 0, completion_tokens: 0 };
        let lastFinish = '';
        let lineBuffer = '';
        let tokenCount = 0;
        let lastProgressAt = Date.now();
        let firstTokenAt = 0;
        const PROGRESS_INTERVAL = 2000;

        const req = lib.request(
          {
            hostname: reqUrl.hostname,
            port: reqUrl.port || (reqUrl.protocol === 'https:' ? '443' : '80'),
            path: reqUrl.pathname,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ollama',
              'Content-Length': Buffer.byteLength(bodyStr),
            },
          },
          (res) => {
            if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
              let errBuf = '';
              res.on('data', (chunk: Buffer) => { errBuf += chunk.toString(); });
              res.on('end', () => resolve({ statusCode: res.statusCode ?? 0, responseText: errBuf, usage: lastUsage, finishReason: '' }));
              res.on('error', reject);
              return;
            }
            res.on('data', (chunk: Buffer) => {
              lineBuffer += chunk.toString();
              const lines = lineBuffer.split('\n');
              lineBuffer = lines.pop() ?? '';
              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed === 'data: [DONE]') continue;
                if (!trimmed.startsWith('data: ')) continue;
                try {
                  const parsed = JSON.parse(trimmed.slice(6));
                  if (parsed.usage) lastUsage = parsed.usage;
                  const delta = parsed.choices?.[0]?.delta;
                  if (parsed.choices?.[0]?.finish_reason) lastFinish = parsed.choices[0].finish_reason;
                  if (!delta) continue;
                  const content = delta.content ?? '';
                  if (!content) continue;
                  tokenCount++;
                  if (!firstTokenAt) {
                    firstTokenAt = Date.now();
                    if (stopHeartbeat) { stopHeartbeat(); stopHeartbeat = null; }
                  }
                  if (content.includes('<think>')) { inThinking = true; }
                  if (inThinking) {
                    thinkingContent += content;
                    if (content.includes('</think>')) { inThinking = false; }
                  } else {
                    fullContent += content;
                  }
                  const now = Date.now();
                  if (now - lastProgressAt >= PROGRESS_INTERVAL) {
                    lastProgressAt = now;
                    const elapsed = Math.round((now - startTime) / 1000);
                    const timeoutSec = Math.round(timeout / 1000);
                    const ttft = firstTokenAt ? `ttft=${Math.round((firstTokenAt - startTime) / 1000)}s` : '';
                    const phase = inThinking ? 'THINKING' : 'GENERATING';
                    const thinkNote = thinkingContent.length > 0 ? ` thinking=${thinkingContent.length}ch` : '';
                    process.stdout.write(`\r[Ollama] ${modelToUse} ${phase}: ${elapsed}s/${timeoutSec}s | ${tokenCount} tok | ${fullContent.length}ch out${thinkNote} ${ttft}    `);
                  }
                } catch { /* skip malformed SSE lines */ }
              }
            });
            res.on('end', () => {
              process.stdout.write('\n');
              resolve({ statusCode: res.statusCode ?? 200, responseText: fullContent, usage: lastUsage, finishReason: lastFinish });
            });
            res.on('error', reject);
          }
        );
        req.on('error', reject);
        const onAbort = () => {
          req.destroy();
          reject(Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }));
        };
        if (signal.aborted) { onAbort(); return; }
        signal.addEventListener('abort', onAbort, { once: true });
        req.on('close', () => signal.removeEventListener('abort', onAbort));
        req.end(bodyStr);
      });
      const elapsed = Date.now() - startTime;
      stopHeartbeat?.();
      stopHeartbeat = null;

      if (statusCode < 200 || statusCode >= 300) {
        console.error(`[Ollama] Error ${statusCode} after ${elapsed}ms: ${streamedContent.substring(0, 500)}`);
        emitModelEvent({
          level: 'error',
          code: 'llm_error',
          message: `← ${modelToUse} HTTP ${statusCode} after ${elapsed}ms`,
          data: { model: modelToUse, status: statusCode, elapsed, detail: streamedContent.substring(0, 200) },
        });
        if (attempt < maxRetries) {
          const backoff = baseDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, backoff));
          continue;
        }
        return { data: null, usage: null, error: `HTTP ${statusCode}: ${streamedContent.substring(0, 200)}` };
      }

      const responseText = streamedContent.trim();
      const usage: TokenUsage = {
        inputTokens: streamUsage.prompt_tokens || 0,
        outputTokens: streamUsage.completion_tokens || 0,
        provider: 'ollama',
        model: modelToUse,
      };

      console.log(`[Ollama] Response in ${elapsed}ms, tokens: ${usage.inputTokens}+${usage.outputTokens}, finish=${finishReason}`);
      if (responseText) {
        const preview = responseText.length > 1200 ? responseText.slice(0, 1200) + '\n…[truncated for display]' : responseText;
        console.log(`[Ollama] ── response preview ─────────────────────────────────────────`);
        console.log(preview);
        console.log(`[Ollama] ────────────────────────────────────────────────────────────`);
      }
      emitModelEvent({
        level: 'info',
        code: 'llm_response',
        message: `← ${modelToUse} ${elapsed}ms — ${usage.inputTokens}↑ ${usage.outputTokens}↓ tokens`,
        data: { provider: 'ollama' as const, model: modelToUse, elapsed, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, finishReason, responsePreview: responseText ? (responseText.length > 800 ? responseText.slice(0, 800) + '\n…[truncated]' : responseText) : undefined },
      });

      if (finishReason === 'length') {
        console.error(`[Ollama] Output truncated (finish_reason=length) — ${usage.outputTokens} tokens used`);
        return { data: null, usage, error: 'Output truncated (finish_reason=length) — increase maxTokens or reduce prompt' };
      }

      if (!responseText) {
        return { data: null, usage, error: `Empty response (finish_reason=${finishReason})` };
      }

      try {
        let cleaned = responseText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) cleaned = jsonMatch[0];
        try {
          return { data: JSON.parse(cleaned), usage };
        } catch {
          return { data: json5.parse(cleaned), usage };
        }
      } catch (e) {
        console.error('[Ollama] Failed to parse JSON:', e);
        return { data: null, usage, error: 'JSON parse error' };
      }
    } catch (error) {
      const elapsed = Date.now() - startTime;
      stopHeartbeat?.();
      stopHeartbeat = null;
      if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
        console.error(`[Ollama] Timeout after ${elapsed}ms`);
        if (attempt < maxRetries) continue;
        return { data: null, usage: null, error: 'Timeout' };
      }
      console.error(`[Ollama] Error after ${elapsed}ms: ${describeError(error)}`);
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
 * Routes to the appropriate provider based on model name
 */
export async function callModelProvider<T>(
  config: ModelConfig,
  prompt: string,
  schema: object,
  modelOverride?: string
): Promise<CallResult<T>> {
  const modelToUse = modelOverride || PHASE_MODELS.drafter;
  const provider = getProvider(modelToUse);
  if (provider === 'openrouter') return callOpenRouter<T>(config, prompt, schema, modelToUse);
  if (provider === 'openai') return callOpenAI<T>(config, prompt, schema, modelToUse);
  if (provider === 'ollama') return callOllama<T>(config, prompt, schema, modelToUse);
  throw new Error(`Unsupported provider for model: ${modelToUse}`);
}

/**
 * Generate embeddings. Prefers OpenRouter when configured so we don't need a
 * direct OpenAI key; falls back to OpenAI direct if OpenRouter is unavailable.
 * Default model is text-embedding-3-small ($0.02/1M tokens).
 */
export async function generateEmbedding(text: string): Promise<{ embedding: number[] | null; usage: TokenUsage | null }> {
  const modelToUse = PHASE_MODELS.embedding;
  const openRouterKey = getOpenRouterApiKey();
  const openAIKey = getOpenAIApiKey();

  const useOpenRouter = !!openRouterKey && (!openAIKey || isOpenRouterModel(modelToUse));
  const provider: Provider = useOpenRouter ? 'openrouter' : 'openai';
  const apiKey = useOpenRouter ? openRouterKey : openAIKey;
  const baseUrl = useOpenRouter ? getOpenRouterBaseUrl() : getOpenAIBaseUrl();
  const remoteModel = useOpenRouter ? toOpenRouterSlug(modelToUse) : modelToUse;
  const tag = useOpenRouter ? 'OpenRouter Embedding' : 'OpenAI Embedding';

  if (!apiKey) {
    console.error(
      `[${tag}] No API key configured (set OPENROUTER_API_KEY, or USE_OPENAI_DIRECT=true with OPENAI_API_KEY)`
    );
    return { embedding: null, usage: null };
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    };
    if (useOpenRouter) {
      headers['HTTP-Referer'] = getOpenRouterReferer();
      headers['X-Title'] = getOpenRouterAppTitle();
    }

    const response = await fetch(`${baseUrl}/embeddings`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: remoteModel,
        input: text.substring(0, 8000), // Limit input for cost
        encoding_format: 'float',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${tag}] Error ${response.status}: ${errorText.substring(0, 200)}`);
      return { embedding: null, usage: null };
    }

    const data = await response.json();
    const usage: TokenUsage = {
      inputTokens: data.usage?.total_tokens || 0,
      outputTokens: 0,
      provider,
      model: remoteModel,
    };

    return { embedding: data.data?.[0]?.embedding || null, usage };
  } catch (error) {
    console.error(`[${tag}] Error:`, error);
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
 * Cost calculation helpers (USD per 1M tokens).
 * OpenRouter passes the upstream vendor price through (plus a small routing fee),
 * so entries are keyed by both raw name and OpenRouter slug where useful.
 */
const COST_PER_MILLION: Record<string, { input: number; output: number }> = {
  // OpenAI direct
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4.1-mini': { input: 0.40, output: 1.60 },
  'gpt-4.1': { input: 2.00, output: 8.00 },
  'gpt-4o': { input: 2.50, output: 10.00 },
  'o1-mini': { input: 1.10, output: 4.40 },
  'o3-mini': { input: 1.10, output: 4.40 },
  'text-embedding-3-small': { input: 0.02, output: 0 },
  // OpenRouter slugs
  'openai/gpt-4.1': { input: 2.00, output: 8.00 },
  'openai/gpt-4.1-mini': { input: 0.40, output: 1.60 },
  'openai/gpt-4o': { input: 2.50, output: 10.00 },
  'openai/gpt-4o-mini': { input: 0.15, output: 0.60 },
  'openai/text-embedding-3-small': { input: 0.02, output: 0 },
  'anthropic/claude-sonnet-4.5': { input: 3.00, output: 15.00 },
  'anthropic/claude-sonnet-4.6': { input: 3.00, output: 15.00 },
  'anthropic/claude-haiku-4.5': { input: 1.00, output: 5.00 },
  'google/gemini-2.5-pro': { input: 1.25, output: 10.00 },
  'google/gemini-2.5-flash': { input: 0.15, output: 0.60 },
  'mistralai/mistral-small-2603': { input: 0.10, output: 0.30 },
  'deepseek/deepseek-chat': { input: 0.27, output: 1.10 },
  'qwen/qwen3-coder': { input: 0.30, output: 0.90 },
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
  openrouter: { inputTokens: number; outputTokens: number; costUsd: number };
  ollama: { inputTokens: number; outputTokens: number; costUsd: number };
  totalUsd: number;
} {
  const result = {
    openai: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
    openrouter: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
    ollama: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
    totalUsd: 0
  };

  for (const usage of usages) {
    if (!usage) continue;
    const cost = calculateCost(usage);

    if (usage.provider === 'openai') {
      result.openai.inputTokens += usage.inputTokens;
      result.openai.outputTokens += usage.outputTokens;
      result.openai.costUsd += cost;
    } else if (usage.provider === 'openrouter') {
      result.openrouter.inputTokens += usage.inputTokens;
      result.openrouter.outputTokens += usage.outputTokens;
      result.openrouter.costUsd += cost;
    } else if (usage.provider === 'ollama') {
      result.ollama.inputTokens += usage.inputTokens;
      result.ollama.outputTokens += usage.outputTokens;
      result.ollama.costUsd += cost;
    }
    result.totalUsd += cost;
  }

  return result;
}
