import {
  COMBATANT_COMMANDS,
  agendaItemLive,
  effectivePosture,
  graftDisclosed,
  officeDef,
  officeInstitution,
  selectFactions,
  selectPerson,
  stillRaisedBy,
  type CabinetFaction,
  type Campaign,
  type InstitutionDef,
  type InstitutionRuntime,
  type MinisterProposal,
  type OfficeDef,
  type ResignationOffer,
} from "@admin/engine";
import { federalSite, type PersonId, type RoleId } from "@admin/world";
import { charterOf } from "../campaign/founding-options.js";
import { staffingChips, type StaffingChip } from "../institution/office-chips.js";
import { recordRows, type RecordRow } from "../record/record-entry.js";
import { executiveTree, officeAlerts, officeHolding, WHITE_HOUSE_OFFICE_ROLE, type ExecutiveAlert, type ExecutiveNode, type Staffing } from "./executive-tree.js";
import { officeEmblem } from "./office-emblem.js";

// One office's file: the chair, who holds it and how, what the body under it
// can carry, the holder's five readings, what its Secretary has put to the
// President, the agencies beneath it and its record. Every act the screen
// offers on the chair is decided here from the record that owns the chair, so
// the screen never offers a lever the office does not carry.

/** Where the office stands, or why the dataset places it nowhere. */
export type OfficeSite = { readonly kind: "sourced"; readonly name: string; readonly state: string } | { readonly kind: "none"; readonly reason: string };

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

export type OfficeCommand = { readonly id: string; readonly name: string; readonly abbr: string; readonly posture: string; readonly headquarters: string };

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

const RECORD_ROWS = 8;
const DEFENSE = "INST-DOD";

function siteOf(def: InstitutionDef): OfficeSite {
  const site = federalSite(def.id as string);
  if (site?.location === "sourced" && site.state) return { kind: "sourced", name: site.site, state: site.state };
  return { kind: "none", reason: site?.reason || "There's no headquarters on record for this office." };
}

function conditionOf(runtime: InstitutionRuntime | undefined): OfficeCondition | undefined {
  if (!runtime) return undefined;
  return {
    capacity: runtime.capacity,
    staffing: runtime.staffing,
    morale: runtime.morale,
    implementationQuality: runtime.implementationQuality,
    backlog: Math.round(runtime.backlog),
    vacantDays: Math.round(runtime.vacantDays),
    directives: runtime.directives.length,
  };
}

function leverOf(def: InstitutionDef, office: OfficeDef): ChairLever {
  if (WHITE_HOUSE_OFFICE_ROLE[office.id]) return "none";
  if (def.offices[0]?.id !== office.id) return "none";
  if (def.cabinetRole) return "cabinet";
  return office.actingAuthority === "none" || office.actingAuthority === "board-quorum" ? "none" : "acting";
}

function liveAgenda<T extends { readonly role: RoleId; readonly person: PersonId; readonly expiresTurn?: number }>(campaign: Campaign, items: readonly T[], role: RoleId | undefined): readonly T[] {
  if (!role) return [];
  return items.filter((item) => item.role === role && agendaItemLive(item, campaign.turn - 1) && stillRaisedBy(campaign, item.role, item.person));
}

function commandsOf(campaign: Campaign, def: InstitutionDef): readonly OfficeCommand[] {
  if ((def.id as string) !== DEFENSE) return [];
  return COMBATANT_COMMANDS.map((command) => ({
    id: command.id as string,
    name: command.name,
    abbr: command.abbr,
    posture: effectivePosture(campaign, command.id),
    headquarters: command.headquarters,
  }));
}

/** Entries naming the body, its chair or whoever holds it, newest first. */
function recordOf(campaign: Campaign, def: InstitutionDef, holder: PersonId | undefined): readonly RecordRow[] {
  const keys = new Set<string>([def.id as string, ...(def.cabinetRole ? [def.cabinetRole as string] : []), ...(holder ? [holder as string] : [])]);
  const named = new Set(campaign.ledger.flatMap((entry) => (graftDisclosed(campaign, entry) && (entry.causal?.entities ?? []).some((entity) => keys.has(entity)) && entry.causal ? [entry.causal.eventId] : [])));
  return recordRows(campaign).filter((row) => named.has(row.id)).slice(0, RECORD_ROWS);
}

function agenciesOf(campaign: Campaign, def: InstitutionDef): readonly ExecutiveNode[] {
  const all = executiveTree(campaign).flatMap((section) => section.nodes);
  return all.find((node) => node.institution === def.id)?.children ?? [];
}

/** An office's whole file, or undefined for an id the catalog does not seat. */
export function officeFile(campaign: Campaign, officeId: string): OfficeFile | undefined {
  const office = officeDef(officeId as never);
  const def = officeInstitution(officeId as never);
  if (!office || !def) return undefined;
  const holding = officeHolding(campaign, def, office);
  const person = holding.holder ? selectPerson(campaign, holding.holder)?.base : undefined;
  const role = WHITE_HOUSE_OFFICE_ROLE[office.id] ?? def.cabinetRole;
  const titles = charterOf(campaign).roleTitles;
  const agenda = campaign.cabinetAgenda ?? { proposals: [], offers: [] };
  const condition = conditionOf(campaign.institutions[def.id]);
  return {
    institution: def,
    office,
    name: WHITE_HOUSE_OFFICE_ROLE[office.id] ? office.title : def.name,
    emblem: officeEmblem(def.id, office.id),
    camera: `office:${def.id as string}`,
    site: siteOf(def),
    staffing: holding.staffing,
    ...(person ? { holder: person.id, holderName: person.name } : {}),
    ...(role ? { role } : {}),
    lever: leverOf(def, office),
    chips: staffingChips(office),
    ...(condition ? { condition } : {}),
    alerts: officeAlerts(campaign, def),
    proposals: liveAgenda(campaign, agenda.proposals, def.cabinetRole),
    offers: liveAgenda(campaign, agenda.offers, def.cabinetRole),
    factions: def.cabinetRole ? selectFactions(campaign, titles).filter((faction) => faction.role === def.cabinetRole) : [],
    agencies: agenciesOf(campaign, def),
    commands: commandsOf(campaign, def),
    record: recordOf(campaign, def, person?.id),
  };
}
