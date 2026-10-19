import type { NationId, StateId } from "@admin/world";
import { type Campaign, type GameDate } from "./state.js";
import type { EffectPacket } from "./effects.js";
import type { TurnPhase } from "./turn-loop.js";
import { IC_ELEMENTS, icElement, type Discipline, type IcElementDef, type IcElementId } from "./ic-elements.js";
import { type CollectionFocus } from "./collection-focus.js";
import { type AgReferral, type IntelSubject } from "./intel-authority.js";
import { type SurveillanceIncident } from "./surveillance-incident.js";
export { IC_ELEMENTS, icElement };
export type { Discipline, IcElementDef, IcElementId };
export type { SurveillanceIncident } from "./surveillance-incident.js";
export type TaskingId = string;
/** What the request is pointed at, which is the question the boundary answers. */
export type TaskingTargetKind = "foreign-nation" | "foreign-person" | "domestic-state" | "domestic-person" | "domestic-politics";
export declare const PUBLIC_STATE_QUESTION: string;
export type CollectionTasking = {
    readonly id: TaskingId;
    readonly element: IcElementId;
    readonly discipline: Discipline;
    readonly targetKind: TaskingTargetKind;
    /** A nation id, a name, or a description. Free-form because the boundary reads `targetKind`, not this. */
    readonly target: string;
    readonly question: string;
    /** Absent on older taskings: their free-text question was never used to choose evidence. */
    readonly focus?: CollectionFocus;
    /** Recorded context only; never parsed to select findings or authorize collection. */
    readonly note?: string;
    readonly openedDay: number;
    readonly openedDate: GameDate;
    /** Standing taskings keep producing; a one-off answers once and closes. */
    readonly standing: boolean;
    /** The person this tasking is about, with the case that named them. Present only on person-level taskings. */
    readonly subject?: IntelSubject;
    readonly closedDay?: number;
    /** Set when the engine closed the tasking because its case no longer held. */
    readonly closedReason?: string;
};
/**
 * A request that had no lawful executor, and what came back instead.
 *
 * Kept forever. The whole point of the mechanism is that asking is on the
 * record: a refusal that could be retried until it stopped being logged would
 * be a difficulty setting wearing a statute's clothes.
 */
export type BoundaryRefusal = {
    readonly id: string;
    readonly element: IcElementId;
    readonly request: string;
    readonly day: number;
    readonly date: GameDate;
    readonly reason: string;
    /** Whether this one went outside the executive branch on its own. */
    readonly reportable: boolean;
    readonly subject?: IntelSubject;
};
export type PressureDirection = "harden" | "soften";
/** An attempt to move a judgment, and what it actually moved. */
export type PoliticizationRecord = {
    readonly id: string;
    readonly element: IcElementId;
    readonly assessmentId?: string;
    readonly day: number;
    readonly date: GameDate;
    readonly ask: string;
    readonly direction: PressureDirection;
    /** True where the workforce would not write it, which is the expensive outcome and the common one. */
    readonly refused: boolean;
};
export type ReferralStage = "credibility" | "transmitted" | "closed";
/**
 * A complaint of urgent concern, on its statutory clock.
 *
 * Fourteen days to a credibility determination, seven more to the committees.
 * Modeled in days rather than turns because that is what makes it faster than
 * the president's own week: a referral opened on a Tuesday reaches the Hill
 * before the third turn after it, whatever the administration does.
 */
export type IgReferral = {
    readonly id: string;
    readonly subject: string;
    readonly element: IcElementId;
    readonly openedDay: number;
    readonly openedDate: GameDate;
    readonly stage: ReferralStage;
    readonly determinedDay?: number;
    readonly transmittedDay?: number;
    readonly credible: boolean;
};
/**
 * What a standing tasking has actually produced.
 *
 * The successful branch of `taskCollection` used to write one row and stop: a
 * president could point the NSA at a foreign government, write the question in
 * their own words, and receive an entry on a list that never answered. The only
 * way to make the community *do* something was to ask it for something
 * unlawful, because the refusal branch was the only one that produced anything.
 *
 * A product is what closes that. It is dated, it names what came back, and the
 * analysis side reads it: a judgment about a country somebody has been
 * collecting against is one the community trusts more.
 */
