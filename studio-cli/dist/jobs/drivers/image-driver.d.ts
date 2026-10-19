import type { ItemResult, JobDriver, JobItem } from "../driver.js";
export type ImageFetch = (url: string, init: RequestInit) => Promise<{
    ok: boolean;
    status: number;
    json(): Promise<unknown>;
}>;
export type ImageDriverOptions = {
    readonly apiKey: string;
    readonly model: string;
    readonly fetchImpl: ImageFetch;
    /** Where generated images land. One directory per job, created on demand. */
    readonly outputDir: string;
    /**
     * What one image from this model costs. OpenRouter bills per image for image
     * models rather than per token, and the price is not in the response — so it
     * is configured per run and reconciled against the real bill afterwards.
     * The budget ceiling is only as honest as this number.
     */
    readonly costPerImageUsd: number;
    /**
     * Brings the model's output to the shipped standard before the gate sees it.
     *
     * Optional only so the driver can be tested without shelling out to image
     * tools. In a real run it is not optional in any meaningful sense: every
     * model returns something larger than the catalogue ships, so without this
     * the gate rejects the whole batch, nothing is journaled done, and the next
     * run pays for all of it again.
     */
    readonly normalize?: (source: string) => Promise<{
        filePath: string;
        bytes: number;
        mimeType: string;
    } | undefined>;
    readonly maxAttempts?: number;
    readonly retryDelayMs?: number;
};
/** The record a generated image leaves behind. The gate validates this shape. */
export type GeneratedImage = {
    readonly itemId: string;
    readonly filePath: string;
    readonly bytes: number;
    readonly model: string;
    readonly costUsd: number;
    readonly mimeType: string;
    readonly prompt: string;
};
export declare class ImageDriver implements JobDriver {
    private readonly options;
    readonly name = "image";
    private readonly maxAttempts;
    private readonly retryDelayMs;
    constructor(options: ImageDriverOptions);
    runItem(item: JobItem): Promise<ItemResult>;
    private generate;
}
