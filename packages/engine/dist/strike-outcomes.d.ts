import type { Effect } from "./effects.js";
import type { ResolutionRequest } from "./resolution.js";
import type { RngStreams } from "./rng.js";
import { type Campaign, type CasualtyBand } from "./state.js";
export type CivilianRisk = {
    readonly chance: number;
    readonly basis: string;
};
/** A separate axis from accomplishing the military objective. */
export declare function strikeCivilianRisk(campaign: Campaign, request: ResolutionRequest): CivilianRisk | undefined;
export type StrikeOutcome = {
    readonly effects: readonly Effect[];
    readonly account: string;
    readonly casualties?: CasualtyBand;
};
/** Seeded simulation assumptions. Counts describe a realized event, never a promised result. */
export declare function resolveStrikeHarm(campaign: Campaign, request: ResolutionRequest, streams: RngStreams, missionSucceeded?: boolean): StrikeOutcome | undefined;
/** Evidence is an assessment input from scenario/operator producers, never inferred from national statistics. */
export declare function validStrikeAssessment(campaign: Campaign, request: ResolutionRequest): boolean;