export type CollectionProduct = {
    readonly id: string;
    readonly tasking: TaskingId;
    readonly element: IcElementId;
    readonly discipline: Discipline;
    /** The same free-form target the tasking carries — a nation id where it is one. */
    readonly target: string;
    readonly targetKind?: "foreign-nation" | "domestic-state" | "foreign-person";
    /** Copied from the tasking, so a shared snapshot keeps the case it was collected under. */
    readonly subject?: IntelSubject;
    readonly question: string;
    readonly focus?: CollectionFocus;
    readonly note?: string;
    readonly day: number;
    readonly date: GameDate;
    /** What the collection is worth to a judgment reading it, 0..1. */
    readonly weight: number;
    readonly summary: string;
    readonly status?: "findings" | "no-result";
    readonly confidence?: "low" | "moderate" | "high";
    readonly findings?: readonly CollectionFinding[];
    readonly gaps?: readonly string[];
    readonly exposed?: boolean;
};
export type CollectionFinding = {
    readonly topic: "military-readiness" | "external-intent" | "domestic-security" | "financial-pressure" | "stability";
    readonly observation: string;
    readonly source: string;
    readonly asOfDay: number;
    /** A typed source snapshot used when a recipient must act on this report. */
    readonly basis?: {
        readonly kind: "pursuit";
        readonly id: string;
        readonly target: NationId;
        readonly overt: boolean;
        readonly lastActedTurn: number;
    } | {
        readonly kind: "border-incident";
        readonly id: string;
        readonly parties: readonly [NationId, NationId];
        readonly assessmentTurn: number;
        readonly finding: "likely-inadvertent" | "undetermined";
        readonly confidence: "low" | "moderate";
    } | {
        readonly kind: "state-condition";
        readonly id: string;
        readonly state: StateId;
        readonly condition: string;
        readonly severity: number;
    } | {
        readonly kind: "governor-request";
        readonly state: StateId;
        readonly signature: string;
        readonly expiresTurn: number;
        readonly condition?: string;
    };
};
export type CollectionShare = {
    readonly id: string;
    readonly reportId: string;
    readonly recipient: NationId;
    readonly day: number;
    readonly date: GameDate;
    readonly report: CollectionProduct;
    /** Original finding indexes in the issued report; absent on legacy whole-report receipts. */
    readonly disclosedFindingIndexes?: readonly number[];
};
export type IntelligenceState = {
    readonly taskings: Readonly<Record<TaskingId, CollectionTasking>>;
    /**
     * The current product of each standing tasking, keyed by the tasking.
     *
     * One per requirement rather than an append-only stream: a standing
     * requirement's product is the community's current answer to the question,
     * and a save that kept every month of every tasking for two terms would grow
     * without anything ever reading the old ones.
     */
    readonly products: Readonly<Record<TaskingId, CollectionProduct>>;
    readonly archive?: readonly CollectionProduct[];
    readonly shares?: readonly CollectionShare[];
    readonly refusals: readonly BoundaryRefusal[];
    readonly pressure: readonly PoliticizationRecord[];
    readonly referrals: readonly IgReferral[];
    readonly surveillanceIncident?: SurveillanceIncident;
    readonly agReferrals?: readonly AgReferral[];
};
export declare function foundingIntelligence(): IntelligenceState;
/**
 * How good this element's product is right now, 0..1.
 *
 * Read off the institution rather than kept beside it, so a hollowed-out agency
 * writes worse intelligence by the same fact that makes it deliver policy
 * worse, and there is exactly one place to look when it does.
 */
