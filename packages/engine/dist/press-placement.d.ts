import type { AlignmentVector, Campaign } from "./state.js";
import type { AdministrationParty } from "./state-legislature.js";
/**
 * How much of the President's reading the platform carries beside the party's.
 * Half: a platform is chosen inside a party, so it bends the party's reading
 * toward the voters it courts rather than replacing it.
 */
export declare const PLATFORM_PLACEMENT_WEIGHT = 0.5;
/** The party's beliefs, bent toward the voters the platform courts. */
export declare function placementFor(party: AdministrationParty, platform?: readonly string[]): Partial<AlignmentVector>;
/** The President this campaign seated, placed. */
export declare function placementOf(campaign: Campaign): Partial<AlignmentVector>;
