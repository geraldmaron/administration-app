import { type PersonId, type StateId } from "@admin/world";
import type { Campaign } from "./state.js";
import type { ExecutiveOrder } from "./orders.js";
import type { OrderSubject } from "./order-subjects.js";
import type { ConstitutionalGround } from "./legislative-acts.js";
import type { CourtMatter } from "./state-judiciary.js";
import { type PlaintiffClass } from "./order-exposure.js";
import { type StatePlaintiff } from "./state-suits.js";
import { type ContestedRemoval } from "./institutions.js";
/** Each state's injury relative to the most injured state, 0..1. */
export declare function stateInjuries(campaign: Campaign, order: ExecutiveOrder, subject?: OrderSubject): Readonly<Partial<Record<StateId, number>>>;
export type FilingOdds = {
    /** The chance a suit is filed at all; says nothing about who would win. */
    readonly chance: number;
    readonly states: readonly StatePlaintiff[];
    readonly classes: Readonly<Partial<Record<PlaintiffClass, number>>>;
    readonly venue: string;
};
/**
 * Whether anyone sues: the strongest state plaintiff, and each private class
 * that can show an injury, as independent chances to file. Lawfulness is not
 * an input.
 */
export declare function filingOdds(campaign: Campaign, order: ExecutiveOrder, subject?: OrderSubject): FilingOdds;
/** The parties a filed challenge names: the states that would sue, then the leading private plaintiff. */
export declare function challengeParties(campaign: Campaign, order: ExecutiveOrder, subject?: OrderSubject): CourtMatter["parties"];
/** The brief for an ordinary order challenge: who sues, on what injury, on which distinct grounds. */
export declare function orderChallengeMatter(campaign: Campaign, order: ExecutiveOrder, question: string, ground: ConstitutionalGround, subject?: OrderSubject): CourtMatter;
export type LegalExposureOrigin = {
    readonly kind: "executive-order";
    readonly recordId: string;
    readonly orderId: string;
} | {
    readonly kind: "misconduct";
    readonly matterId: string;
    readonly causeId: string;
} | {
    readonly kind: "removal";
    readonly institution: string;
    readonly person: PersonId;
    readonly turn: number;
};
export type LegalExposure = {
    readonly id: string;
    readonly origin: LegalExposureOrigin;
    /** What the act stands on, kept from the originating act. */
    readonly authority: string;
    /** The chance a suit or a charge was put at when the exposure arose. */
    readonly filingChance: number;
    /**
     * The chance a court rules against the act, where the exposure prices it
     * once; an order's merits are priced at each stage by the bench instead.
     */
    readonly meritsChance?: number;
    readonly status: "exposed" | "filed" | "decided" | "referred" | "charged" | "declined";
    /** Every record that represents this one dispute. */
    readonly representations: readonly string[];
};
/** Weeks from a public finding to a charging decision; a design band, not a statutory clock. */
export declare const CHARGING_DECISION_WEEKS: {
    readonly min: 13;
    readonly max: 52;
};
/** The share of public misconduct findings that end in a charge; a design judgment. */
export declare const CHARGE_CHANCE = 0.3;
/** The chance a member removed from a contested seat sues to be reinstated; a design judgment. */
export declare const REMOVAL_SUIT_CHANCE = 0.85;
/**
 * The chance a court orders such a member reinstated. A design judgment set
 * below even because Trump v. Slaughter's reasoning (a body that makes rules
 * with the force of law, enforces them and sues in court exercises executive
 * power, and its head must answer to the President) reaches every commission
 * that does those things, though no holding names it.
 */
export declare const REMOVAL_REINSTATEMENT_CHANCE = 0.2;
/** Weeks from the removal to the removed member's decision to sue; a design band. */
export declare const REMOVAL_FILING_WEEKS: {
    readonly min: 1;
    readonly max: 4;
};
/** When the removed member decides, and whether they sue: drawn once per removal. */
export declare function removalSuit(campaign: Campaign, institution: string, removal: ContestedRemoval): {
    readonly decidesTurn: number;
    readonly sues: boolean;
};
/** The proceeding id a filed removal suit runs under. */
export declare function removalProceedingId(institution: string, removal: ContestedRemoval): string;
/** The exposures contested commission removals carry, for the officers board. */
export declare function selectRemovalExposures(campaign: Campaign): readonly LegalExposure[];
/** Every legal exposure the administration carries, one per origin. */
export declare function selectLegalExposures(campaign: Campaign, catalogue: (id: string) => ExecutiveOrder | undefined): readonly LegalExposure[];
