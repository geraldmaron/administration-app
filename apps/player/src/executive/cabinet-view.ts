import type { Campaign } from "@admin/engine";
import { chairRead, nodeNeedsAttention, type ChairRead, type OverviewOffice, type OverviewSection } from "@admin/player-core";

export type ExecutiveView = "offices" | "delivery" | "services" | "roster";
export type StaffingFilter = "confirmed" | "acting" | "vacant";
export type GroupBy = "staffing" | "assessment";
export type OrderBy = "name" | "delivery";

/** How the Executive screen is set out; kept in the address so Back and reload keep it. Never campaign state. */
export type ExecutiveSearch = {
  readonly scope?: string;
  readonly office?: string;
  readonly view?: Exclude<ExecutiveView, "offices">;
  readonly need?: true;
  readonly q?: string;
  readonly staffing?: StaffingFilter;
  readonly group?: GroupBy;
  readonly order?: OrderBy;
};

export type CabinetGroup = { readonly key: string; readonly title: string; readonly offices: readonly OverviewOffice[] };

type Raw = Readonly<Record<string, unknown>>;

const one = (value: unknown): unknown => (Array.isArray(value) ? value[0] : value);
const pick = <T extends string>(value: unknown, allowed: readonly T[]): T | undefined => allowed.find((entry) => entry === one(value));

/** The address's words read back as the screen's settings, refusing anything the screen does not offer. */
export function executiveSearch(value: Raw): ExecutiveSearch {
  const raw = one(value.q);
  const q = typeof raw === "string" ? raw.slice(0, 120) : "";
  const scope = one(value.scope);
  const office = one(value.office);
  const need = one(value.need);
  const view = pick(value.view, ["delivery", "services", "roster"] as const);
  const staffing = pick(value.staffing, ["confirmed", "acting", "vacant"] as const);
  const group = pick(value.group, ["staffing", "assessment"] as const);
  const order = pick(value.order, ["name", "delivery"] as const);
  return {
    ...(typeof scope === "string" && scope ? { scope } : {}),
    ...(need === true || need === "true" ? { need: true as const } : {}),
    ...(q.trim() ? { q } : {}),
    ...(typeof office === "string" && office.length > 0 && office.length < 160 ? { office } : {}),
    ...(view ? { view } : {}),
    ...(staffing ? { staffing } : {}),
    ...(group ? { group } : {}),
    ...(order ? { order } : {}),
  };
}

/** The settings as address parameters: every key the screen owns, empty where unset, so a cleared setting leaves the address. */
export function searchParams(search: ExecutiveSearch): Record<string, string | undefined> {
  return {
    scope: search.scope,
    office: search.office,
    view: search.view,
    need: search.need ? "true" : undefined,
    q: search.q,
    staffing: search.staffing,
    group: search.group,
    order: search.order,
  };
}

export function officeRead(campaign: Campaign, office: OverviewOffice): ChairRead | undefined {
  const person = office.node.holder ? campaign.people[office.node.holder]?.base : undefined;
  return person ? chairRead(person) : undefined;
}

export const needsYou = (office: OverviewOffice): boolean => nodeNeedsAttention(office.node) || office.agenciesNeedingYou > 0;

const STAFFING_GROUP: Readonly<Record<StaffingFilter, string>> = { acting: "Led by a stand-in", confirmed: "Led by a confirmed leader", vacant: "Empty" };

function matches(office: OverviewOffice, search: ExecutiveSearch, query: string | undefined): boolean {
  if (search.need && !needsYou(office)) return false;
  if (search.staffing && office.node.staffing !== search.staffing) return false;
  return !query || `${office.node.name} ${office.node.title} ${office.node.holderName ?? ""}`.toLocaleLowerCase().includes(query);
}

function orderOf(search: ExecutiveSearch) {
  return (a: OverviewOffice, b: OverviewOffice): number => {
    const difference = search.order === "delivery" ? (b.delivery?.quality ?? -1) - (a.delivery?.quality ?? -1) : search.order === "name" ? 0 : Number(needsYou(b)) - Number(needsYou(a));
    return difference || a.node.name.localeCompare(b.node.name);
  };
}

/** The offices in view, grouped by role, staffing or the holder's assessment, in the chosen order. */
export function cabinetGroups(campaign: Campaign, sections: readonly OverviewSection[], search: ExecutiveSearch): readonly CabinetGroup[] {
  const query = search.q?.trim().toLocaleLowerCase();
  const keyed = sections.flatMap((section) =>
    section.offices
      .filter((office) => matches(office, search, query))
      .map((office) => {
        const title = search.group === "staffing" ? STAFFING_GROUP[office.node.staffing] : search.group === "assessment" ? (officeRead(campaign, office)?.word ?? "Nobody to rate") : section.title;
        return { key: search.group ? title : section.key, title, office };
      }),
  );
  const keys = [...new Set(keyed.map((entry) => entry.key))];
  return keys.map((key) => {
    const members = keyed.filter((entry) => entry.key === key);
    return { key, title: members[0]!.title, offices: [...members.map((entry) => entry.office)].sort(orderOf(search)) };
  });
}

/** The office the inspector opens on: the one named, else the first that needs the President, else the first with a delivery reading. */
export function selectedOffice(groups: readonly CabinetGroup[], office: string | undefined): OverviewOffice | undefined {
  const offices = groups.flatMap((group) => group.offices);
  return offices.find((entry) => entry.node.office === office) ?? offices.find((entry) => nodeNeedsAttention(entry.node)) ?? offices.find((entry) => entry.delivery) ?? offices[0];
}
