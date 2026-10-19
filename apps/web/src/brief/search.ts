export type BriefView = "today" | "calendar" | "history";
export type BriefSearch = { readonly view?: BriefView; readonly week?: number };

/** A retained week implies history; unknown view names cannot hide the desk. */
export function parseBriefSearch(search: Record<string, unknown>): BriefSearch {
  const candidate = Number(search.week);
  const week = Number.isInteger(candidate) && candidate > 0 ? candidate : undefined;
  const view = search.view === "calendar" || search.view === "history" || search.view === "today" ? search.view : week === undefined ? undefined : "history";
  return { ...(view ? { view } : {}), ...(week === undefined ? {} : { week }) };
}
