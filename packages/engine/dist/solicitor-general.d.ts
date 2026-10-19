import type { SolicitorGeneralEvent, SolicitorGeneralRecord } from "./state-judiciary.js";
export declare const SOLICITOR_GENERAL_BASELINE = 50;
export declare function solicitorGeneralStanding(record?: SolicitorGeneralRecord): number;
export declare function solicitorGeneralAssessment(standing: number): "strained" | "mixed" | "strong";
/** At most seven percentage points either way; this is a game parameter, not an observed court rate. */
export declare function standingAdjustment(record?: SolicitorGeneralRecord): number;
export declare function recordSolicitorGeneral(record: SolicitorGeneralRecord | undefined, event: SolicitorGeneralEvent): SolicitorGeneralRecord;
