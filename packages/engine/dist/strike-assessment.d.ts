import type { NationId } from "@admin/world";
import type { ImpactExposure, ImpactSpec } from "./impact-event.js";
import type { ResolutionRequest } from "./resolution.js";
import type { Campaign, GameDate } from "./state.js";
export type StrikeObjective = "military-capacity" | "logistics" | "infrastructure";
export type StrikeAssessmentReading = {
    readonly objective: StrikeObjective;
    readonly label: string;
    readonly targetContext: string;
    readonly confidence: "low" | "moderate";
    readonly basis: string;
    readonly gaps: readonly string[];
    readonly serviceRisk: string;
    readonly targetEffect: string;
};
export type CivilianSiteAssessment = StrikeAssessmentReading & {
    readonly id: string;
    readonly actor: NationId;
    readonly target: NationId;
    readonly issuedDate: GameDate;
    readonly source: "modeled-intelligence";
    readonly site: NonNullable<ImpactSpec["site"]>;
    readonly exposure: ImpactExposure;
};
export declare const STRIKE_OBJECTIVES: Readonly<Record<StrikeObjective, {
    readonly label: string;
    readonly targetEffect: string;
    readonly contexts: readonly string[];
}>>;
export declare function strikeMissionContext(campaign: Campaign, request: ResolutionRequest): string;
/** A modeled intelligence case for the operation, independent of urbanization and casualty rolls. */
export declare function assessStrikeSite(campaign: Campaign, request: ResolutionRequest): CivilianSiteAssessment | undefined;
export declare function withStrikeAssessment(campaign: Campaign, request: ResolutionRequest): ResolutionRequest;
export declare function strikeAssessmentReading(campaign: Campaign, request: ResolutionRequest): StrikeAssessmentReading | undefined;
