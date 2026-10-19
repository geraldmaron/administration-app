import type { JobDriver, JobItem, ItemResult } from "../driver.js";
export type OpenRouterFetch = (url: string, init: RequestInit) => Promise<{
    ok: boolean;
    status: number;
    json(): Promise<unknown>;
}>;
export type OpenRouterModels = {
    readonly default: string;
    readonly perStage?: Readonly<Record<string, string>>;
};
export type OpenRouterDriverOptions = {
    readonly apiKey: string;
    readonly models: OpenRouterModels;
    readonly fetchImpl: OpenRouterFetch;
    readonly maxAttempts?: number;
    readonly retryDelayMs?: number;
};
export declare const FALLBACK_COST_PER_1K_TOKENS_USD = 0.01;
/**
 * The completion length a single scenario item is assumed to risk.
 *
 * Measured rather than guessed, and from one observation: the first real
 * unattended run billed 56,580 tokens against a 16,346-token prompt, so the
 * model returned roughly forty thousand. That is far more than four scenarios
 * of prose require, which is worth knowing on its own — but the number the
 * spend gate quotes has to be what a run can actually cost, not what the output
 * ought to weigh. Widen it when a second run disagrees; it is a ceiling for a
 * warning, not a budget to spend up to.
 */
export declare const ASSUMED_MAX_COMPLETION_TOKENS = 48000;
/**
 * What one item may cost, priced off the prompt actually being sent.
 *
 * The prompt half is known exactly — it is a string in hand — and the
 * completion half is the assumption above. A flat per-item constant could not
 * see either, which is how a 65,000-character brief was authorized at the same
 * price as a one-line one.
 */
export declare function estimateItemWorstCaseUsd(prompt: string): number;
export declare class OpenRouterDriver implements JobDriver {
    private readonly options;
    readonly name = "openrouter";
    private readonly maxAttempts;
    private readonly retryDelayMs;
    constructor(options: OpenRouterDriverOptions);
    private modelFor;
    runItem(item: JobItem): Promise<ItemResult>;
}
