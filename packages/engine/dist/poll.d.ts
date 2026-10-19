import type { Campaign } from "./state.js";
/** Three points, the width of a national tracking sample. */
export declare const SAMPLE_MARGIN = 0.03;
export type TrackingPoll = {
    readonly reading: number;
    readonly low: number;
    readonly high: number;
};
/** Where a tracking poll would put approval this week, and the band around that reading. */
export declare function trackingPoll(campaign: Campaign): TrackingPoll;
