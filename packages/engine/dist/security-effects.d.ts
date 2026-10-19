import type { Campaign } from "./state.js";
import type { CommandOfficer, CommandPosture, CombatantCommandId, UcpAmendment } from "./combatant-commands.js";
import type { MilitaryBranch } from "@admin/world";
import type { AgReferral } from "./intel-authority.js";
import type { BoundaryRefusal, CollectionProduct, CollectionShare, CollectionTasking, IgReferral, PoliticizationRecord, SurveillanceIncident, ReferralStage, TaskingId } from "./intelligence.js";
import type { Assessment, AssessmentId, WordingChange } from "./assessments.js";
import type { CovertFinding, FindingId, UnfoundedAction } from "./findings.js";
import type { ReportObligation, ReportObligationId } from "./war-powers-report.js";
import type { ReportFiling } from "./war-powers-report.js";
export type CommandEffect = {
    readonly kind: "command";
    readonly relieve?: {
        readonly id: CombatantCommandId;
        readonly deputy: CommandOfficer;
        readonly day: number;
        readonly rationale: string;
        readonly outgoing: string;
    };
    readonly reassign?: {
        readonly from: CombatantCommandId;
        readonly to: CombatantCommandId;
        readonly branch: MilitaryBranch;
        readonly share: number;
    };
    readonly amend?: UcpAmendment;
    readonly posture?: {
        readonly id: CombatantCommandId;
        readonly posture: CommandPosture;
    };
    readonly confirmActing?: {
        readonly ids: readonly CombatantCommandId[];
        readonly day: number;
    };
};
export type IntelligenceEffect = {
    readonly kind: "intelligence";
    readonly tasking?: CollectionTasking;
    /** A standing requirement filing its cycle's product. */
    readonly product?: CollectionProduct;
    readonly share?: CollectionShare;
    readonly closeTasking?: {
        readonly id: TaskingId;
        readonly day: number;
        readonly reason?: string;
    };
    readonly agReferral?: AgReferral;
    readonly refusal?: BoundaryRefusal;
    readonly referral?: IgReferral;
    readonly pressure?: PoliticizationRecord;
    readonly advanceReferrals?: readonly {
        readonly id: string;
        readonly stage: ReferralStage;
        readonly day: number;
    }[];
    readonly surveillanceIncident?: SurveillanceIncident;
};
export type AssessmentEffect = {
    readonly kind: "assessment";
    readonly issue?: Assessment;
    readonly siteIssue?: import("./strike-assessment.js").CivilianSiteAssessment;
    readonly change?: {
        readonly id: AssessmentId;
        readonly change: WordingChange;
    };
};
export type FindingEffect = {
    readonly kind: "finding";
    readonly sign?: CovertFinding;
    readonly notify?: {
        readonly id: FindingId;
        readonly day: number;
        readonly statement: string;
    };
    readonly close?: {
        readonly id: FindingId;
        readonly day: number;
    };
    readonly activity?: {
        readonly id: FindingId;
    };
    readonly unfounded?: UnfoundedAction;
    /** An objective counsel would not paper. Recorded in the same list, because the attempt is the fact. */
    readonly refusedObjective?: UnfoundedAction;
};
export type WarPowersEffect = {
    readonly kind: "warPowers";
    readonly open?: ReportObligation;
    readonly file?: {
        readonly id: ReportObligationId;
        readonly filing: ReportFiling;
    };
    readonly certify?: {
        readonly id: ReportObligationId;
        readonly day: number;
        readonly necessity: string;
    };
    readonly miss?: {
        readonly ids: readonly ReportObligationId[];
    };
    /** The force came out. What discharges the sixty-day obligation short of a vote. */
    readonly terminate?: {
        readonly id: ReportObligationId;
        readonly day: number;
    };
};
export declare function applyCommand(state: Campaign, effect: CommandEffect): Campaign;
export declare function applyIntelligence(state: Campaign, effect: IntelligenceEffect): Campaign;
export declare function applyAssessment(state: Campaign, effect: AssessmentEffect): Campaign;
export declare function applyFinding(state: Campaign, effect: FindingEffect): Campaign;
export declare function applyWarPowers(state: Campaign, effect: WarPowersEffect): Campaign;
