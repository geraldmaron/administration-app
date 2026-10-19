import { type Campaign, type EffectPacket, type FindingId, type InstitutionId, type MatterStage } from "@admin/engine";
export declare const MATTER_STAGE_ORDER: readonly MatterStage[];
export declare const MATTER_STAGE_WORDS: Readonly<Record<MatterStage, string>>;
export type InquiryRow = {
    readonly id: string;
    readonly source: string;
    readonly subject: string;
    readonly stage: MatterStage;
    readonly stageWord: string;
    /** Oversight of your administration, or a review you directed. */
    readonly received: boolean;
    readonly public: boolean;
    readonly obstructed: boolean;
    readonly opened: string;
    /** When it next moves on its own; absent once closed. */
    readonly nextMove?: string;
    /** The body audited, where an inspector general opened it. */
    readonly institution?: InstitutionId;
    readonly latest: string;
};
export type InquiryPipeline = {
    /** Open matters by stage, in the order a matter moves through them. */
    readonly stages: readonly {
        readonly stage: MatterStage;
        readonly label: string;
        readonly matters: readonly InquiryRow[];
    }[];
    readonly closed: readonly InquiryRow[];
    /** How much the standing oversight of this administration weighs on the Hill, 0..1, the term Congress's mood reads. */
    readonly pressure: number;
};
/** Every inquiry, open ones by stage and the closed ones newest first. */
export declare function inquiryPipeline(campaign: Campaign): InquiryPipeline;
export type InquiryPin = {
    readonly id: string;
    readonly institution: InstitutionId;
    readonly label: string;
    readonly where: string;
    readonly lon: number;
    readonly lat: number;
    /** Ranks pins when more are in view than the map shows: later stages first. */
    readonly weight: number;
};
/** One pin per agency an open inquiry is auditing, at its sourced headquarters. */
export declare function inquiryPins(campaign: Campaign): readonly InquiryPin[];
/** Where the inspector general stands, in the words the board prints. */
export type InspectorPosture = "in-post" | "notice-filed" | "removed";
export type InspectorRow = {
    readonly institution: InstitutionId;
    readonly name: string;
    readonly posture: InspectorPosture;
    readonly openMatters: number;
    readonly seated: string;
    /** The day the office empties, once notice is filed. */
    readonly leaves?: string;
    readonly reasons: readonly string[];
};
/** Every inspector general the government has, those with audits running first. */
export declare function inspectorsBoard(campaign: Campaign): readonly InspectorRow[];
/** What filing notice against one inspector general does, read off the packet the filing commits. */
export type InspectorNoticeTerms = {
    readonly institution: InstitutionId;
    readonly name: string;
    readonly leaves: string;
    /** Congress's mood toward you, 0..1, now and after the filing. */
    readonly dispositionBefore: number;
    readonly dispositionAfter: number;
    /** Audits this filing would make public and mark obstructed. They keep running. */
    readonly obstructs: readonly string[];
};
/** The stated reason does not change the price, so it is read with one supplied; the control asks for the real one. */
export declare function inspectorNoticeTerms(campaign: Campaign, institution: InstitutionId): InspectorNoticeTerms | {
    readonly refusal: string;
};
/** The filing itself, with the President's own reasons, built on the campaign it is committed against. */
export declare function inspectorNoticePacket(campaign: Campaign, institution: InstitutionId, reason: string): EffectPacket;
export type NoticeOwed = {
    readonly id: FindingId;
    readonly target: string;
    readonly objective: string;
    readonly signed: string;
    readonly daysLate: number;
    readonly reasonsWithheld?: string;
};
/** Covert findings whose notice to the intelligence committees was withheld and is still owed. */
export declare function noticesOwed(campaign: Campaign): readonly NoticeOwed[];
/** Telling the committees, with the statement of reasons the law requires, built on the campaign it is committed against. */
export declare function committeeNoticePacket(campaign: Campaign, id: FindingId, statement: string): EffectPacket;
