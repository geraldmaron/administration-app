import { type AssessmentQuestion, type Campaign, type Confidence, type EffectPacket, type Likelihood, type PressureDirection } from "@admin/engine";
import type { NationId } from "@admin/world";
import { type ChoiceTable } from "../policy/choice-table.js";
export declare const QUESTION_WORDS: Readonly<Record<AssessmentQuestion, {
    readonly label: string;
    readonly asks: string;
}>>;
export type SecurityAssessmentRow = {
    readonly id: string;
    readonly question: AssessmentQuestion;
    readonly questionLabel: string;
    readonly target: NationId;
    readonly targetName: string;
    readonly href: string;
    readonly issued: string;
    readonly judgment: string;
    readonly likelihood: Likelihood;
    /** Where the sentence sits on the five-rung ladder, 0 (remote) to 1 (almost certain). */
    readonly rung: number;
    readonly confidence: Confidence;
    readonly confidenceBasis: string;
    readonly sources: readonly string[];
    readonly gaps: readonly string[];
    readonly alternative: string;
    readonly dissents: readonly string[];
    /** Each time somebody leaned on the wording, from what to what. Never removed. */
    readonly changes: readonly string[];
};
/** Every judgment on file, newest first. */
export declare function assessmentRows(campaign: Campaign): readonly SecurityAssessmentRow[];
/** The governments a judgment can be asked about: every one but the homeland. */
export declare function assessmentTargets(campaign: Campaign): readonly {
    readonly id: NationId;
    readonly name: string;
}[];
/** The three questions the community can be asked about a government, each read as what asking adds. What it will say is not read ahead; how sure it will be, and why, is. */
export declare function commissionChoices(campaign: Campaign, target: NationId): ChoiceTable | undefined;
export declare function commissionOrder(campaign: Campaign, question: AssessmentQuestion, target: NationId): EffectPacket;
export declare const PRESS_WORDS: Readonly<Record<PressureDirection, string>>;
/** Leaning on a judgment's wording, in each direction, read as its change from the wording today. */
export declare function pressChoices(campaign: Campaign, id: string, ask: string): ChoiceTable | undefined;
export declare function pressOrder(campaign: Campaign, id: string, direction: PressureDirection, ask: string): EffectPacket;
