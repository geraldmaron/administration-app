// An office's full file: who holds it, how it is staffed, its chair's clock,
// the people it connects to and who audits it.
import { selectPerson } from "@admin/engine";
import { subjectHref } from "../shell/subject.js";
function leadsOffice(institution, office) {
    return institution.offices[0]?.id === office.id;
}
/** Vacant, acting, or confirmed from the institution runtime for the chair office. */
export function officeStaffing(campaign, institution, office) {
    if (!leadsOffice(institution, office))
        return "confirmed";
    const runtime = campaign.institutions[institution.id];
    if (!runtime?.vacancy && runtime?.leader)
        return "confirmed";
    if (runtime?.actingLeader)
        return "acting";
    return "vacant";
}
/** Person doors for whoever holds or signs for the chair today. */
export function officeNetworkDoors(campaign, institution, office) {
    if (!leadsOffice(institution, office))
        return [];
    const runtime = campaign.institutions[institution.id];
    if (!runtime)
        return [];
    const holder = runtime.leader ? selectPerson(campaign, runtime.leader) : undefined;
    const acting = runtime.actingLeader ? selectPerson(campaign, runtime.actingLeader) : undefined;
    const doors = [];
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
