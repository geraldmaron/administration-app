import { type NationId, type TraitKey } from "@admin/world";
import type { Campaign, GameDate } from "./state.js";
import type { EffectPacket } from "./effects.js";
import type { Reading } from "./reading.js";
import { type IcElementId } from "./ic-elements.js";
import { type PressureDirection } from "./intelligence.js";
export type AssessmentId = string;
/**
 * Likelihood and confidence are different questions and the product keeps them
 * apart. Likelihood is about the world. Confidence is about the evidence.
 */
export type Likelihood = "remote" | "unlikely" | "roughly even" | "likely" | "almost certain";
export type Confidence = "low" | "moderate" | "high";
export declare const LIKELIHOOD_LADDER: readonly Likelihood[];
/** The questions the community is actually equipped to answer about a country. */
export type AssessmentQuestion = "intent" | "capability" | "stability";
export declare const ASSESSMENT_QUESTIONS: readonly AssessmentQuestion[];
export type SourceCharacterization = {
    readonly element: IcElementId;
    /** Reliability of what this element brought, not of the element. */
    readonly reliability: "strong" | "moderate" | "limited";
    readonly note: string;
};
export type AssessmentDissent = {
    readonly element: IcElementId;
    readonly confidence: Confidence;
    readonly note: string;
};
/** The record that a judgment's language was changed after it was written. */
export type WordingChange = {
    readonly day: number;
    readonly date: GameDate;
    readonly direction: PressureDirection;
    readonly from: Likelihood;
    readonly to: Likelihood;
    readonly note: string;
};
export type Assessment = {
    readonly id: AssessmentId;
    readonly question: AssessmentQuestion;
    readonly target: NationId;
    readonly issuedDay: number;
    readonly issuedDate: GameDate;
    readonly judgment: string;
    readonly likelihood: Likelihood;
    readonly confidence: Confidence;
    /** Why the confidence is what it is. A confidence with no basis is a number wearing a word. */
    readonly confidenceBasis: string;
    readonly sources: readonly SourceCharacterization[];
    /** What is not known, named. Low confidence with no gaps listed would be a contradiction. */
    readonly gaps: readonly string[];
    readonly alternative: string;
    readonly dissents: readonly AssessmentDissent[];
    /** Present once somebody leaned on it. Never removed. */
    readonly changes: readonly WordingChange[];
};
/**
 * Map a 0..1 reading onto the likelihood ladder. Ordinary forecasts and
 * intelligence assessments share this so a "likely" Hill play and a "likely"
 * intent judgment mean the same band.
 */
export declare function likelihoodFromUnitInterval(reading: number): Likelihood;
/**
 * Map a 0..1 evidence-quality reading onto confidence. Independent of
 * likelihood: a highly likely outcome can rest on thin evidence.
 */
export declare function confidenceFromEvidence(evidence: number): Confidence;
/** The whole product, derived. Nothing here is stored until the packet applies. */
export declare function draftAssessment(campaign: Campaign, question: AssessmentQuestion, target: NationId): Assessment | undefined;
export type BehaviorReading = {
    readonly key: TraitKey;
    readonly likelihood: Likelihood;
    readonly reading: Reading;
};
export type BehaviorAssessment = {
    readonly target: NationId;
    readonly confidence: Confidence;
    readonly confidenceBasis: string;
    readonly gaps: readonly string[];
    readonly traits: readonly BehaviorReading[];
};
/**
 * How a government decides, as an assessment rather than as its coefficients.
 *
 * The player's own government is not an intelligence target: an administration
 * knows its own disposition directly, at full confidence and with nothing
 * missing, which is why self-knowledge needs no gate and a foreign reading
 * does. Nothing here is stored — like every other product in this module it is
 * derived from the world the player is already living in.
 */
export declare function assessBehavior(campaign: Campaign, target: NationId): BehaviorAssessment | undefined;
export declare function selectAssessments(campaign: Campaign): readonly Assessment[];
export declare function selectAssessment(campaign: Campaign, id: AssessmentId): Assessment | undefined;
/** Every assessment whose language was moved after it was written. */
export declare function selectAlteredAssessments(campaign: Campaign): readonly Assessment[];
export type AssessmentResult = {
    readonly ok: true;
    readonly packet: EffectPacket;
} | {
    readonly ok: false;
    readonly reason: string;
};
/** Ask the community what it thinks. */
export declare function commissionAssessment(campaign: Campaign, question: AssessmentQuestion, target: NationId): AssessmentResult;
/**
 * Lean on a judgment.
 *
 * Everything this does is to the paper. The likelihood word moves one rung, the
 * confidence never rises with it, the dissent gets a line it did not have, and
 * the assessment carries the change forever. Meanwhile the drafting agency
 * loses morale and integrity and gains politicization, which lowers the
 * confidence of everything it writes afterward — so the second time a president
 * does this, the product they are pressing is already worse because of the
 * first time.
 *
 * A president who wants the assessment to say something else has, in the end,
 * only one honest option: change the world it is reading.
 */
export declare function pressAssessment(campaign: Campaign, id: AssessmentId, direction: PressureDirection, ask: string): AssessmentResult;
