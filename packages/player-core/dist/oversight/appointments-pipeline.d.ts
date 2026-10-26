import { type Campaign, type EffectPacket, type InstitutionId, type MetricCost, type OfficeId, type PipelineReading, type RemovalConstraint } from "@admin/engine";
export type VacancyRow = {
    readonly institution: InstitutionId;
    readonly office: OfficeId;
    readonly title: string;
    readonly body: string;
    readonly days: number;
    readonly acting?: string;
};
export type VacancyBoard = {
    /** Empty chairs with no name before the Senate, longest empty first. */
    readonly open: readonly VacancyRow[];
    readonly pipeline: PipelineReading;
};
/** Every empty chair nobody has been sent up for yet, and the pipeline as a whole. */
export declare function vacancyBoard(campaign: Campaign): VacancyBoard;
export type RemovableOfficer = {
    readonly institution: InstitutionId;
    readonly title: string;
    readonly body: string;
    readonly holder: string;
    readonly holderId: string;
    readonly removal: RemovalConstraint;
    /** For a seat the statute still protects: what removing its holder risks in court. */
    readonly contested?: string;
};
/** The risk a removal from a protected commission seat carries, in plain words. */
export declare const CONTESTED_REMOVAL_WORDS: string;
/** Every officer below the cabinet the President could remove today, by body. A fixed term cannot be ended and is left off. */
export declare function removableOfficers(campaign: Campaign): readonly RemovableOfficer[];
/** The causes a for-cause office can be emptied for, each of which bends the body by its own amount. */
export declare const REMOVAL_CAUSES: readonly string[];
export type RemovalTerms = {
    readonly cause?: string;
    readonly cost: MetricCost;
    /** The body's politicization, 0..1, before and after: only a for-cause removal moves it. */
    readonly politicization: {
        readonly before: number;
        readonly after: number;
    };
};
/** What removing this officer for this cause does, off the packet `removeOfficer` commits. */
export declare function removalTerms(campaign: Campaign, institution: InstitutionId, cause?: string): RemovalTerms | {
    readonly refusal: string;
};
/** The removal itself, built on the campaign it is committed against. */
export declare function removalPacket(campaign: Campaign, institution: InstitutionId, cause?: string): EffectPacket;
export type RemovalSuitStatus = "deciding" | "declined" | "in-court" | "reinstated" | "back-pay" | "removal-stands";
export type RemovalSuitRow = {
    readonly institution: InstitutionId;
    readonly body: string;
    readonly title: string;
    readonly member: string;
    readonly status: RemovalSuitStatus;
    readonly reading: string;
    /** The court case, once one is filed. */
    readonly caseId?: string;
};
/** Every removal from a protected seat, and where the removed member's challenge stands. */
export declare function removalSuits(campaign: Campaign): readonly RemovalSuitRow[];
