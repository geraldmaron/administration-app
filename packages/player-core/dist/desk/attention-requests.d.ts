import { type Campaign, type NationCondition, type WillingnessProjection } from "@admin/engine";
import { type StateId } from "@admin/world";
export type ClaimGroup = {
    readonly signature: string;
    readonly openedTurn: number;
    readonly expiresTurn: number;
    readonly reason: string;
    readonly states: readonly StateId[];
};
/**
 * Every emergency a governor is waiting on Washington over, bundled by the
 * ask rather than by the state asking: claims that share a signature and an
 * opening turn are the same emergency asking once.
 */
export declare function governorRequestGroups(campaign: Campaign): readonly ClaimGroup[];
export type GuardCandidate = {
    readonly state: StateId;
    readonly stateName: string;
    readonly condition: NationCondition;
    readonly forecast: WillingnessProjection;
};
/**
 * Every state a Guard federalization could be asked over right now, worst
 * emergency first. Projects off `projectGovernorWillingness` directly, the
 * same forecast function `requestGuardFederalization` (`guard-
 * federalization.ts`) decides through — one terms builder (`guardAskFor`),
 * read on both sides of the ask.
 */
export declare function guardRequestCandidates(campaign: Campaign): readonly GuardCandidate[];
/** The condition a candidate's headline names, in the Desk's own hazard vocabulary. */
export declare function guardCandidateHeadline(candidate: GuardCandidate): string;
