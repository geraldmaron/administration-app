import { type Campaign, type InstitutionDef, type InstitutionId } from "@admin/engine";
import type { Stance } from "../reading.js";
export type InspectionRow = {
    readonly key: string;
    readonly label: string;
    readonly value: string;
    readonly stance?: Stance;
};
export type OversightReading = {
    readonly auditedBy: InstitutionId;
    readonly caption: string;
    readonly rows: readonly InspectionRow[];
    readonly detail: string;
    readonly direct: boolean;
};
/**
 * The audit posture this office actually has in the campaign: its own board
 * where the engine tracks one, otherwise the charter fact of which parent's
 * inspector general watches it.
 */
export declare function oversightReading(campaign: Campaign, institution: InstitutionDef): OversightReading | undefined;
export type OfficeOversightGlance = {
    readonly figure: string;
    readonly detail: string;
    readonly stance: Stance;
    readonly value: number;
};
