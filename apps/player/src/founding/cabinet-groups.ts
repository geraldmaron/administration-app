import type { IconName } from "@admin/ui";

// The Cabinet laid out by what each department does rather than in order of
// rank, so a President looking for "who runs the money" finds it among its
// neighbors. Any chair the table does not know lands in its own group at the
// end rather than vanishing from the screen.

export type CabinetGroupKey = "security" | "economy" | "home" | "other";

export type CabinetGroup = {
  readonly key: CabinetGroupKey;
  readonly title: string;
  readonly lead: string;
  readonly icon: IconName;
  readonly roles: readonly string[];
};

const GROUPS: readonly Omit<CabinetGroup, "roles">[] = [
  { key: "security", title: "Safety and the world", lead: "Diplomacy, the military, spying, borders and the courts.", icon: "shield" },
  { key: "economy", title: "Money and jobs", lead: "Taxes, trade, work, farms and energy.", icon: "budget" },
  { key: "home", title: "Services at home", lead: "Health, housing, schools, roads, veterans and public land.", icon: "building" },
  { key: "other", title: "Other departments", lead: "Departments the groups above don't cover.", icon: "folder" },
];

const GROUP_OF: Readonly<Record<string, CabinetGroupKey>> = {
  "role-foreign-minister": "security",
  "role-defense-minister": "security",
  "role-homeland-secretary": "security",
  "role-intelligence-director": "security",
  "role-attorney-general": "security",
  "role-treasury-minister": "economy",
  "role-commerce-secretary": "economy",
  "role-labor-secretary": "economy",
  "role-agriculture-secretary": "economy",
  "role-energy-secretary": "economy",
  "role-interior-minister": "home",
  "role-health-secretary": "home",
  "role-housing-secretary": "home",
  "role-transportation-secretary": "home",
  "role-education-secretary": "home",
  "role-veterans-secretary": "home",
};

/** The chairs in their groups, each group in the charter's own order, empty groups left out. */
export function cabinetGroups(roles: readonly string[]): readonly CabinetGroup[] {
  return GROUPS.map((group) => ({ ...group, roles: roles.filter((role) => (GROUP_OF[role] ?? "other") === group.key) })).filter((group) => group.roles.length > 0);
}
