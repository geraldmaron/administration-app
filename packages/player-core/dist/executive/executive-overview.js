import { ACTIVE_STAGES, INSTITUTION_CATALOG, SERVICES, selectPerson, serviceDepartment } from "@admin/engine";
import { briefMatters } from "../desk/brief-matters.js";
import { branchDelivery } from "../government/delivery.js";
import { executiveTree, nodeNeedsAttention } from "../government/executive-tree.js";
import { departmentServices } from "../government/services.js";
// The executive branch composed for one screen: who holds each chair, what each
// office delivers, how its services are doing and what waits on the President,
// all read from the selectors that own them so the screen's figures cannot
// disagree with each other or with the office files they open.
const STAGE_WORDS = {
    shortlist: "on the shortlist",
    vetting: "being checked",
    prepared: "ready to send",
    nominated: "sent to the Senate",
    referred: "sent to a Senate committee",
    disclosures: "filing financial forms",
    "hearing-scheduled": "hearing scheduled",
    hearing: "in hearing",
    "committee-action": "waiting on the committee vote",
    "executive-calendar": "waiting for the full Senate",
    "floor-pending": "waiting for a Senate vote",
    cloture: "in a vote to end debate",
    vote: "being voted on",
    confirmed: "confirmed, waiting to be sworn in",
};
export function pendingNominee(campaign, node) {
    const nomination = Object.values(campaign.nominations).find((entry) => entry.office === node.office && ACTIVE_STAGES.includes(entry.stage));
    if (!nomination || nomination.nominee === node.holder)
        return undefined;
    const name = selectPerson(campaign, nomination.nominee)?.base.name ?? "A nominee";
    return { name, stage: STAGE_WORDS[nomination.stage] ?? nomination.stage };
}
const OTHER_BRANCHES = ["/washington/congress", "/washington/courts", "/washington/oversight"];
const pathOf = (href) => href.split(/[?#]/)[0] ?? "";
/** Matters answered in the executive branch: under /washington, but not the other three branches' pages. */
export function executiveMatters(matters) {
    return matters.filter((matter) => {
        if (!matter.href)
            return false;
        const path = pathOf(matter.href);
        if (path !== "/washington" && !path.startsWith("/washington/"))
            return false;
        return !OTHER_BRANCHES.some((branch) => path === branch || path.startsWith(`${branch}/`));
    });
}
function tally(rows) {
    const count = (tone) => rows.filter((row) => row.tone === tone).length;
    return { total: rows.length, good: count("good"), watch: count("watch"), bad: count("bad"), neutral: count("neutral") };
}
/** Counts every chair in the tree, agencies included, the one way the roster and the headline both count. */
export function chairCounts(campaign, nodes) {
    const all = nodes.flatMap((node) => [node, ...node.children]);
    const count = (test) => all.filter(test).length;
    return {
        total: all.length,
        confirmed: count((node) => node.staffing === "confirmed"),
        acting: count((node) => node.staffing === "acting"),
        vacant: count((node) => node.staffing === "vacant"),
        nominees: count((node) => pendingNominee(campaign, node) !== undefined),
        waiting: count((node) => node.alerts.length > 0),
        needYou: count(nodeNeedsAttention),
    };
}
function servicesByDepartment(rows) {
    const byDepartment = new Map();
    for (const row of rows) {
        const def = SERVICES.find((entry) => entry.id === row.id);
        if (!def)
            continue;
        const department = serviceDepartment(def);
        byDepartment.set(department, [...(byDepartment.get(department) ?? []), row]);
    }
    return byDepartment;
}
function longest(rows) {
    return rows.filter((row) => row.status !== "opening").reduce((worst, row) => (worst === undefined || row.pendingWeeks > worst.pendingWeeks ? row : worst), undefined);
}
export function executiveOverview(campaign, settings) {
    const tree = executiveTree(campaign);
    const delivery = branchDelivery(campaign);
    const services = departmentServices(campaign);
    const deliveryOf = new Map(delivery.rows.map((row) => [row.institution, row]));
    const owned = servicesByDepartment(services.rows);
    const sections = tree.map((section) => ({
        key: section.key,
        title: section.title,
        lead: section.lead,
        offices: section.nodes.map((node) => {
            const nominee = pendingNominee(campaign, node);
            const row = deliveryOf.get(node.institution);
            const rows = node.office === "press" ? undefined : owned.get(node.institution);
            return {
                node,
                section: section.key,
                ...(nominee ? { nominee } : {}),
                ...(row && node.office !== "press" ? { delivery: row } : {}),
                ...(rows ? { services: tally(rows) } : {}),
                agencies: node.children.length,
                agenciesNeedingYou: node.children.filter(nodeNeedsAttention).length,
                agencyDelivery: node.children.flatMap((child) => {
                    const agency = deliveryOf.get(child.institution);
                    return agency ? [{ name: child.name, href: child.href, row: agency }] : [];
                }),
            };
        }),
    }));
    const nodes = tree.flatMap((section) => section.nodes);
    const nominations = nodes
        .flatMap((node) => [node, ...node.children])
        .flatMap((node) => {
        const nominee = pendingNominee(campaign, node);
        return nominee ? [{ office: node.name, href: node.href, nominee }] : [];
    });
    const bodiesCounted = INSTITUTION_CATALOG.filter((def) => def.tier !== 0 && def.independence !== "independent" && campaign.institutions[def.id] !== undefined).length;
    const worst = longest(services.rows);
    return {
        chairs: chairCounts(campaign, nodes),
        delivery,
        bodiesCounted,
        services,
        serviceTally: tally(services.rows),
        ...(worst ? { longestWait: worst } : {}),
        sections,
        nominations,
        matters: executiveMatters(briefMatters(campaign, settings)),
    };
}
