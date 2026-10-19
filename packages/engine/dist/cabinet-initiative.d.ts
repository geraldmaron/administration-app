import { type Charter, type Person, type PersonId, type RoleId } from "@admin/world";
import { type Campaign, type ProposalAct } from "./state.js";
import { type ExecutiveOrder } from "./orders.js";
import { type DecisionStamp, type Term, type Willingness, type WillingnessProjection } from "./willingness.js";
export declare const ROLE_DEFENSE: RoleId;
export declare const ROLE_STATE: RoleId;
/** One act a Secretary could bring this week, and how well it suits them. */
export type InitiativeCandidate = {
    readonly role: RoleId;
    readonly person: Person;
    readonly act: ProposalAct;
    /** 0..1: how well the act answers the Secretary's own politics and temper. */
    readonly fit: number;
    /** A stable name for the act, which keys the Secretary's draw on it. */
    readonly key: string;
    /** Why this Secretary, in plain words, completing a sentence that starts with their name. */
    readonly motive: string;
};
/**
 * How likely the other side is to receive it, 0..1, from the projection alone:
 * the share of the noise band the margin clears. Seed-free, which is what lets
 * a Secretary's choice and the Desk's price agree.
 */
export declare function receiveChance(projection: WillingnessProjection): number;
/** How far past the office a Secretary will ask the President to reach: bolder further, the principled less far. */
export declare function overreachCeiling(person: Person): number;
/** The orders on the desk this week that nobody has signed yet, by the chair whose department would carry each. */
export declare function ordersByChair(campaign: Campaign): ReadonlyMap<RoleId, readonly ExecutiveOrder[]>;
/** The one act this Secretary would bring this week, if any: the best fit of everything their chair can put forward. */
export declare function initiativeFor(campaign: Campaign, role: RoleId, person: Person, orders: ReadonlyMap<RoleId, readonly ExecutiveOrder[]>): InitiativeCandidate | undefined;
/**
 * A loyal, ambitious Secretary with an act they believe in brings it; one the
 * President keeps overruling stops. Party is a nudge, not a reason: a Secretary
 * from across the aisle still has ideas, and is a little slower to offer them.
 */
export declare function initiativeTerms(campaign: Campaign, candidate: InitiativeCandidate): readonly Term[];
/** The decision, with its one draw, keyed by the Secretary, the chair and the act and never the week. */
export declare function decideInitiative(campaign: Campaign, candidate: InitiativeCandidate): Willingness;
export declare function projectInitiative(campaign: Campaign, candidate: InitiativeCandidate): WillingnessProjection;
/** Public, like every other reason a Secretary gives the President. */
export declare function initiativeStamp(willingness: Willingness, person: PersonId, role: RoleId): DecisionStamp;
/** What the act is, as the object of "proposes". */
export declare function proposalActWords(campaign: Campaign, act: ProposalAct): string;
/** The charter the campaign was founded under, which an order is weighed against. */
export declare function foundedCharter(campaign: Campaign): Charter | undefined;
/** Whether the Attorney General would object in writing to this order as it stands this week. */
export declare function attorneyGeneralObjects(campaign: Campaign, order: ExecutiveOrder): boolean;
/** What taking it does, in a sentence the Desk can print under the proposal. */
export declare function proposalActConsequence(campaign: Campaign, act: ProposalAct): string;
/** Who proposes what, why, and what taking it does: the whole of the Desk's sentence. */
export declare function initiativeSummary(campaign: Campaign, candidate: InitiativeCandidate): string;
