/**
 * Whether a force can strike from off the battlefield.
 *
 * Reach comes from the projection profile the war file already uses.
 * There is no kilometer range in this module. A cruise and standoff stock
 * that the munitions table does not state cannot be fired.
 */
import type { ForceProjectionProfile } from "./warfighting.js";
export type StandoffBand = "regional" | "expeditionary";
export type StandoffResult = {
    readonly ok: true;
    readonly band: StandoffBand;
} | {
    readonly ok: false;
    readonly reason: string;
};
/** A local partner or a neighbor. Not an ocean strike, and not a missile count. */
export declare function proxyReach(profile: ForceProjectionProfile): boolean;
export declare function standoffStrike(profile: ForceProjectionProfile, stock: number | null): StandoffResult;
