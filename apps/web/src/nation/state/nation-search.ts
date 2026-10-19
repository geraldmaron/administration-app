import { CohortAxisId, CohortId, COHORT_AXIS, StateId } from "@admin/world";
import type { UsParty } from "@admin/engine";
import { isNationLens, type NationLensId } from "@admin/player-core";
import type { SortDirection } from "@admin/ui-web";
import { STATE_SORT_KEYS, type StateSortKey } from "./states-table";

const NATION_VIEWS = ["opinion", "groups", "states"] as const;
export type NationViewId = (typeof NATION_VIEWS)[number];
export const isNationView = (value: unknown): value is NationViewId => NATION_VIEWS.some((view) => view === value);
export type GroupSortKey = "name" | "approval" | CohortId;
export type NationSearch = {
  readonly view?: NationViewId;
  readonly lens?: NationLensId;
  readonly group?: CohortAxisId;
  readonly state?: StateId;
  readonly query?: string;
  readonly party?: UsParty;
  readonly flagged?: true;
  readonly sort?: StateSortKey;
  readonly direction?: SortDirection;
  readonly groupSort?: GroupSortKey;
  readonly groupDirection?: SortDirection;
};
export type NationPatch = { readonly [K in keyof NationSearch]?: NationSearch[K] | undefined };

/** Only validated presentation context is retained; no campaign state is stored in the address. */
export function nationSearch(search: Record<string, unknown>): NationSearch {
  const group = CohortAxisId.safeParse(search.group);
  const state = StateId.safeParse(typeof search.state === "string" ? search.state.toUpperCase() : search.state);
  const cohortSort = CohortId.safeParse(search.groupSort);
  const groupSort = search.groupSort === "name" ? "name" : cohortSort.success && COHORT_AXIS[cohortSort.data] === (group.success ? group.data : "place") ? cohortSort.data : undefined;
  const sort = STATE_SORT_KEYS.find((key) => key !== "name" && key === search.sort);
  return {
    ...(isNationView(search.view) && search.view !== "opinion" ? { view: search.view } : {}),
    ...(isNationLens(search.lens) && search.lens !== "approval" ? { lens: search.lens } : {}),
    ...(group.success ? { group: group.data } : {}),
    ...(state.success ? { state: state.data } : {}),
    ...(typeof search.query === "string" && search.query.length > 0 ? { query: search.query.slice(0, 120) } : {}),
    ...(search.party === "democrat" || search.party === "republican" || search.party === "independent" ? { party: search.party } : {}),
    ...(search.flagged === true || search.flagged === "true" ? { flagged: true as const } : {}),
    ...(sort ? { sort } : {}),
    ...(search.direction === "descending" ? { direction: "descending" as const } : {}),
    ...(groupSort ? { groupSort } : {}),
    ...(search.groupDirection === "ascending" ? { groupDirection: "ascending" as const } : {}),
  };
}
