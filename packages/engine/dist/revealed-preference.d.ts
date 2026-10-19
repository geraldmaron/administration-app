import type { NationTraits } from "@admin/world";
import { type Campaign } from "./state.js";
export type RevealedPreferenceProfile = {
    readonly concedesUnderPressure: number;
    readonly escalatesWhenTested: number;
    readonly honorsFriends: number;
    readonly evidence: {
        readonly pressedCommitments: number;
        readonly friendshipTests: number;
    };
};
/**
 * The world's file on this administration, recomputed from the campaign record.
 */
export declare function revealedPreference(campaign: Campaign): RevealedPreferenceProfile;
/**
 * The profile in the register a foreign service would file it in — short, dry,
 * and silent about anything the record has not established. A scalar with no
 * evidence behind it produces no line at all rather than a confident 0.5.
 */
export declare function describeRevealedPreference(profile: RevealedPreferenceProfile): readonly string[];
/**
 * How much more, or less, attractive a move against this player looks to a
 * nation with these traits, given what the world has read off the record.
 *
 * An opportunist prices a probe against a government that pays; a vengeful one
 * moves earlier on a government that abandons its friends; and any of them
 * charges the difference back against a government that has shown it climbs.
 * Multiply an existing move score by it — it never chooses, it weights.
 */
export declare function probePricingMultiplier(profile: RevealedPreferenceProfile, counterpart: NationTraits): number;