export declare function elementCapability(campaign: Campaign, id: IcElementId): number;
/** How far this element has been bent toward the administration's politics, 0..1. */
export declare function elementPoliticization(campaign: Campaign, id: IcElementId): number;
/** The community's aggregate standing, weighted by how much a judgment leans on each element. */
export declare function selectCommunityHealth(campaign: Campaign): number;
export declare function selectRefusals(campaign: Campaign): readonly BoundaryRefusal[];
export declare function selectOpenReferrals(campaign: Campaign): readonly IgReferral[];
export declare function selectAgReferrals(campaign: Campaign): readonly AgReferral[];
export declare function selectStandingTaskings(campaign: Campaign): readonly CollectionTasking[];
/** What standing collection has filed, most recent first. */
export declare function selectCollectionProducts(campaign: Campaign): readonly CollectionProduct[];
export declare function selectCollectionShares(campaign: Campaign): readonly CollectionShare[];
/** A selected recipient's current, sourced warning about a covert pursuit aimed at it. */
export declare function sharedCovertThreat(campaign: Campaign, recipient: NationId, subject: NationId): CollectionShare | undefined;
/** A dated disclosed warning aimed at this government, usable in its diplomatic assessment. */
export declare function sharedPressureWarning(campaign: Campaign, recipient: NationId): CollectionShare | undefined;
/** The current product of one standing tasking, if it has filed at all yet. */
export declare function productFor(campaign: Campaign, tasking: TaskingId): CollectionProduct | undefined;
/**
 * What is currently being collected against this country, by these elements.
 *
 * The one thing the analysis side reads out of the collection side. It matches
 * on the tasking's own target string, which is a nation id when the request was
 * pointed at a government, so a tasking written about a person or a theme
 * correctly firms up no country judgment.
 */
export declare function collectionAgainst(campaign: Campaign, target: string, elements: readonly IcElementId[]): readonly CollectionProduct[];
export declare const REFUSAL_OVERSIGHT_RISE = 0.08;
export type TaskingRequest = {
    readonly element: IcElementId;
    readonly discipline: Discipline;
    readonly targetKind: TaskingTargetKind;
    readonly target: string;
    readonly question: string;
    readonly focus?: CollectionFocus;
    readonly note?: string;
    /** Required for the two person kinds, and ignored for every other. */
    readonly subject?: IntelSubject;
};
/**
 * Why nobody can carry this out, or nothing.
 *
 * Ordered so the answer a player gets is the most fundamental one: a request
 * aimed at American politics is refused before anyone asks whether the agency
 * does that discipline, because the second question would imply there is an
 * agency that does.
 */
export declare function boundaryRefusalReason(def: IcElementDef, request: TaskingRequest): string | undefined;
export type IntelligenceResult = {
    readonly ok: true;
    readonly packet: EffectPacket;
} | {
    readonly ok: false;
    readonly reason: string;
};
/**
 * Point an element at a question.
 *
 * A request outside the element's boundary is not rejected by this function —
 * it succeeds, and what succeeds is the refusal: a memorandum, a raised
 * oversight pressure, and, for the requests that are flatly unlawful or the
 * second one at the same agency, a matter somebody outside the executive
 * branch now knows about. Refusing here instead would let a player try
 * everything for free until something worked.
 */
export declare function taskCollection(campaign: Campaign, request: TaskingRequest): IntelligenceResult;
export declare function collectionShareRefusal(campaign: Campaign, reportId: string, recipient: NationId): string | undefined;
export declare function shareCollectionReport(campaign: Campaign, reportId: string, recipients: readonly NationId[], findingIndexes?: readonly number[]): IntelligenceResult;
/** Take an element off a question. */
export declare function closeTasking(campaign: Campaign, id: TaskingId): IntelligenceResult;
export declare const REFERRAL_CREDIBILITY_DAYS = 14;
export declare const REFERRAL_TRANSMIT_DAYS = 7;
/**
 * How often a standing requirement files.
 *
 * A month, not a week. Collection against a hard question is a cycle rather
 * than a feed, and a product every seven days would make the community's list
 * a scroll of identical rows nobody reads.
 */
export declare const PRODUCT_CYCLE_DAYS = 28;
/**
 * The community's week: referrals move along their own clock, standing
 * requirements file, and a government that moved on the United States gets a
 * judgment written about it whether or not anybody asked for one.
 *
 * Referrals move whatever the administration does, which is the design point.
 * There is no lever here that slows one down, because the statute deliberately
 * routes it around the White House.
 */
export declare const intelligencePhase: TurnPhase;
