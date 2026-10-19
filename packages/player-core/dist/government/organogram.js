import { institutionChildren, institutionDef, } from "@admin/engine";
import { subjectHref } from "../shell/subject.js";
import { bodyLoad } from "../institution/office-load.js";
function leadOfficeHref(def) {
    const officeId = def.offices[0]?.id;
    return officeId ? subjectHref({ kind: "office", id: officeId }) : undefined;
}
function organogramEntry(campaign, def, relation) {
    const href = leadOfficeHref(def);
    if (!href)
        return undefined;
    const office = def.offices[0];
    const runtime = campaign.institutions[def.id];
    return {
        key: def.id,
        label: def.name,
        href,
        relation,
        title: office.title,
        ...(runtime ? { load: bodyLoad(runtime) } : {}),
    };
}
function organogramSection(campaign, defs, relation, title) {
    const entries = defs
        .flatMap((def) => {
        const entry = organogramEntry(campaign, def, relation);
        return entry ? [entry] : [];
    })
        .sort((left, right) => left.label.localeCompare(right.label));
    return entries.length === 0 ? undefined : { key: relation, title, entries };
}
/**
 * The bodies already named around this one: the parent it answers to, the peer
 * bodies that share that parent, and the components that answer here.
 */
export function officeOrganogram(campaign, institution) {
    const sections = [];
    const parent = institution.parent ? institutionDef(institution.parent) : undefined;
    if (parent) {
        const parentSection = organogramSection(campaign, [parent], "parent", "Answers to");
        if (parentSection)
            sections.push(parentSection);
        const peers = institutionChildren(parent.id).filter((entry) => entry.id !== institution.id);
        const peerSection = organogramSection(campaign, peers, "peer", "Other offices under the same boss");
        if (peerSection)
            sections.push(peerSection);
    }
    const components = institutionChildren(institution.id);
    const componentSection = organogramSection(campaign, components, "component", "Offices that report here");
    if (componentSection)
        sections.push(componentSection);
    return sections;
}
