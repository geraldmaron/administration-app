import { type PersonId, type RoleId } from "@admin/world";
import { type RngStreams } from "./rng.js";
import type { Campaign } from "./state.js";
/** God Mode reads the true campaign; staff forecasts use the named adviser's competence (0..1). */
export type ForecastBasis = {
    readonly kind: "truth";
} | {
    readonly kind: "staff";
    readonly role: RoleId;
    readonly person?: PersonId;
    readonly competence: number;
};
/** The widest analyst error on a personality trait read by the services, as a share of its 0..1 scale, at no competence. */
export declare const BELIEF_TRAIT_ERROR = 0.2;
/** The widest error on a published rate (unemployment, inflation, growth), in points of the rate, at no competence. */
export declare const BELIEF_RATE_ERROR = 0.01;
/** The widest error on each of the six judgments as the government reads them from polling, at no competence: a poor shop reads the country up to five points off either way. */
export declare const BELIEF_OPINION_ERROR = 0.05;
export declare function beliefStreams(campaign: Campaign, member: number): RngStreams;
/**
 * The campaign as the government believes it, for ensemble member `member`.
 * Pure: the live campaign is read, never written. Under a truth basis it is
 * the campaign itself.
 */
export declare function believedCampaign(campaign: Campaign, member: number, basis: ForecastBasis): Campaign;
/** How much of the world the services read: the share of foreign governments with intelligence on them. */
export declare function intelligenceCoverage(campaign: Campaign): number;
