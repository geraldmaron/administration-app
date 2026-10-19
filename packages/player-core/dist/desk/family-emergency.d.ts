import { type Campaign } from "@admin/engine";
import { type ClaimGroup, type GuardCandidate } from "./attention-requests";
import { type FamilySource } from "./family-raise";
/** The Guard asks that belong to a relief request: the same hazard, in a state that is waiting. */
export declare function guardAsksFor(group: ClaimGroup, candidates: readonly GuardCandidate[]): readonly GuardCandidate[];
/** The conditions a relief case already carries, whose own rows would say the same matter twice. */
export declare function conditionsInReliefCases(campaign: Campaign): ReadonlySet<string>;
export declare function emergencySources(campaign: Campaign): readonly FamilySource[];
