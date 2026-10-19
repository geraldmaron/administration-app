export const LEGACY_VIEWS = ["comparison", "timeline", "record"] as const;
export type LegacyView = (typeof LEGACY_VIEWS)[number];

export type LegacySearch = { readonly view?: LegacyView };

export function legacySearch(search: Record<string, unknown>): LegacySearch {
  const view = LEGACY_VIEWS.find((candidate) => candidate === search.view);
  return view && view !== "comparison" ? { view } : {};
}
