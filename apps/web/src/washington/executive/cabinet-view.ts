import type { Campaign } from "@admin/engine";
import { chairRead, nodeNeedsAttention, type OverviewOffice, type OverviewSection } from "@admin/player-core";

export type ExecutiveSearch = { readonly scope?: string; readonly office?: string; readonly view?: "delivery" | "services" | "roster"; readonly need?: true; readonly q?: string; readonly staffing?: "confirmed" | "acting" | "vacant"; readonly group?: "staffing" | "assessment"; readonly order?: "name" | "delivery" };
export type CabinetGroup = { readonly key: string; readonly title: string; readonly offices: readonly OverviewOffice[] };

/** Presentation controls survive dossier visits without becoming campaign state. */
export function executiveSearch(value: Record<string, unknown>): ExecutiveSearch {
  const q = typeof value.q === "string" ? value.q.slice(0, 120) : "";
  return {
    ...(typeof value.scope === "string" && value.scope ? { scope: value.scope } : {}),
    ...(value.need === true || value.need === "true" ? { need: true as const } : {}),
    ...(q.trim() ? { q } : {}),
    ...(typeof value.office === "string" && value.office.length < 160 ? { office: value.office } : {}),
    ...(value.view === "delivery" || value.view === "services" || value.view === "roster" ? { view: value.view } : {}),
    ...(value.staffing === "acting" || value.staffing === "confirmed" || value.staffing === "vacant" ? { staffing: value.staffing } : {}),
    ...(value.group === "staffing" || value.group === "assessment" ? { group: value.group } : {}),
    ...(value.order === "name" || value.order === "delivery" ? { order: value.order } : {}),
  };
}

export function officeRead(campaign: Campaign, office: OverviewOffice) {
  const person = office.node.holder ? campaign.people[office.node.holder]?.base : undefined;
  return person ? chairRead(person) : undefined;
}

const needsYou = (office: OverviewOffice) => nodeNeedsAttention(office.node) || office.agenciesNeedingYou > 0;
const STAFFING = { acting: "Acting officers", confirmed: "Confirmed chairs", vacant: "Vacant chairs" } as const;

export function cabinetGroups(campaign: Campaign, sections: readonly OverviewSection[], search: ExecutiveSearch): readonly CabinetGroup[] {
  const groups = new Map<string, { title: string; offices: OverviewOffice[] }>();
  const query = search.q?.trim().toLocaleLowerCase();
  for (const section of sections) for (const office of section.offices) {
    if (search.need && !needsYou(office)) continue;
    if (search.staffing && office.node.staffing !== search.staffing) continue;
    if (query && !`${office.node.name} ${office.node.title} ${office.node.holderName ?? ""}`.toLocaleLowerCase().includes(query)) continue;
    const title = search.group === "staffing" ? STAFFING[office.node.staffing] : search.group === "assessment" ? officeRead(campaign, office)?.word ?? "No officer assessed" : section.title;
    const key = search.group ? title : section.key;
    if (!groups.has(key)) groups.set(key, { title, offices: [] });
    groups.get(key)!.offices.push(office);
  }
  const order = (a: OverviewOffice, b: OverviewOffice) => {
    const difference = search.order === "delivery" ? (b.delivery?.quality ?? -1) - (a.delivery?.quality ?? -1) : search.order === "name" ? 0 : Number(needsYou(b)) - Number(needsYou(a));
    return difference || a.node.name.localeCompare(b.node.name);
  };
  return [...groups].map(([key, group]) => ({ key, title: group.title, offices: group.offices.sort(order) }));
}
