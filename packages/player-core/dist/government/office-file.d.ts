import { type CabinetFaction, type Campaign, type InstitutionDef, type MinisterProposal, type OfficeDef, type ResignationOffer } from "@admin/engine";
import { type PersonId, type RoleId } from "@admin/world";
import { type StaffingChip } from "../institution/office-chips.js";
import { type RecordRow } from "../record/record-entry.js";
import { type ExecutiveAlert, type ExecutiveNode, type Staffing } from "./executive-tree.js";
/** Where the office stands, or why the dataset places it nowhere. */
export type OfficeSite = {
    readonly kind: "sourced";
    readonly name: string;
    readonly state: string;
} | {
    readonly kind: "none";
    readonly reason: string;
};
/** The body's working condition, each 0..1 except the backlog, which is a count of work owed. */
export type OfficeCondition = {
    readonly capacity: number;
    readonly staffing: number;
    readonly morale: number;
    readonly implementationQuality: number;
    readonly backlog: number;
    readonly vacantDays: number;
    readonly directives: number;
};
/**
 * What the President can do about the chair itself:
 * - cabinet: appoint (Senate), name an acting, dismiss, all through the cabinet seat;
 * - acting: name an acting officer only (a body below the cabinet; nominations live with oversight);
 * - none: the chair is elected, staff, or a seat the law gives no acting.
 */
export type ChairLever = "cabinet" | "acting" | "none";
export type OfficeCommand = {
    readonly id: string;
    readonly name: string;
    readonly abbr: string;
    readonly posture: string;
    readonly headquarters: string;
};
export type OfficeFile = {
    readonly institution: InstitutionDef;
    readonly office: OfficeDef;
    readonly name: string;
    readonly emblem: string;
    /** The map's framing key for the headquarters. */
    readonly camera: string;
    readonly site: OfficeSite;
    readonly staffing: Staffing;
    readonly holder?: PersonId;
    readonly holderName?: string;
    /** The cabinet or White House role the chair is, where it is one. */
    readonly role?: RoleId;
    readonly lever: ChairLever;
    readonly chips: readonly StaffingChip[];
    readonly condition?: OfficeCondition;
    readonly alerts: readonly ExecutiveAlert[];
    readonly proposals: readonly MinisterProposal[];
    readonly offers: readonly ResignationOffer[];
    readonly factions: readonly CabinetFaction[];
    readonly agencies: readonly ExecutiveNode[];
    readonly commands: readonly OfficeCommand[];
    readonly record: readonly RecordRow[];
};
/** An office's whole file, or undefined for an id the catalog does not seat. */
export declare function officeFile(campaign: Campaign, officeId: string): OfficeFile | undefined;
