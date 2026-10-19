import { COHORT_AXIS, CohortAxisId, CohortId, StateId } from "@admin/world";
import { CONDITION_KINDS, type ConditionKind, type UsParty } from "@admin/engine";
import { isStageLens, type StageLensId } from "./stage-lens";

// The Nation screen's presentation context, carried in the address so Back,
// reload and a shared link keep it. Only validated values survive; nothing
// here is campaign state.

/** Views from before the page was one scroll; an old link still lands on the matching section. */
export const NATION_VIEWS = ["opinion", "groups", "states"] as const;
export type NationViewId = (typeof NATION_VIEWS)[number];
export const isNationView = (value: unknown): value is NationViewId => NATION_VIEWS.some((view) => view === value);

export const STATE_SORT_KEYS = ["name", "governor", "relationship", "needs", "reading", "change", "flags"] as const;
export type StateSortKey = (typeof STATE_SORT_KEYS)[number];
export const STATE_FOCI = ["needs", "against", "declared"] as const;
export type StateFocus = (typeof STATE_FOCI)[number];
export type Direction = "ascending" | "descending";
export type GroupSortKey = "name" | "approval" | CohortId;

export type NationSearch = {
  readonly view?: NationViewId;
  readonly lens?: StageLensId;
  readonly group?: CohortAxisId;
  readonly state?: StateId;
  /** More states chosen with it, for one act across several; the state above is the one in focus. */
  readonly also?: readonly StateId[];
  /** The matter of the chosen state whose acts the panel shows; only with a state. */
  readonly cause?: ConditionKind;
  readonly query?: string;
  readonly party?: UsParty;
  readonly flagged?: true;
  readonly focus?: StateFocus;
  readonly sort?: StateSortKey;
  readonly direction?: Direction;
  readonly groupSort?: GroupSortKey;
  readonly groupDirection?: Direction;
};

export type NationPatch = { readonly [K in keyof NationSearch]?: NationSearch[K] | undefined };

const one = (value: unknown): unknown => (Array.isArray(value) ? value[0] : value);

/** The other chosen states, each validated, never repeating the one in focus; only with a state in focus. */
function alsoOf(raw: unknown, focus: StateId | undefined): { readonly also?: readonly StateId[] } {
  if (!focus || typeof raw !== "string") return {};
  const ids = [...new Set(raw.split(",").map((part) => StateId.safeParse(part.trim().toUpperCase())).flatMap((parsed) => (parsed.success && parsed.data !== focus ? [parsed.data] : [])))];
  return ids.length > 0 ? { also: ids.slice(0, 60) } : {};
}

/** Only validated presentation context is retained; defaults are left out of the address. */
export function nationSearch(raw: Readonly<Record<string, unknown>>): NationSearch {
  const search = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, one(value)]));
  const group = CohortAxisId.safeParse(search.group);
  const state = StateId.safeParse(typeof search.state === "string" ? search.state.toUpperCase() : search.state);
  const cohortSort = CohortId.safeParse(search.groupSort);
  const groupSort = search.groupSort === "name" || search.groupSort === "approval" ? search.groupSort : cohortSort.success && COHORT_AXIS[cohortSort.data] === (group.success ? group.data : "place") ? cohortSort.data : undefined;
  const sort = STATE_SORT_KEYS.find((key) => key !== "name" && key === search.sort);
  return {
    ...(isNationView(search.view) && search.view !== "opinion" ? { view: search.view } : {}),
    ...(isStageLens(search.lens) && search.lens !== "approval" ? { lens: search.lens } : {}),
    ...(group.success ? { group: group.data } : {}),
    ...(state.success ? { state: state.data } : {}),
    ...alsoOf(search.also, state.success ? state.data : undefined),
    ...(state.success && CONDITION_KINDS.some((kind) => kind === search.cause) ? { cause: search.cause as ConditionKind } : {}),
    ...(typeof search.query === "string" && search.query.length > 0 ? { query: search.query.slice(0, 120) } : {}),
    ...(search.party === "democrat" || search.party === "republican" || search.party === "independent" ? { party: search.party } : {}),
    ...(search.flagged === true || search.flagged === "true" ? { flagged: true as const } : {}),
    ...(STATE_FOCI.find((focus) => focus === search.focus) ? { focus: search.focus as StateFocus } : {}),
    ...(sort ? { sort } : {}),
    ...(search.direction === "descending" ? { direction: "descending" as const } : {}),
    ...(groupSort ? { groupSort } : {}),
    ...(search.groupDirection === "ascending" ? { groupDirection: "ascending" as const } : {}),
  };
}

/** The address parameters for a search, every default cleared so the router drops it. */
export function nationParams(search: NationSearch): Readonly<Record<string, string | undefined>> {
  return {
    view: search.view,
    lens: search.lens,
    group: search.group,
    state: search.state,
    also: search.state && search.also?.length ? search.also.join(",") : undefined,
    cause: search.state ? search.cause : undefined,
    query: search.query,
    party: search.party,
    flagged: search.flagged ? "true" : undefined,
    focus: search.focus,
    sort: search.sort,
    direction: search.direction,
    groupSort: search.groupSort,
    groupDirection: search.groupDirection,
  };
}
