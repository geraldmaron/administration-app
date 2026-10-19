import type { ItemResult, JobDriver, JobItem } from "../driver.js";
export type ReplicateFetch = (url: string, init: RequestInit) => Promise<{
    ok: boolean;
    status: number;
    json(): Promise<unknown>;
    arrayBuffer(): Promise<ArrayBuffer>;
    /** Present on a real Response; used to honor `Retry-After` on a 429. */
    headers?: {
        get(name: string): string | null;
    };
}>;
export type ReplicateDriverOptions = {
    readonly apiToken: string;
    /** "owner/name", e.g. "black-forest-labs/flux-schnell". */
    readonly model: string;
    readonly fetchImpl: ReplicateFetch;
    readonly outputDir: string;
    readonly costPerImageUsd: number;
    /** Model-specific input beyond the prompt — aspect ratio, steps, output format. */
    readonly input?: Readonly<Record<string, unknown>>;
    /**
     * Brings the model's output to the shipped standard before the gate sees it.
     *
     * The same contract the closed-weight driver holds, and for the same reason:
     * an open-weight model returns whatever its own defaults produce, which is
     * never the size the catalogue ships. Without it every image is paid for and
     * then refused, nothing journals done, and the next run pays again — the
     * exact failure this cheaper backend exists to avoid.
     */
    readonly normalize?: (source: string) => Promise<{
        filePath: string;
        bytes: number;
        mimeType: string;
    } | undefined>;
    readonly maxAttempts?: number;
    readonly retryDelayMs?: number;
    /** How long to keep asking about a prediction that outlived the blocking wait. */
    readonly maxPollMs?: number;
    readonly pollIntervalMs?: number;
};
export declare class ReplicateDriver implements JobDriver {
    private readonly options;
    readonly name = "replicate";
    private readonly maxAttempts;
    private readonly retryDelayMs;
    private readonly maxPollMs;
    private readonly pollIntervalMs;
    constructor(options: ReplicateDriverOptions);
    /**
     * Follow a prediction that outlived the blocking wait until it settles.
     *
     * Abandoning it is the expensive mistake: the compute is already running and
     * already billed, so a driver that gave up at the wait's expiry paid full
     * price and threw the image away, then paid again on the next run because
     * nothing journaled done.
     */
    private settle;
    runItem(item: JobItem): Promise<ItemResult>;
    private generate;
}
