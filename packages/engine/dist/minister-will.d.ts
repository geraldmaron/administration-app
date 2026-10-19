import type { Person, PersonId, RoleId } from "@admin/world";
import type { Campaign } from "./state.js";
import { type DecisionStamp, type Term, type Willingness, type WillingnessProjection } from "./willingness.js";
export type MinisterQuestion = "minister-offer" | "minister-proposal" | "minister-break";
/** The week a Secretary is deciding in: what the President has done to them, and what their department is doing. */
export type MinisterSituation = {
    /** Times overruled over the last half year. */
    readonly overruled: number;
    /** 0..1: how badly the department is carrying its work. */
    readonly exposure: number;
    /** 1 of the President's own side, -1 from across the aisle, 0 of no party. */
    readonly partisanship: -1 | 0 | 1;
};
/** Five overrulings in half a year is a Secretary who has stopped being asked. */
export declare const OVERRULED_FULL = 5;
/** How badly a chair's department is carrying its work, 0..1. Zero for a chair that runs no department. */
export declare function departmentExposure(campaign: Campaign, role: RoleId): number;
export declare function ministerSituation(campaign: Campaign, role: RoleId, person: Person): MinisterSituation;
/** A proposal's disloyalty weight is negative: loyalty itself is what brings a Secretary to the President first. */
export declare function ministerTerms(question: MinisterQuestion, person: Person, situation: MinisterSituation): readonly Term[];
/**
 * The decision, with its one draw.
 *
 * The stream is keyed by the question, the person and the chair, and not by
 * the week: the same Secretary in the same situation gives the same answer
 * every week, and the answer changes only when something about them or their
 * week does.
 */
export declare function decideMinister(campaign: Campaign, question: MinisterQuestion, role: RoleId, person: Person): Willingness;
/** The same question with no draw in it: what a Desk card may say before the Secretary has decided. */
export declare function projectMinister(campaign: Campaign, question: MinisterQuestion, role: RoleId, person: Person): WillingnessProjection;
/**
 * The reason of record. Public: a Secretary's reasons for offering to go, for
 * asking, or for walking out are the President's to read, and the country's
 * once the Secretary says them out loud.
 */
export declare function ministerStamp(willingness: Willingness, person: PersonId, role: RoleId): DecisionStamp;
