import { COMBATANT_COMMANDS, agendaItemLive, effectivePosture, graftDisclosed, officeDef, officeInstitution, selectFactions, selectPerson, stillRaisedBy, } from "@admin/engine";
import { federalSite } from "@admin/world";
import { charterOf } from "../campaign/founding-options.js";
import { staffingChips } from "../institution/office-chips.js";
import { recordRows } from "../record/record-entry.js";
import { executiveTree, officeAlerts, officeHolding, WHITE_HOUSE_OFFICE_ROLE } from "./executive-tree.js";
import { officeEmblem } from "./office-emblem.js";
const RECORD_ROWS = 8;
const DEFENSE = "INST-DOD";
function siteOf(def) {
    const site = federalSite(def.id);
    if (site?.location === "sourced" && site.state)
        return { kind: "sourced", name: site.site, state: site.state };
    return { kind: "none", reason: site?.reason || "There's no headquarters on record for this office." };
}
function conditionOf(runtime) {
    if (!runtime)
        return undefined;
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
function leverOf(def, office) {
    if (WHITE_HOUSE_OFFICE_ROLE[office.id])
        return "none";
    if (def.offices[0]?.id !== office.id)
        return "none";
    if (def.cabinetRole)
        return "cabinet";
    return office.actingAuthority === "none" || office.actingAuthority === "board-quorum" ? "none" : "acting";
}
function liveAgenda(campaign, items, role) {
    if (!role)
        return [];
    return items.filter((item) => item.role === role && agendaItemLive(item, campaign.turn - 1) && stillRaisedBy(campaign, item.role, item.person));
}
function commandsOf(campaign, def) {
    if (def.id !== DEFENSE)
        return [];
    return COMBATANT_COMMANDS.map((command) => ({
        id: command.id,
        name: command.name,
        abbr: command.abbr,
        posture: effectivePosture(campaign, command.id),
        headquarters: command.headquarters,
    }));
}
/** Entries naming the body, its chair or whoever holds it, newest first. */
function recordOf(campaign, def, holder) {
    const keys = new Set([def.id, ...(def.cabinetRole ? [def.cabinetRole] : []), ...(holder ? [holder] : [])]);
    const named = new Set(campaign.ledger.flatMap((entry) => (graftDisclosed(campaign, entry) && (entry.causal?.entities ?? []).some((entity) => keys.has(entity)) && entry.causal ? [entry.causal.eventId] : [])));
    return recordRows(campaign).filter((row) => named.has(row.id)).slice(0, RECORD_ROWS);
}
function agenciesOf(campaign, def) {
    const all = executiveTree(campaign).flatMap((section) => section.nodes);
    return all.find((node) => node.institution === def.id)?.children ?? [];
}
/** An office's whole file, or undefined for an id the catalog does not seat. */
export function officeFile(campaign, officeId) {
    const office = officeDef(officeId);
    const def = officeInstitution(officeId);
    if (!office || !def)
        return undefined;
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
        camera: `office:${def.id}`,
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
