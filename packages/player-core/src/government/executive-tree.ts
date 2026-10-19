import {
  INSTITUTION_CATALOG,
  agendaItemLive,
  institutionChildren,
  isMatterOpen,
  selectActing,
  selectCabinetHolder,
  selectMattersFor,
  selectPerson,
  stillRaisedBy,
  type Campaign,
  type InstitutionDef,
  type InstitutionId,
  type OfficeDef,
} from "@admin/engine";
import { federalSite, federalSitePoint, type PersonId, type RoleId } from "@admin/world";
import { place } from "../navigation/places.js";
import { subjectHref } from "../shell/subject.js";
import { cabinetRankOf } from "./machine.js";
import { judgeAttribute, type AttributeJudgment } from "./machine-readings.js";
import { whiteHouseSeats } from "./machine-white-house.js";
import { officeEmblem } from "./office-emblem.js";

// The executive branch as the Washington mode draws it: a tree of offices,
// each with who is in the chair, how they hold it, how they read, and what is
// waiting on the President from it. The same nodes are the map's pins, so a
// chair the tree calls vacant is the pin the map colors vacant.

export type Staffing = "confirmed" | "acting" | "vacant";

export type ExecutiveAlertKind = "proposal" | "resignation" | "inquiry";

export type ExecutiveAlert = {
  readonly kind: ExecutiveAlertKind;
  readonly text: string;
};

export type ExecutiveNode = {
  readonly institution: InstitutionId;
  /** The chair's office id, the route's `:id`. */
  readonly office: string;
  readonly name: string;
  readonly abbr: string;
  /** The chair's own title: "Secretary of the Treasury". */
  readonly title: string;
  readonly href: string;
  readonly emblem: string;
  readonly staffing: Staffing;
  readonly holder?: PersonId;
  readonly holderName?: string;
  readonly competence?: AttributeJudgment;
  readonly loyalty?: AttributeJudgment;
  readonly alerts: readonly ExecutiveAlert[];
  /** The sourced headquarters, where the dataset records one. */
  readonly site?: { readonly name: string; readonly lat: number; readonly lon: number };
  readonly children: readonly ExecutiveNode[];
};

export type ExecutiveSectionKey = "white-house" | "executive-office" | "departments" | "intelligence" | "independent";

export type ExecutiveSection = {
  readonly key: ExecutiveSectionKey;
  readonly title: string;
  readonly lead: string;
  readonly nodes: readonly ExecutiveNode[];
};

/** The two White House staff chairs the catalog seats as offices of the Executive Office of the President. */
export const WHITE_HOUSE_OFFICE_ROLE: Readonly<Record<string, RoleId>> = {
  "OFF-CHIEF-OF-STAFF": "role-chief-of-staff" as RoleId,
  "OFF-NSA-ADVISOR": "role-national-security-adviser" as RoleId,
};

const PRESIDENCY = "INST-PRESIDENCY" as InstitutionId;
const ODNI = "INST-ODNI" as InstitutionId;
const INDEPENDENT_KINDS: ReadonlySet<string> = new Set(["independent-agency", "regulator"]);

/** How many contested calls each person has advised on, the evidence a reading's confidence rests on. */
function counselCounts(campaign: Campaign): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const entry of campaign.ledger) {
    const counsel = entry.counsel;
    if (!counsel) continue;
    const voices = new Set([counsel.person as string, ...(counsel.room ?? []).map((voice) => voice.person as string)]);
    for (const voice of voices) counts.set(voice, (counts.get(voice) ?? 0) + 1);
  }
  return counts;
}

type Holding = { readonly staffing: Staffing; readonly holder?: PersonId };

