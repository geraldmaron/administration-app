import type { StateId } from "@admin/world";
import { type Campaign } from "./state.js";
import type { Effect, EffectPacket } from "./effects.js";
import { type DirectiveStatus } from "./directives.js";
import { type CourtOrderKind, type CourtOrderKindDef } from "./court-order-records.js";
/** §1805 dispositions in 2025 approved in whole or in part: (153 + 79 + 15) of 251. */
export declare const FISC_APPROVAL_2025: number;
/** Of those approved, the share the court modified or denied in part: (79 + 15) of 247. */
export declare const FISC_NARROWED_2025: number;
/** The text after "This needs " for an application the record cannot support. */
export declare const COURT_ORDER_REFUSALS: Readonly<Record<CourtOrderKind, string>>;
export type CourtOrderEvidence = {
    /** The FBI's capability to build the affidavit, 0..1. */
    readonly capability: number;
    /** How strong the kind's own predicate is on this week's record, 0..1; zero means absent. */
    readonly predicate: number;
    /** A carried investigative priority on this state. */
    readonly priority: boolean;
    /** Collection already run under a court order in this state. */
    readonly surveillance: boolean;
    readonly score: number;
};
export declare function courtOrderEvidence(campaign: Campaign, state: StateId, kind: CourtOrderKind): CourtOrderEvidence;
export type CourtOrderBench = {
    readonly court: string;
    readonly shift: number;
};
export type CourtOrderOdds = {
    readonly granted: number;
    readonly narrowed: number;
    readonly denied: number;
};
export declare function courtOrderOdds(kind: CourtOrderKind, evidence: CourtOrderEvidence, bench?: number): CourtOrderOdds;
export type CourtOrderAvailability = {
    readonly ok: true;
} | {
    readonly ok: false;
    readonly missing: string;
};
export type CourtOrderProjection = {
    readonly kind: CourtOrderKind;
    readonly def: CourtOrderKindDef;
    readonly state: StateId;
    readonly availability: CourtOrderAvailability;
    readonly evidence: CourtOrderEvidence;
    readonly bench?: CourtOrderBench;
    readonly odds: CourtOrderOdds;
    /** How many weeks the court can take to answer. */
    readonly decisionWeeks: {
        readonly min: number;
        readonly max: number;
    };
    readonly termWeeks: number;
    /** What Justice would do with the instruction this week; absent when nobody holds the Attorney General's authority. */
    readonly attorneyGeneral?: DirectiveStatus;
    /** Whether this application would renew an order already running. */
    readonly renewal: boolean;
};
/** Everything the desk shows before the application is made, out of the same reads the application takes. */
export declare function courtOrderProjection(campaign: Campaign, state: StateId, kind: CourtOrderKind): CourtOrderProjection;
export type CourtOrderResult = {
    readonly ok: true;
    readonly packet: EffectPacket;
    readonly filed: boolean;
} | {
    readonly ok: false;
    readonly reason: string;
};
/**
 * Ask Justice to apply for a court order covering one state. Justice declining
 * or slow-walking the instruction is still an answer: the packet carries the
 * directive's record and nothing is filed.
 */
export declare function requestCourtOrder(campaign: Campaign, state: StateId, kind: CourtOrderKind): CourtOrderResult;
/** Every application the court answers next week, drawn the week before so the answer lands with the week it is dated. */
export declare function courtOrderRulingEffects(campaign: Campaign): readonly Effect[];
