import type { NationId } from "@admin/world";
import { type Campaign, type GameDate, type IssuedInstrumentAct } from "./state.js";
import type { ResolutionRequest } from "./resolution.js";
export type SupportChoice = {
    readonly mode: "unilateral" | "seek";
    readonly partners: readonly NationId[];
};
export type SupportResponse = {
    readonly nation: NationId;
    readonly name: string;
    readonly status: "pending" | "confirmed" | "refused" | "conditional";
    readonly days: number;
    readonly reason: string;
};
export type IssuedSupportRequest = SupportResponse & {
    readonly dueDate: GameDate;
};
export type SupportProjection = {
    readonly mode: SupportChoice["mode"];
    readonly responses: readonly SupportResponse[];
    readonly delayDays: number;
};
export declare function supportProjection(campaign: Campaign, request: ResolutionRequest): SupportProjection | undefined;
export declare function issueSupportRequests(campaign: Campaign, request: ResolutionRequest): readonly IssuedSupportRequest[];
export declare function answerSupportRequests(campaign: Campaign, act: IssuedInstrumentAct): readonly IssuedSupportRequest[];
export declare function actionTermsProblem(campaign: Campaign, request: ResolutionRequest): string | undefined;