/** Who sits in a chair and how, read from the record that owns that chair. */
export function officeHolding(campaign: Campaign, def: InstitutionDef, office: OfficeDef): Holding {
  const staffRole = WHITE_HOUSE_OFFICE_ROLE[office.id];
  if (staffRole) {
    const holder = whiteHouseSeats(campaign).find((seat) => seat.role === staffRole)?.holder;
    return holder ? { staffing: "confirmed", holder: holder.id } : { staffing: "vacant" };
  }
  if (def.cabinetRole) {
    const seated = selectCabinetHolder(campaign, def.cabinetRole);
    if (seated?.alive) return { staffing: "confirmed", holder: seated.base.id };
    const acting = selectActing(campaign, def.cabinetRole);
    return acting ? { staffing: "acting", holder: acting } : { staffing: "vacant" };
  }
  const runtime = campaign.institutions[def.id];
  const leader = runtime?.leader ? selectPerson(campaign, runtime.leader) : undefined;
  if (runtime && !runtime.vacancy && leader?.alive) return { staffing: "confirmed", holder: leader.base.id };
  const acting = runtime?.actingLeader ? selectPerson(campaign, runtime.actingLeader) : undefined;
  return acting?.alive ? { staffing: "acting", holder: acting.base.id } : { staffing: "vacant" };
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/** What is waiting on the President from this chair: its Secretary's requests and offers, and open inquiries into the body. */
export function officeAlerts(campaign: Campaign, def: InstitutionDef): readonly ExecutiveAlert[] {
  const agenda = campaign.cabinetAgenda ?? { proposals: [], offers: [] };
  const live = <T extends { readonly role: RoleId; readonly person: PersonId; readonly expiresTurn?: number }>(item: T) =>
    item.role === def.cabinetRole && agendaItemLive(item, campaign.turn - 1) && stillRaisedBy(campaign, item.role, item.person);
  const proposals = agenda.proposals.filter(live).length;
  const offers = agenda.offers.filter(live).length;
  const inquiries = selectMattersFor(campaign, def.id).filter(isMatterOpen).length;
  return [
    ...(proposals > 0 ? [{ kind: "proposal" as const, text: `${plural(proposals, "request")} waiting` }] : []),
    ...(offers > 0 ? [{ kind: "resignation" as const, text: "Has offered to resign" }] : []),
    ...(inquiries > 0 ? [{ kind: "inquiry" as const, text: inquiries === 1 ? "1 open inquiry" : `${inquiries} open inquiries` }] : []),
  ];
}

function siteOf(id: InstitutionId): ExecutiveNode["site"] {
  const point = federalSitePoint(id);
  const site = federalSite(id);
  return point && site ? { name: site.site, lat: point.lat, lon: point.lon } : undefined;
}

function nodeFor(campaign: Campaign, def: InstitutionDef, office: OfficeDef, counts: ReadonlyMap<string, number>, depth: number): ExecutiveNode {
  const holding = officeHolding(campaign, def, office);
  const person = holding.holder ? selectPerson(campaign, holding.holder)?.base : undefined;
  const calls = person ? (counts.get(person.id as string) ?? 0) : 0;
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

function leadNode(campaign: Campaign, def: InstitutionDef, counts: ReadonlyMap<string, number>): readonly ExecutiveNode[] {
  return def.offices[0] ? [nodeFor(campaign, def, def.offices[0], counts, 0)] : [];
}

/** The press office, which runs from the podium rather than from a catalog chair. */
function pressNode(campaign: Campaign, presidency: InstitutionDef): ExecutiveNode {
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
function whiteHouse(campaign: Campaign, counts: ReadonlyMap<string, number>): readonly ExecutiveNode[] {
  const presidency = INSTITUTION_CATALOG.find((def) => def.id === PRESIDENCY)!;
  const staff = presidency.offices
    .filter((office) => WHITE_HOUSE_OFFICE_ROLE[office.id])
    .map((office) => ({ ...nodeFor(campaign, presidency, office, counts, 1), alerts: [] }));
  return [...staff, pressNode(campaign, presidency)];
}

const byRank = (a: InstitutionDef, b: InstitutionDef): number =>
  (cabinetRankOf(a.cabinetRole as string) ?? 99) - (cabinetRankOf(b.cabinetRole as string) ?? 99) || a.name.localeCompare(b.name);

/** The executive branch in five sections, the departments in order of precedence with their agencies beneath. */
export function executiveTree(campaign: Campaign): readonly ExecutiveSection[] {
  const counts = counselCounts(campaign);
  const lead = (defs: readonly InstitutionDef[]) => defs.flatMap((def) => leadNode(campaign, def, counts));
  const departments = INSTITUTION_CATALOG.filter((def) => def.kind === "department").sort(byRank);
  const executiveOffice = INSTITUTION_CATALOG.filter((def) => def.parent === PRESIDENCY);
  const independent = INSTITUTION_CATALOG.filter((def) => INDEPENDENT_KINDS.has(def.kind) && !def.parent).sort((a, b) => a.name.localeCompare(b.name));
  return [
    { key: "white-house", title: "The White House", lead: "Your own staff. You hire them without a Senate vote.", nodes: whiteHouse(campaign, counts) },
    { key: "executive-office", title: "The Executive Office", lead: "The budget office and the trade representative answer to you directly.", nodes: lead(executiveOffice) },
    { key: "departments", title: "The departments", lead: "The 15 Cabinet Secretaries, listed by rank, with the agencies each one runs.", nodes: lead(departments) },
    { key: "intelligence", title: "The intelligence community", lead: "The Director of National Intelligence and the intelligence agencies under that office.", nodes: lead(INSTITUTION_CATALOG.filter((def) => def.id === ODNI)) },
    { key: "independent", title: "Independent agencies", lead: "Boards and regulators that the law keeps out of your direct control.", nodes: lead(independent) },
  ].filter((section) => section.nodes.length > 0) as readonly ExecutiveSection[];
}

/** Whether a chair needs the President: anything waiting from it, or nobody confirmed in it. */
export function nodeNeedsAttention(node: ExecutiveNode): boolean {
  return node.alerts.length > 0 || node.staffing !== "confirmed";
}

/** The tree cut to the chairs that need the President, keeping a parent wherever one of its agencies does. */
export function attentionTree(sections: readonly ExecutiveSection[]): readonly ExecutiveSection[] {
  const keep = (node: ExecutiveNode): ExecutiveNode | undefined => {
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
export function executivePins(campaign: Campaign): readonly ExecutiveNode[] {
  const seen = new Set<string>();
  const flat = executiveTree(campaign).flatMap((section) => section.nodes.flatMap((node) => [node, ...node.children]));
  return flat.filter((node) => {
    if (!node.site || seen.has(node.institution as string) || node.office === "press") return false;
    seen.add(node.institution as string);
    return true;
  });
}
