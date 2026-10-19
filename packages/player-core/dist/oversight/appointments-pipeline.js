import { institutionDef, INSTITUTION_CATALOG, REMOVAL_POLITICIZATION, removeOfficer, selectActing, selectNominationForOffice, selectPerson, selectPipelineReading, selectVacancies, } from "@admin/engine";
import { packetCost } from "../dossier/person-lever";
/** Every empty chair nobody has been sent up for yet, and the pipeline as a whole. */
export function vacancyBoard(campaign) {
    // The executive delivery selector excludes light circuit seats. They still
    // belong in the President's appointment queue once an active seat opens.
    const circuitVacancies = Object.values(campaign.institutions).filter((runtime) => runtime.vacancy && runtime.lowerBenchSeat);
    const open = [...selectVacancies(campaign), ...circuitVacancies].flatMap((runtime) => {
        const def = institutionDef(runtime.id);
        const office = def?.offices[0];
        if (!def || !office || selectNominationForOffice(campaign, office.id))
            return [];
        const acting = selectActing(campaign, office.id);
        const actingName = acting ? selectPerson(campaign, acting)?.base.name : undefined;
        return [{ institution: def.id, office: office.id, title: office.title, body: def.name, days: runtime.vacantDays, ...(actingName ? { acting: actingName } : {}) }];
    });
    return { open, pipeline: selectPipelineReading(campaign) };
}
/** Every officer below the cabinet the President could remove today, by body. A fixed term cannot be ended and is left off. */
export function removableOfficers(campaign) {
    return INSTITUTION_CATALOG.flatMap((def) => {
        const office = def.offices[0];
        const leader = campaign.institutions[def.id]?.leader;
        const holder = leader ? selectPerson(campaign, leader) : undefined;
        if (def.cabinetRole || !office || !holder?.alive || office.removal === "term-protected")
            return [];
        return [{ institution: def.id, title: office.title, body: def.name, holder: holder.base.name, holderId: holder.base.id, removal: office.removal }];
    }).sort((a, b) => a.body.localeCompare(b.body));
}
/** The causes a for-cause office can be emptied for, each of which bends the body by its own amount. */
export const REMOVAL_CAUSES = Object.keys(REMOVAL_POLITICIZATION);
/** What removing this officer for this cause does, off the packet `removeOfficer` commits. */
export function removalTerms(campaign, institution, cause) {
    const result = removeOfficer(campaign, institution, cause);
    if (!result.ok)
        return { refusal: result.reason };
    const before = campaign.institutions[institution]?.politicization ?? 0;
    const change = result.packet.effects.find((effect) => effect.kind === "institution" && effect.changes?.politicization !== undefined);
    const after = change?.kind === "institution" ? (change.changes?.politicization ?? before) : before;
    return { ...(cause ? { cause } : {}), cost: packetCost(result.packet), politicization: { before, after } };
}
/** The removal itself, built on the campaign it is committed against. */
export function removalPacket(campaign, institution, cause) {
    const result = removeOfficer(campaign, institution, cause);
    if (!result.ok)
        throw new Error(result.reason);
    return result.packet;
}
