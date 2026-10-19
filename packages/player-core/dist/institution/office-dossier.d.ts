import { type Campaign, type InstitutionDef, type OfficeDef } from "@admin/engine";
import { type OrganogramSection } from "../government/organogram.js";
import { type OversightReading } from "../oversight/oversight-reading.js";
import { type LoadNode } from "./office-load.js";
import { type StaffingChip } from "./office-chips.js";
export type OfficeStaffing = "confirmed" | "acting" | "vacant";
export type OfficeNetworkDoor = {
    readonly key: string;
    readonly label: string;
    readonly href: string;
    readonly role: "confirmed" | "acting";
};
export type OfficeDossierView = {
    readonly staffing: OfficeStaffing;
    readonly load: LoadNode;
    readonly vacantDays: number;
    readonly staffingChips: readonly StaffingChip[];
    readonly network: readonly OfficeNetworkDoor[];
    readonly organogram: readonly OrganogramSection[];
    readonly oversight?: OversightReading;
};
/** Vacant, acting, or confirmed from the institution runtime for the chair office. */
export declare function officeStaffing(campaign: Campaign, institution: InstitutionDef, office: OfficeDef): OfficeStaffing;
/** Person doors for whoever holds or signs for the chair today. */
export declare function officeNetworkDoors(campaign: Campaign, institution: InstitutionDef, office: OfficeDef): readonly OfficeNetworkDoor[];
