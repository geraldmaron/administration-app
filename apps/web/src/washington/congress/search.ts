import { STATE_IDS } from "@admin/world";
import { isCongressView, type CongressView } from "./views";

export const AISLE_LENSES = ["across", "holdouts", "near", "all", "opponents", "slice"] as const;
export type AisleLens = { readonly kind: Exclude<(typeof AISLE_LENSES)[number], "slice"> } | { readonly kind: "slice"; readonly at: number };
export type MemberSort = "name" | "seat" | "state" | "party" | "class";
export type CongressSearch = {
  readonly view?: CongressView;
  readonly state?: string;
  readonly seat?: string;
  readonly map?: "house" | "senate" | "delegation-warmth";
  readonly color?: "party" | "vote";
  readonly houseLens?: (typeof AISLE_LENSES)[number];
  readonly houseAt?: number;
  readonly senateLens?: (typeof AISLE_LENSES)[number];
  readonly senateAt?: number;
  readonly chamber?: "house" | "senate";
  readonly q?: string;
  readonly sort?: MemberSort;
  readonly direction?: "ascending" | "descending";
};
export type CongressChange = (search: CongressSearch) => Promise<void> | void;
const oneOf = <T extends string>(choices: readonly T[], value: unknown): T | undefined => typeof value === "string" && choices.includes(value as T) ? value as T : undefined;
const position = (value: unknown) => value !== undefined && value !== "" && Number.isFinite(Number(value)) && Number(value) >= -1 && Number(value) <= 1 ? Number(value) : undefined;

/** Only known filters survive a bookmark; dataset membership is checked by the view. */
export function parseCongressSearch(raw: Record<string, unknown>): CongressSearch {
  const search: CongressSearch = {
    view: isCongressView(raw.view) ? raw.view : undefined,
    state: oneOf(STATE_IDS, raw.state),
    seat: typeof raw.seat === "string" && /^[a-zA-Z0-9:_-]{1,48}$/.test(raw.seat) ? raw.seat : undefined,
    map: oneOf(["house", "senate", "delegation-warmth"], raw.map),
    color: oneOf(["party", "vote"], raw.color),
    houseLens: oneOf(AISLE_LENSES, raw.houseLens), houseAt: position(raw.houseAt),
    senateLens: oneOf(AISLE_LENSES, raw.senateLens), senateAt: position(raw.senateAt),
    chamber: oneOf(["house", "senate"], raw.chamber),
    q: typeof raw.q === "string" && raw.q.length > 0 ? raw.q.slice(0, 120) : undefined,
    sort: oneOf(["name", "seat", "state", "party", "class"], raw.sort),
    direction: oneOf(["ascending", "descending"], raw.direction),
  };
  return Object.fromEntries(Object.entries(search).filter(([, value]) => value !== undefined)) as CongressSearch;
}

export function aisleFromSearch(search: CongressSearch, chamber: "house" | "senate"): AisleLens | undefined {
  const kind = chamber === "house" ? search.houseLens : search.senateLens;
  const at = chamber === "house" ? search.houseAt : search.senateAt;
  return kind === "slice" ? at === undefined ? undefined : { kind, at } : kind ? { kind } : undefined;
}

export function withAisle(search: CongressSearch, chamber: "house" | "senate", lens: AisleLens): CongressSearch {
  return parseCongressSearch({ ...search, [`${chamber}Lens`]: lens.kind, [`${chamber}At`]: lens.kind === "slice" ? lens.at : undefined });
}
