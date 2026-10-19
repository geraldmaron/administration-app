import type { Campaign, Effect } from "@admin/engine";
import type { ResolvedLocus } from "./scenario-locus.js";
/**
 * How much of an answer's net national opinion reading carries to the bound
 * governor's disposition before the engine caps the step. A planning value;
 * the cap, not this gain, is what limits a single answer.
 */
export declare const GOVERNOR_STANDING_GAIN = 0.5;
/**
 * The statehouse reading an answer: when a decision was datelined in one of
 * the President's own states, the governor there moves toward or away from the
 * administration with how the answer reads to the public, which is the sign of
 * the opinion effects the reply already carries. Nothing for Washington,
 * abroad, or a reply that moves no opinion.
 */
export declare function governorStandingEffects(campaign: Campaign, locus: ResolvedLocus | undefined, resolved: readonly Effect[], reason: string): readonly Effect[];
