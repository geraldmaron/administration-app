import type { Campaign } from "./state.js";
/**
 * How the pipeline reads as a whole: what the player is looking at when they
 * open the appointments room.
 */
export type PipelineReading = {
    readonly total: number;
    readonly inExecutive: number;
    readonly inCommittee: number;
    readonly onFloor: number;
    readonly confirmed: number;
    readonly failed: number;
    readonly medianDays: number;
};
export declare function selectPipelineReading(campaign: Campaign): PipelineReading;
