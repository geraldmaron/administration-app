import type { NationId, PersonId } from "@admin/world";
import { type Campaign } from "./state.js";
import type { EffectPacket } from "./effects.js";
import type { IcElementDef } from "./ic-elements.js";
import type { CollectionTasking, IntelligenceResult, TaskingRequest } from "./intelligence.js";
/** How long a lead can be acted on after the desk read it; older than this is a stale snapshot. */
export declare const SUBJECT_FRESH_DAYS = 28;
export type SubjectBasis = {
    readonly kind: "pursuit";
    readonly caseId: string;
    readonly actor: NationId;
    readonly openedTurn: number;
} | {
    readonly kind: "inspector-general-matter";
    readonly caseId: string;
    readonly institution: string;
    readonly causeId: string;
};
/** The person a request is about, and the case that names them as of a day. */
export type IntelSubject = {
    readonly personId: PersonId;
    readonly snapshotDay: number;
    readonly basis: SubjectBasis;
};
export type SubjectJurisdiction = "foreign" | "domestic";
export type SubjectLead = {
    readonly subject: IntelSubject;
    readonly name: string;
    readonly jurisdiction: SubjectJurisdiction;
    /** Plain words for what the case is, for the desk to print. */
    readonly headline: string;
};
/**
 * Every legal pathway this desk models, each tied to a source the repository
 * has fetched. A predicate with no entry here is refused, not approximated.
 */
export declare const INTEL_AUTHORITY: {
    readonly "cia-human-sources-abroad": {
        readonly source: "intelligence";
        readonly cite: "50 U.S.C. §3036(d)(1), (3)";
        readonly quote: "outside the United States through human sources";
    };
    readonly "president-take-care": {
        readonly source: "constitution";
        readonly cite: "U.S. Const. art. II, §3";
        readonly quote: "take Care that the Laws be faithfully executed";
    };
};
export type AuthorityKey = keyof typeof INTEL_AUTHORITY;
/** A presidential referral of a domestic matter. It names the matter; the Attorney General decides what to do with it. */
export type AgReferral = {
    readonly id: string;
    readonly subject: IntelSubject;
    readonly day: number;
    readonly authority: AuthorityKey;
};
/** The people the engine currently has a case for, in a stable order. */
export declare function selectSubjectLeads(campaign: Campaign): readonly SubjectLead[];
export type SubjectResolution = {
    readonly ok: true;
    readonly lead: SubjectLead;
} | {
    readonly ok: false;
    readonly reason: string;
};
/**
 * Whether this subject is still what the engine says it is. `fresh` is the
 * opening test; an already-open tasking is held only to the case staying open.
 */
export declare function resolveSubject(campaign: Campaign, subject: IntelSubject, fresh: boolean): SubjectResolution;
/** Rejections that mean the request is malformed or stale, as opposed to unauthorized. */
export declare function personRequestProblem(campaign: Campaign, request: TaskingRequest): string | undefined;
/** The sourced pathway for a foreign person, or the plain reason there is none. */
export declare function foreignPersonRefusal(def: IcElementDef, request: TaskingRequest): string | undefined;
/** Why a person in the United States cannot be tasked from here, in the words of the element asked. */
export declare function domesticPersonRefusal(def: IcElementDef): string;
/** Hand a domestic matter to the Attorney General. Nothing is directed and no investigation is opened by this record. */
export declare function referToAttorneyGeneral(campaign: Campaign, subject: IntelSubject): IntelligenceResult;
/** Why an open tasking can no longer stand, or nothing if it still can. */
export declare function subjectTaskingProblem(campaign: Campaign, tasking: CollectionTasking): string | undefined;
/** Closes, with the reason recorded, every open person-level tasking whose case no longer holds. Idempotent. */
export declare function withSubjectTaskingsRevalidated(campaign: Campaign): Campaign;
/** The weekly form of the same check, so a case closing mid-campaign ends its tasking before it files again. */
export declare function subjectRevalidationPackets(campaign: Campaign): readonly EffectPacket[];
