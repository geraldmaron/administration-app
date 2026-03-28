"use strict";
/**
 * Model Providers Module
 *
 * OpenAI and Ollama model routing for generation phases.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PHASE_CONFIGS = exports.PHASE_MODELS = void 0;
exports.getPhaseModels = getPhaseModels;
exports.resetProviderRetryTelemetry = resetProviderRetryTelemetry;
exports.getProviderRetryTelemetry = getProviderRetryTelemetry;
exports.setModelEventHandler = setModelEventHandler;
exports.callModelProvider = callModelProvider;
exports.generateEmbedding = generateEmbedding;
exports.cosineSimilarity = cosineSimilarity;
exports.calculateCost = calculateCost;
exports.aggregateCosts = aggregateCosts;
exports.testOllamaConnection = testOllamaConnection;
const json5 = __importStar(require("json5"));
const generation_models_1 = require("./generation-models");
// Environment configuration - using getters for lazy evaluation
// This ensures secrets injected by Firebase are available at call time
function getOpenAIApiKey() {
    const key = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || '';
    if (!key) {
        console.debug('[OpenAI API] No API key configured via OPENAI_API_KEY or OPENAI_KEY');
    }
    return key;
}
function getOpenAIBaseUrl() {
    return process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
}
function describeError(err) {
    if (!(err instanceof Error))
        return String(err);
    let msg = err.message;
    const cause = err.cause;
    if (cause) {
        msg += ` — cause: ${cause instanceof Error ? cause.message : String(cause)}`;
    }
    return msg;
}
function getOllamaBaseUrl() {
    return process.env.OLLAMA_BASE_URL || process.env.OLLAMA_REMOTE_BASE_URL || '';
}
function getOllamaModel() {
    return process.env.OLLAMA_MODEL || '';
}
// Model configuration per phase - also lazy to support runtime config
function getPhaseModels() {
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
exports.PHASE_MODELS = {
    get concept() { return process.env.CONCEPT_MODEL || 'gpt-4o-mini'; },
    get blueprint() { return process.env.BLUEPRINT_MODEL || 'gpt-4o-mini'; },
    get drafter() { return process.env.DRAFTER_MODEL || 'gpt-4o-mini'; },
    get embedding() { return process.env.EMBEDDING_MODEL || 'text-embedding-3-small'; },
};
function getProvider(modelName) {
    if ((0, generation_models_1.isOllamaModel)(modelName)) {
        return 'ollama';
    }
    if ((0, generation_models_1.isOpenAIModel)(modelName)) {
        return 'openai';
    }
    // If Ollama is configured, route unknown models there
    if (getOllamaBaseUrl() && getOllamaModel()) {
        return 'ollama';
    }
    throw new Error(`Unsupported model for OpenAI-only mode: ${modelName}`);
}
// Default configs per phase
exports.PHASE_CONFIGS = {
    concept: { maxTokens: 4096, temperature: 0.7 },
    blueprint: { maxTokens: 4096, temperature: 0.6 },
    // drafter generates ~14K input + 3K output tokens; under Tier 1 rate limits
    // concurrent calls regularly take 60-120s+ when throttled. 300s keeps the call
    // alive within the Cloud Function's 540s budget.
    drafter: { maxTokens: 12288, temperature: 0.7, timeoutMs: 300000 },
    repair: { maxTokens: 4096, temperature: 0.3 },
};
// Timeout configuration per model (used unless config.timeoutMs is set)
function getModelTimeout(modelName) {
    if (modelName.startsWith('o1'))
        return 120000; // 2 min for reasoning models
    if (modelName.startsWith('o3'))
        return 120000;
    if (modelName.startsWith('gpt-4o-mini'))
        return 240000; // 4 min — large drafter prompts routinely take 60-100s
    if (modelName.startsWith('gpt-4.1-mini'))
        return 240000;
    return 90000;
}
let retryTelemetry = {
    rateLimitRetries: 0,
    serverRetries: 0,
};
function resetProviderRetryTelemetry() {
    retryTelemetry = { rateLimitRetries: 0, serverRetries: 0 };
}
function getProviderRetryTelemetry() {
    return Object.assign({}, retryTelemetry);
}
let _modelEventHandler = null;
function setModelEventHandler(fn) {
    _modelEventHandler = fn;
}
function emitModelEvent(event) {
    if (_modelEventHandler) {
        try {
            _modelEventHandler(event);
        }
        catch ( /* never throw from event emission */_a) { /* never throw from event emission */ }
    }
}
// ---------------------------------------------------------------------------
// Concurrency Semaphore + TPM Throttle
// ---------------------------------------------------------------------------
// OpenAI gpt-4o-mini binding constraint is TPM.
// Tier 2 (2M TPM): ~17K tokens/call → ~117 safe calls/min → ~30 concurrent.
// Tier 1 (200K TPM): ~11 safe calls/min → 3 concurrent at drafter scale.
// Default of 3 is safe for Tier 1; override with OPENAI_MAX_CONCURRENT env var.
class Semaphore {
    constructor(permits) {
        this.queue = [];
        this.permits = permits;
    }
    acquire() {
        if (this.permits > 0) {
            this.permits--;
            return Promise.resolve();
        }
        return new Promise(resolve => this.queue.push(resolve));
    }
    release() {
        const next = this.queue.shift();
        if (next) {
            next();
        }
        else {
            this.permits++;
        }
    }
}
// TPM throttle: tracks tokens used in the current 60s window and gates new requests
// when the budget is almost exhausted. Budget and window are configurable via env vars.
class TpmThrottle {
    constructor(limitTpm) {
        this.usedThisWindow = 0;
        this.windowStart = Date.now();
        this.limitTpm = limitTpm;
    }
    reset() {
        this.usedThisWindow = 0;
        this.windowStart = Date.now();
    }
    msUntilReset() {
        return Math.max(0, 60000 - (Date.now() - this.windowStart));
    }
    /** Call before sending a request. Waits until enough TPM budget is available. */
    async reserve(estimatedTokens) {
        while (true) {
            const elapsed = Date.now() - this.windowStart;
            if (elapsed >= 60000)
                this.reset();
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
async function callOpenAI(config, prompt, schema, modelOverride) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const modelToUse = modelOverride || 'gpt-4o-mini';
    const timeout = (_a = config.timeoutMs) !== null && _a !== void 0 ? _a : getModelTimeout(modelToUse);
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
            const requestBody = {
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
            emitModelEvent({
                level: 'info',
                code: 'llm_request',
                message: `→ ${modelToUse} (attempt ${attempt + 1}/${maxRetries + 1}) — ${prompt.length} chars`,
                data: { model: modelToUse, promptLength: prompt.length, attempt: attempt + 1 },
            });
            await openAISemaphore.acquire();
            const estimatedTokens = ((_b = config.maxTokens) !== null && _b !== void 0 ? _b : 4096) + 4096;
            await openAITpmThrottle.reserve(estimatedTokens);
            let response;
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
            }
            finally {
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
                    }
                    else {
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
            const responseText = (_f = (_e = (_d = (_c = data.choices) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.message) === null || _e === void 0 ? void 0 : _e.content) === null || _f === void 0 ? void 0 : _f.trim();
            const usage = {
                inputTokens: ((_g = data.usage) === null || _g === void 0 ? void 0 : _g.prompt_tokens) || 0,
                outputTokens: ((_h = data.usage) === null || _h === void 0 ? void 0 : _h.completion_tokens) || 0,
                provider: 'openai',
                model: modelToUse
            };
            console.log(`[OpenAI API] Response in ${elapsed}ms, tokens: ${usage.inputTokens}+${usage.outputTokens}`);
            emitModelEvent({
                level: 'info',
                code: 'llm_response',
                message: `← ${modelToUse} ${elapsed}ms — ${usage.inputTokens}↑ ${usage.outputTokens}↓ tokens`,
                data: { model: modelToUse, elapsed, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens },
            });
            if (!responseText) {
                return { data: null, usage, error: 'Empty response' };
            }
            try {
                let cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
                if (jsonMatch)
                    cleaned = jsonMatch[0];
                return { data: JSON.parse(cleaned), usage };
            }
            catch (_j) {
                try {
                    return { data: json5.parse(responseText), usage };
                }
                catch (e) {
                    console.error('[OpenAI API] Failed to parse JSON:', e);
                    return { data: null, usage, error: 'JSON parse error' };
                }
            }
        }
        catch (error) {
            const elapsed = Date.now() - startTime;
            if (error instanceof Error && error.name === 'AbortError') {
                console.error(`[OpenAI API] Timeout after ${elapsed}ms`);
                if (attempt < maxRetries)
                    continue;
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
async function callOllama(config, prompt, schema, modelOverride) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    const rawModel = modelOverride || getOllamaModel();
    const modelToUse = (0, generation_models_1.stripOllamaPrefix)(rawModel);
    const baseUrl = getOllamaBaseUrl();
    const timeout = 180000; // 3 min — AbortSignal.timeout() enforces this at OS/TCP level
    const maxRetries = parseInt(process.env.OLLAMA_MAX_RETRIES || '3', 10);
    const baseDelay = 2000;
    if (!baseUrl) {
        return { data: null, usage: null, error: 'No Ollama base URL configured' };
    }
    if (!modelToUse) {
        return { data: null, usage: null, error: 'No Ollama model configured' };
    }
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const startTime = Date.now();
        try {
            // Use AbortSignal.timeout() — works at the OS/TCP level and reliably cancels
            // long-running Ollama requests even when the response body is still streaming.
            const signal = AbortSignal.timeout(timeout);
            // Ollama uses json_schema response_format — the schema is already declared there,
            // so we don't embed it in the message body to avoid double-counting tokens.
            // We also cap max_tokens conservatively so input + output fits within the context window.
            const OLLAMA_MAX_OUTPUT_TOKENS = 8192;
            // Detect thinking models (qwen3, deepseek-r1) and suppress thinking tokens
            // unless explicitly opted in. Thinking blocks consume token budget before JSON output
            // and can push total output past the token cap, causing truncated/invalid JSON.
            const isThinkingModel = /qwen3|deepseek-r1/i.test(modelToUse);
            const suppressThinking = isThinkingModel && config.noThink !== false;
            const systemContent = suppressThinking
                ? 'You are a precise JSON generator for a geopolitical simulation game. Generate realistic, nuanced political scenarios. Always respond with valid JSON only. Never include explanatory text. Do not use chain-of-thought reasoning.'
                : 'You are a precise JSON generator for a geopolitical simulation game. Generate realistic, nuanced political scenarios. Always respond with valid JSON. Never include explanatory text.';
            const userContent = suppressThinking ? `${prompt} /no_think` : prompt;
            const requestBody = {
                model: modelToUse,
                messages: [
                    { role: 'system', content: systemContent },
                    { role: 'user', content: userContent },
                ],
                max_tokens: Math.min((_a = config.maxTokens) !== null && _a !== void 0 ? _a : OLLAMA_MAX_OUTPUT_TOKENS, OLLAMA_MAX_OUTPUT_TOKENS),
                response_format: {
                    type: 'json_schema',
                    json_schema: { name: 'response', schema, strict: false },
                },
                options: { num_ctx: 131072 },
            };
            if (config.temperature !== undefined) {
                requestBody.temperature = config.temperature;
            }
            console.log(`[Ollama] Request to ${modelToUse} (attempt ${attempt + 1}/${maxRetries + 1})`);
            const promptPreview = prompt.length > 300 ? prompt.slice(0, 300) + '…' : prompt;
            emitModelEvent({
                level: 'info',
                code: 'llm_request',
                message: `→ ${modelToUse} (attempt ${attempt + 1}/${maxRetries + 1}) — ${prompt.length} chars`,
                data: { model: modelToUse, promptLength: prompt.length, promptPreview, attempt: attempt + 1 },
            });
            const response = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ollama'
                },
                body: JSON.stringify(requestBody),
                signal,
            });
            const elapsed = Date.now() - startTime;
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[Ollama] Error ${response.status} after ${elapsed}ms: ${errorText.substring(0, 500)}`);
                emitModelEvent({
                    level: 'error',
                    code: 'llm_error',
                    message: `← ${modelToUse} HTTP ${response.status} after ${elapsed}ms`,
                    data: { model: modelToUse, status: response.status, elapsed, detail: errorText.substring(0, 200) },
                });
                if (attempt < maxRetries) {
                    const backoff = baseDelay * Math.pow(2, attempt);
                    await new Promise(resolve => setTimeout(resolve, backoff));
                    continue;
                }
                return { data: null, usage: null, error: `HTTP ${response.status}: ${errorText.substring(0, 200)}` };
            }
            const data = await response.json();
            const responseText = (_e = (_d = (_c = (_b = data.choices) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.message) === null || _d === void 0 ? void 0 : _d.content) === null || _e === void 0 ? void 0 : _e.trim();
            const usage = {
                inputTokens: ((_f = data.usage) === null || _f === void 0 ? void 0 : _f.prompt_tokens) || 0,
                outputTokens: ((_g = data.usage) === null || _g === void 0 ? void 0 : _g.completion_tokens) || 0,
                provider: 'ollama',
                model: modelToUse
            };
            const finishReason = (_j = (_h = data.choices) === null || _h === void 0 ? void 0 : _h[0]) === null || _j === void 0 ? void 0 : _j.finish_reason;
            console.log(`[Ollama] Response in ${elapsed}ms, tokens: ${usage.inputTokens}+${usage.outputTokens}, finish=${finishReason}`);
            const responsePreview = responseText ? responseText.slice(0, 300) + (responseText.length > 300 ? '…' : '') : '(empty)';
            emitModelEvent({
                level: 'info',
                code: 'llm_response',
                message: `← ${modelToUse} ${elapsed}ms — ${usage.inputTokens}↑ ${usage.outputTokens}↓ tokens`,
                data: { model: modelToUse, elapsed, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, finishReason, responsePreview },
            });
            if (finishReason === 'length') {
                console.error(`[Ollama] Output truncated (finish_reason=length) from ${modelToUse} — ${usage.outputTokens} tokens used, cap=${Math.min((_k = config.maxTokens) !== null && _k !== void 0 ? _k : OLLAMA_MAX_OUTPUT_TOKENS, OLLAMA_MAX_OUTPUT_TOKENS)}`);
                emitModelEvent({ level: 'error', code: 'llm_truncated', message: `← ${modelToUse} output TRUNCATED (finish_reason=length) — ${usage.outputTokens} tokens used`, data: { model: modelToUse, outputTokens: usage.outputTokens, maxTokens: Math.min((_l = config.maxTokens) !== null && _l !== void 0 ? _l : OLLAMA_MAX_OUTPUT_TOKENS, OLLAMA_MAX_OUTPUT_TOKENS) } });
                return { data: null, usage, error: `Output truncated (finish_reason=length) — increase maxTokens or reduce prompt` };
            }
            if (!responseText) {
                console.error(`[Ollama] Empty content from ${modelToUse}. finish_reason=${finishReason}`);
                emitModelEvent({ level: 'error', code: 'llm_empty', message: `← ${modelToUse} empty response (finish_reason=${finishReason})`, data: { model: modelToUse } });
                return { data: null, usage, error: `Empty response (finish_reason=${finishReason})` };
            }
            try {
                // Strip Qwen3 / reasoning-model thinking blocks before extracting JSON
                let cleaned = responseText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
                cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
                if (jsonMatch)
                    cleaned = jsonMatch[0];
                try {
                    return { data: JSON.parse(cleaned), usage };
                }
                catch (_m) {
                    return { data: json5.parse(cleaned), usage };
                }
            }
            catch (e) {
                console.error('[Ollama] Failed to parse JSON response:', e, '| raw (200):', responseText.substring(0, 200));
                return { data: null, usage, error: 'JSON parse error' };
            }
        }
        catch (error) {
            const elapsed = Date.now() - startTime;
            if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
                console.error(`[Ollama] Timeout after ${elapsed}ms`);
                if (attempt < maxRetries)
                    continue;
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
 * Routes to appropriate provider based on model name
 */
async function callModelProvider(config, prompt, schema, modelOverride) {
    const modelToUse = modelOverride || exports.PHASE_MODELS.drafter;
    const provider = getProvider(modelToUse);
    if (provider === 'openai') {
        return callOpenAI(config, prompt, schema, modelToUse);
    }
    if (provider === 'ollama') {
        return callOllama(config, prompt, schema, modelToUse);
    }
    throw new Error(`Unsupported model: ${modelToUse}. Only OpenAI (gpt-*, o1, o3, text-embedding*) and Ollama (ollama:*) models are supported.`);
}
/**
 * Generate embeddings using OpenAI
 * Uses text-embedding-3-small for cost efficiency ($0.02/1M tokens)
 */
async function generateEmbedding(text) {
    var _a, _b, _c;
    const modelToUse = exports.PHASE_MODELS.embedding;
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
        const usage = {
            inputTokens: ((_a = data.usage) === null || _a === void 0 ? void 0 : _a.total_tokens) || 0,
            outputTokens: 0,
            provider: 'openai',
            model: modelToUse
        };
        return { embedding: ((_c = (_b = data.data) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.embedding) || null, usage };
    }
    catch (error) {
        console.error('[OpenAI Embedding] Error:', error);
        return { embedding: null, usage: null };
    }
}
/**
 * Calculate cosine similarity between two embeddings
 */
function cosineSimilarity(a, b) {
    if (a.length !== b.length)
        return 0;
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
const COST_PER_MILLION = {
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-4.1-mini': { input: 0.40, output: 1.60 },
    'gpt-4o': { input: 2.50, output: 10.00 },
    'o1-mini': { input: 1.10, output: 4.40 },
    'o3-mini': { input: 1.10, output: 4.40 },
    'text-embedding-3-small': { input: 0.02, output: 0 },
    'ollama': { input: 0, output: 0 },
};
function calculateCost(usage) {
    const costs = COST_PER_MILLION[usage.model] || { input: 0.50, output: 2.00 };
    return (usage.inputTokens * costs.input + usage.outputTokens * costs.output) / 1000000;
}
/**
 * Aggregate costs from multiple usages
 */
function aggregateCosts(usages) {
    const result = {
        openai: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
        ollama: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
        totalUsd: 0
    };
    for (const usage of usages) {
        if (!usage)
            continue;
        const cost = calculateCost(usage);
        if (usage.provider === 'openai') {
            result.openai.inputTokens += usage.inputTokens;
            result.openai.outputTokens += usage.outputTokens;
            result.openai.costUsd += cost;
        }
        else if (usage.provider === 'ollama') {
            result.ollama.inputTokens += usage.inputTokens;
            result.ollama.outputTokens += usage.outputTokens;
            result.ollama.costUsd += cost;
        }
        result.totalUsd += cost;
    }
    return result;
}
async function testOllamaConnection() {
    const baseUrl = getOllamaBaseUrl();
    if (!baseUrl) {
        return { connected: false, models: [], error: 'No Ollama base URL configured' };
    }
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(`${baseUrl}/models`, {
            headers: { 'Authorization': 'Bearer ollama' },
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
            return { connected: false, models: [], error: `HTTP ${response.status}` };
        }
        const data = await response.json();
        const models = (data.data || []).map((m) => m.id).filter(Boolean);
        return { connected: true, models };
    }
    catch (error) {
        return { connected: false, models: [], error: error instanceof Error ? error.message : String(error) };
    }
}
//# sourceMappingURL=model-providers.js.map