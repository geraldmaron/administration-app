// An office's full file: who holds it, how it is staffed, its chair's clock,
// the people it connects to and who audits it.
import { selectPerson, type Campaign, type InstitutionDef, type OfficeDef } from "@admin/engine";
import { type OrganogramSection } from "../government/organogram.js";
import { type OversightReading } from "../oversight/oversight-reading.js";
import { subjectHref } from "../shell/subject.js";
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

function leadsOffice(institution: InstitutionDef, office: OfficeDef): boolean {
  return institution.offices[0]?.id === office.id;
}

/** Vacant, acting, or confirmed from the institution runtime for the chair office. */
export function officeStaffing(campaign: Campaign, institution: InstitutionDef, office: OfficeDef): OfficeStaffing {
  if (!leadsOffice(institution, office)) return "confirmed";
  const runtime = campaign.institutions[institution.id];
  if (!runtime?.vacancy && runtime?.leader) return "confirmed";
  if (runtime?.actingLeader) return "acting";
  return "vacant";
}

/** Person doors for whoever holds or signs for the chair today. */
export function officeNetworkDoors(
  campaign: Campaign,
  institution: InstitutionDef,
  office: OfficeDef,
): readonly OfficeNetworkDoor[] {
  if (!leadsOffice(institution, office)) return [];
  const runtime = campaign.institutions[institution.id];
  if (!runtime) return [];
  const holder = runtime.leader ? selectPerson(campaign, runtime.leader) : undefined;
  const acting = runtime.actingLeader ? selectPerson(campaign, runtime.actingLeader) : undefined;
  const doors: OfficeNetworkDoor[] = [];
  if (holder?.alive) {
    doors.push({
      key: "leader",
      label: holder.base.name,
      href: subjectHref({ kind: "person", id: holder.base.id }),
      role: "confirmed",
    });
  }
  if (acting?.alive && acting.base.id !== holder?.base.id) {
    doors.push({
      key: "acting",
      label: acting.base.name,
      href: subjectHref({ kind: "person", id: acting.base.id }),
      role: "acting",
    });
  }
  return doors;
}
