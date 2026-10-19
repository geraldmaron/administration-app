import type { PersonId } from "@admin/world";
import type { Bill, Campaign, PersonCooperation } from "./state.js";
import { type DecisionStamp } from "./willingness.js";
/** Actual recorded dialogue, distinct from the dossier's inferred biography contacts. */
export declare function knownPersonContacts(campaign: Campaign, actId?: string): readonly PersonCooperation[];
/** Formal issue reach caps an effort; it does not create contacts or obedience. */
export declare function issueReach(campaign: Campaign, person: PersonId, bill: Bill): number;
/** Public eligibility only. Private willingness is considered when the request arrives. */
export declare function availableIssueBrokers(campaign: Campaign, bill: Bill): readonly PersonId[];
/** A recipient retains personal convictions and constituency interests. */
export declare function issuePreference(campaign: Campaign, person: PersonId, bill: Bill): number;
export declare function issueCooperationDecision(campaign: Campaign, person: PersonId, bill: Bill, direction: 1 | -1, action: string, bond: number): import("./willingness.js").Willingness | undefined;
export declare function answersIssue(campaign: Campaign, person: PersonId, bill: Bill, direction: 1 | -1, action: string, bond: number): boolean;
export type InfluenceResponse = PersonCooperation & {
    readonly delta: number;
    readonly depth: number;
    readonly decision?: DecisionStamp;
};
/** Directed breadth-first traversal: one actor once, two hops, office budget, and an independent answer at every step. */
export declare function propagateIssue(campaign: Campaign, source: PersonId, bill: Bill, action: string, direction: 1 | -1, exclude?: readonly PersonId[]): readonly InfluenceResponse[];
