import type { IdeologyVector } from "@admin/world";
import type { Campaign } from "./state.js";
import type { Effect } from "./effects.js";
/**
 * The chance a term brings a consequential ruling on one modeled doctrine.
 * A design judgment: across six doctrines it gives about one ruling a term
 * that changes how the President's own acts are reviewed, a small share of
 * the argued cases.
 */
export declare const DOCTRINE_RULING_CHANCE = 0.18;
/** How far one ruling moves later merits on its doctrine, and the most precedent can move them. */
export declare const DOCTRINE_STEP = 0.06;
export declare const DOCTRINE_CAP = 0.15;
export type Doctrine = {
    readonly id: string;
    readonly question: string;
    readonly orders: readonly string[];
    /** The executive-power position the doctrine tests, read against each justice's ideology. */
    readonly lean: IdeologyVector;
    readonly petitioner: string;
    readonly respondent: string;
};
export declare const DOCTRINES: readonly Doctrine[];
export type DocketTerm = {
    readonly termYear: number;
    readonly filings: number;
    readonly argued: number;
    readonly signedOpinions: number;
    /** The doctrines this term rules on in a way that changes modeled law. */
    readonly consequential: readonly string[];
};
/** The term's aggregate docket, the same for a seed every time it is read. */
export declare function docketTerm(campaign: Campaign, termYear: number): DocketTerm;
/** A justice's inclination to rule against the executive on a question; the same shape as an order's merits. */
export declare function narrowingPropensity(lean: IdeologyVector, member: {
    readonly ideology: IdeologyVector;
    readonly integrity: number;
    readonly competence: number;
}): number;
/** In the late-June opinion week, the term's consequential rulings are recorded as cases. */
export declare function backgroundDocketEffects(campaign: Campaign): readonly Effect[];
/** How far precedent has moved the merits for an order: up when the Court has narrowed its doctrine. */
export declare function doctrineShift(campaign: Campaign, orderId: string): number;
