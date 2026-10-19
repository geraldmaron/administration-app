import { INSTITUTION_CATALOG, agendaItemLive, institutionChildren, isMatterOpen, selectActing, selectCabinetHolder, selectMattersFor, selectPerson, stillRaisedBy, } from "@admin/engine";
import { federalSite, federalSitePoint } from "@admin/world";
import { place } from "../navigation/places.js";
import { subjectHref } from "../shell/subject.js";
import { cabinetRankOf } from "./machine.js";
import { judgeAttribute } from "./machine-readings.js";
import { whiteHouseSeats } from "./machine-white-house.js";
import { officeEmblem } from "./office-emblem.js";
/** The two White House staff chairs the catalog seats as offices of the Executive Office of the President. */
export const WHITE_HOUSE_OFFICE_ROLE = {
    "OFF-CHIEF-OF-STAFF": "role-chief-of-staff",
    "OFF-NSA-ADVISOR": "role-national-security-adviser",
};
const PRESIDENCY = "INST-PRESIDENCY";
const ODNI = "INST-ODNI";
const INDEPENDENT_KINDS = new Set(["independent-agency", "regulator"]);
/** How many contested calls each person has advised on, the evidence a reading's confidence rests on. */
function counselCounts(campaign) {
    const counts = new Map();
    for (const entry of campaign.ledger) {
        const counsel = entry.counsel;
        if (!counsel)
            continue;
        const voices = new Set([counsel.person, ...(counsel.room ?? []).map((voice) => voice.person)]);
        for (const voice of voices)
            counts.set(voice, (counts.get(voice) ?? 0) + 1);
    }
    return counts;
}
/** Who sits in a chair and how, read from the record that owns that chair. */
export function officeHolding(campaign, def, office) {
    const staffRole = WHITE_HOUSE_OFFICE_ROLE[office.id];
    if (staffRole) {
        const holder = whiteHouseSeats(campaign).find((seat) => seat.role === staffRole)?.holder;
        return holder ? { staffing: "confirmed", holder: holder.id } : { staffing: "vacant" };
    }
    if (def.cabinetRole) {
        const seated = selectCabinetHolder(campaign, def.cabinetRole);
        if (seated?.alive)
            return { staffing: "confirmed", holder: seated.base.id };
        const acting = selectActing(campaign, def.cabinetRole);
        return acting ? { staffing: "acting", holder: acting } : { staffing: "vacant" };
    }
    const runtime = campaign.institutions[def.id];
    const leader = runtime?.leader ? selectPerson(campaign, runtime.leader) : undefined;
    if (runtime && !runtime.vacancy && leader?.alive)
        return { staffing: "confirmed", holder: leader.base.id };
    const acting = runtime?.actingLeader ? selectPerson(campaign, runtime.actingLeader) : undefined;
    return acting?.alive ? { staffing: "acting", holder: acting.base.id } : { staffing: "vacant" };
}
function plural(count, noun) {
    return `${count} ${noun}${count === 1 ? "" : "s"}`;
}
/** What is waiting on the President from this chair: its Secretary's requests and offers, and open inquiries into the body. */
export function officeAlerts(campaign, def) {
    const agenda = campaign.cabinetAgenda ?? { proposals: [], offers: [] };
    const live = (item) => item.role === def.cabinetRole && agendaItemLive(item, campaign.turn - 1) && stillRaisedBy(campaign, item.role, item.person);
    const proposals = agenda.proposals.filter(live).length;
    const offers = agenda.offers.filter(live).length;
    const inquiries = selectMattersFor(campaign, def.id).filter(isMatterOpen).length;
    return [
        ...(proposals > 0 ? [{ kind: "proposal", text: `${plural(proposals, "request")} waiting` }] : []),
        ...(offers > 0 ? [{ kind: "resignation", text: "Has offered to resign" }] : []),
        ...(inquiries > 0 ? [{ kind: "inquiry", text: inquiries === 1 ? "1 open inquiry" : `${inquiries} open inquiries` }] : []),
    ];
}
function siteOf(id) {
    const point = federalSitePoint(id);
    const site = federalSite(id);
    return point && site ? { name: site.site, lat: point.lat, lon: point.lon } : undefined;
}
function nodeFor(campaign, def, office, counts, depth) {
    const holding = officeHolding(campaign, def, office);
    const person = holding.holder ? selectPerson(campaign, holding.holder)?.base : undefined;
    const calls = person ? (counts.get(person.id) ?? 0) : 0;
    const children = depth === 0 ? institutionChildren(def.id).flatMap((child) => (child.offices[0] ? [nodeFor(campaign, child, child.offices[0], counts, 1)] : [])) : [];
    const site = siteOf(def.id);
    return {
        institution: def.id,
        office: office.id,
        name: WHITE_HOUSE_OFFICE_ROLE[office.id] ? office.title : def.name,
        abbr: def.abbr,
        title: office.title,
        href: subjectHref({ kind: "office", id: office.id }),
        emblem: officeEmblem(def.id, office.id),
        staffing: holding.staffing,
        ...(person ? { holder: person.id, holderName: person.name } : {}),
        ...(person ? { competence: judgeAttribute("competence", person.competence, calls), loyalty: judgeAttribute("loyalty", person.loyalty, calls) } : {}),
        alerts: officeAlerts(campaign, def),
        ...(site ? { site } : {}),
        children,
    };
}
function leadNode(campaign, def, counts) {
    return def.offices[0] ? [nodeFor(campaign, def, def.offices[0], counts, 0)] : [];
}
/** The press office, which runs from the podium rather than from a catalog chair. */
function pressNode(campaign, presidency) {
    const press = whiteHouseSeats(campaign).find((seat) => seat.role === "role-press-secretary");
    const holder = press?.holder;
    const site = siteOf(presidency.id);
    return {
        institution: presidency.id,
        office: "press",
        name: "Press office",
        abbr: "Press",
        title: press?.title ?? "Press Secretary",
        href: place.pressOffice(),
        emblem: "microphone",
        staffing: holder ? "confirmed" : "vacant",
        ...(holder
            ? { holder: holder.id, holderName: holder.name, competence: judgeAttribute("competence", holder.competence), loyalty: judgeAttribute("loyalty", holder.loyalty) }
            : {}),
        alerts: [],
        ...(site ? { site } : {}),
        children: [],
    };
}
/** The White House: the President's own two staff chairs and the press office. */
function whiteHouse(campaign, counts) {
    const presidency = INSTITUTION_CATALOG.find((def) => def.id === PRESIDENCY);
    const staff = presidency.offices
        .filter((office) => WHITE_HOUSE_OFFICE_ROLE[office.id])
        .map((office) => ({ ...nodeFor(campaign, presidency, office, counts, 1), alerts: [] }));
    return [...staff, pressNode(campaign, presidency)];
}
const byRank = (a, b) => (cabinetRankOf(a.cabinetRole) ?? 99) - (cabinetRankOf(b.cabinetRole) ?? 99) || a.name.localeCompare(b.name);
/** The executive branch in five sections, the departments in order of precedence with their agencies beneath. */
export function executiveTree(campaign) {
    const counts = counselCounts(campaign);
    const lead = (defs) => defs.flatMap((def) => leadNode(campaign, def, counts));
    const departments = INSTITUTION_CATALOG.filter((def) => def.kind === "department").sort(byRank);
    const executiveOffice = INSTITUTION_CATALOG.filter((def) => def.parent === PRESIDENCY);
    const independent = INSTITUTION_CATALOG.filter((def) => INDEPENDENT_KINDS.has(def.kind) && !def.parent).sort((a, b) => a.name.localeCompare(b.name));
    return [
        { key: "white-house", title: "The White House", lead: "Your own staff. You hire them without a Senate vote.", nodes: whiteHouse(campaign, counts) },
        { key: "executive-office", title: "The Executive Office", lead: "The budget office and the trade representative answer to you directly.", nodes: lead(executiveOffice) },
        { key: "departments", title: "The departments", lead: "The 15 Cabinet Secretaries, listed by rank, with the agencies each one runs.", nodes: lead(departments) },
        { key: "intelligence", title: "The intelligence community", lead: "The Director of National Intelligence and the intelligence agencies under that office.", nodes: lead(INSTITUTION_CATALOG.filter((def) => def.id === ODNI)) },
        { key: "independent", title: "Independent agencies", lead: "Boards and regulators that the law keeps out of your direct control.", nodes: lead(independent) },
    ].filter((section) => section.nodes.length > 0);
}
/** Whether a chair needs the President: anything waiting from it, or nobody confirmed in it. */
export function nodeNeedsAttention(node) {
    return node.alerts.length > 0 || node.staffing !== "confirmed";
}
/** The tree cut to the chairs that need the President, keeping a parent wherever one of its agencies does. */
export function attentionTree(sections) {
    const keep = (node) => {
        const children = node.children.flatMap((child) => (nodeNeedsAttention(child) ? [child] : []));
        return nodeNeedsAttention(node) || children.length > 0 ? { ...node, children } : undefined;
    };
    return sections.flatMap((section) => {
        const nodes = section.nodes.flatMap((node) => {
            const kept = keep(node);
            return kept ? [kept] : [];
        });
        return nodes.length > 0 ? [{ ...section, nodes }] : [];
    });
}
/** Every chair in the tree with a sourced headquarters, flattened: the map's office pins. */
export function executivePins(campaign) {
    const seen = new Set();
    const flat = executiveTree(campaign).flatMap((section) => section.nodes.flatMap((node) => [node, ...node.children]));
    return flat.filter((node) => {
        if (!node.site || seen.has(node.institution) || node.office === "press")
            return false;
        seen.add(node.institution);
        return true;
    });
}
