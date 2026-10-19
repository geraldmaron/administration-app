import { ACTIVE_STAGES, INSTITUTION_CATALOG, SERVICES, selectPerson, serviceDepartment, type Campaign, type InstitutionId, type NominationStage } from "@admin/engine";
import { briefMatters, type BriefMatter } from "../desk/brief-matters.js";
import type { AttentionPolicySettings } from "../desk/attention.js";
import { branchDelivery, type BranchDelivery, type DeliveryRow } from "../government/delivery.js";
import { executiveTree, nodeNeedsAttention, type ExecutiveNode, type ExecutiveSectionKey } from "../government/executive-tree.js";
import { departmentServices, type ServiceRow, type ServiceTone, type ServicesReading } from "../government/services.js";

// The executive branch composed for one screen: who holds each chair, what each
// office delivers, how its services are doing and what waits on the President,
// all read from the selectors that own them so the screen's figures cannot
// disagree with each other or with the office files they open.

const STAGE_WORDS: Readonly<Partial<Record<NominationStage, string>>> = {
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

/** A name the Senate has in front of it for a chair, which is not the person in it. */
export type PendingNominee = { readonly name: string; readonly stage: string };

export function pendingNominee(campaign: Campaign, node: ExecutiveNode): PendingNominee | undefined {
  const nomination = Object.values(campaign.nominations).find((entry) => entry.office === node.office && ACTIVE_STAGES.includes(entry.stage));
  if (!nomination || nomination.nominee === node.holder) return undefined;
  const name = selectPerson(campaign, nomination.nominee)?.base.name ?? "A nominee";
  return { name, stage: STAGE_WORDS[nomination.stage] ?? nomination.stage };
}

export type ChairCounts = {
  readonly total: number;
  readonly confirmed: number;
  readonly acting: number;
  readonly vacant: number;
  /** Chairs with a name before the Senate. */
  readonly nominees: number;
  /** Chairs with a request, offer or inquiry waiting. */
  readonly waiting: number;
  /** Chairs that are vacant, acting or have something waiting. */
  readonly needYou: number;
};

export type ServiceTally = { readonly total: number; readonly good: number; readonly watch: number; readonly bad: number; readonly neutral: number };

export type OverviewOffice = {
  readonly node: ExecutiveNode;
  readonly section: ExecutiveSectionKey;
  readonly nominee?: PendingNominee;
  /** Present for the top-level bodies the branch figure is built from; absent for the White House staff and independent boards. */
  readonly delivery?: DeliveryRow;
  /** The services this department owns, by how each is doing; absent when it owns none. */
  readonly services?: ServiceTally;
  readonly agencies: number;
  readonly agenciesNeedingYou: number;
  /** Agencies under this office that the branch figure also counts on their own, such as the FBI under Justice, so no delivery row goes undrawn. */
  readonly agencyDelivery: readonly AgencyDelivery[];
};

export type AgencyDelivery = { readonly name: string; readonly href: string; readonly row: DeliveryRow };

export type OverviewSection = { readonly key: ExecutiveSectionKey; readonly title: string; readonly lead: string; readonly offices: readonly OverviewOffice[] };

export type PendingNomination = { readonly office: string; readonly href: string; readonly nominee: PendingNominee };

export type ExecutiveOverview = {
  readonly chairs: ChairCounts;
  readonly delivery: BranchDelivery;
  /** How many bodies the branch figure is weighted over, against the top-level offices drawn beside it. */
  readonly bodiesCounted: number;
  readonly services: ServicesReading;
  readonly serviceTally: ServiceTally;
  /** The service with the most intake waiting, where any is tracked. A maximum, never a pooled sum: each service is in its own unit. */
  readonly longestWait?: ServiceRow;
  readonly sections: readonly OverviewSection[];
  readonly nominations: readonly PendingNomination[];
  /** What waits on the President under Washington's executive pages. */
  readonly matters: readonly BriefMatter[];
};

const OTHER_BRANCHES = ["/washington/congress", "/washington/courts", "/washington/oversight"] as const;

const pathOf = (href: string): string => href.split(/[?#]/)[0] ?? "";

/** Matters answered in the executive branch: under /washington, but not the other three branches' pages. */
export function executiveMatters(matters: readonly BriefMatter[]): readonly BriefMatter[] {
  return matters.filter((matter) => {
    if (!matter.href) return false;
    const path = pathOf(matter.href);
    if (path !== "/washington" && !path.startsWith("/washington/")) return false;
    return !OTHER_BRANCHES.some((branch) => path === branch || path.startsWith(`${branch}/`));
  });
}

function tally(rows: readonly ServiceRow[]): ServiceTally {
  const count = (tone: ServiceTone) => rows.filter((row) => row.tone === tone).length;
  return { total: rows.length, good: count("good"), watch: count("watch"), bad: count("bad"), neutral: count("neutral") };
}

/** Counts every chair in the tree, agencies included, the one way the roster and the headline both count. */
export function chairCounts(campaign: Campaign, nodes: readonly ExecutiveNode[]): ChairCounts {
  const all = nodes.flatMap((node) => [node, ...node.children]);
  const count = (test: (node: ExecutiveNode) => boolean) => all.filter(test).length;
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

function servicesByDepartment(rows: readonly ServiceRow[]): ReadonlyMap<string, readonly ServiceRow[]> {
  const byDepartment = new Map<string, ServiceRow[]>();
  for (const row of rows) {
    const def = SERVICES.find((entry) => entry.id === row.id);
    if (!def) continue;
    const department = serviceDepartment(def) as string;
    byDepartment.set(department, [...(byDepartment.get(department) ?? []), row]);
  }
  return byDepartment;
}

function longest(rows: readonly ServiceRow[]): ServiceRow | undefined {
  return rows.filter((row) => row.status !== "opening").reduce<ServiceRow | undefined>((worst, row) => (worst === undefined || row.pendingWeeks > worst.pendingWeeks ? row : worst), undefined);
}

export function executiveOverview(campaign: Campaign, settings?: AttentionPolicySettings): ExecutiveOverview {
  const tree = executiveTree(campaign);
  const delivery = branchDelivery(campaign);
  const services = departmentServices(campaign);
  const deliveryOf = new Map<InstitutionId, DeliveryRow>(delivery.rows.map((row) => [row.institution, row]));
  const owned = servicesByDepartment(services.rows);
  const sections = tree.map((section): OverviewSection => ({
    key: section.key,
    title: section.title,
    lead: section.lead,
    offices: section.nodes.map((node): OverviewOffice => {
      const nominee = pendingNominee(campaign, node);
      const row = deliveryOf.get(node.institution);
      const rows = node.office === "press" ? undefined : owned.get(node.institution as string);
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
