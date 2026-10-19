import { z } from "zod";
export declare const CampaignSeed: z.core.$ZodBranded<z.ZodString, "CampaignSeed", "out">;
export type CampaignSeed = z.infer<typeof CampaignSeed>;
export declare function makeCampaignSeed(raw: string): CampaignSeed;
export type RngStream = {
    readonly key: string;
    next(): number;
    nextInt(min: number, max: number): number;
    pick<T>(items: readonly T[]): T;
};
export type RngStreams = {
    stream(...keyParts: Array<string | number>): RngStream;
};
/**
 * A deterministic index into a bank, keyed by a string rather than by a stream.
 *
 * The stream form is for draws that advance with the campaign; this is for the
 * draws that must come out the same every time the same thing is read, however
 * many times a surface re-renders it. There is no state to advance and no order
 * to depend on — the key is the whole input.
 */
export declare function hashIndex(seed: string, modulo: number): number;
/** The same hash as a fraction in [0, 1), for a weighted draw off a fixed key. */
export declare function hashFraction(seed: string): number;
export declare function createRngStreams(seed: CampaignSeed): RngStreams;
export declare function replay<TResult>(seed: CampaignSeed, program: (streams: RngStreams) => TResult): [TResult, TResult];
