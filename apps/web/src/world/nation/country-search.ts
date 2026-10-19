import { actHref, place, type ActConfig } from "@admin/player-core";

export const COUNTRY_VIEWS = ["overview", "diplomacy", "economy", "security", "intelligence", "activity"] as const;
export type CountryView = (typeof COUNTRY_VIEWS)[number];

export type CountrySearch = { readonly view?: CountryView; readonly sector?: string };

export function isCountryView(value: unknown): value is CountryView {
  return typeof value === "string" && (COUNTRY_VIEWS as readonly string[]).includes(value);
}

/** The country file's address: the view when it is not the first, and the goods the trade view has picked. */
export function countrySearch(search: Record<string, unknown>): CountrySearch {
  return {
    ...(isCountryView(search.view) && search.view !== "overview" ? { view: search.view } : {}),
    ...(typeof search.sector === "string" && search.sector.length > 0 && search.sector.length <= 80 ? { sector: search.sector } : {}),
  };
}

/** Return context is presentation-only and can only address this action's government. */
export function countryReturnSearch(search: Record<string, unknown>): CountrySearch {
  return countrySearch({ view: search.returnView, sector: search.returnSector });
}

export function countryReturnQuery(context: CountrySearch): Record<string, string> {
  const origin = countrySearch(context);
  return { ...(origin.view ? { returnView: origin.view } : {}), ...(origin.sector ? { returnSector: origin.sector } : {}) };
}

/** Preserve origin independently of action terms: changing tariff goods never changes the return selection. */
export function countryActHref(nation: string, config: ActConfig, context: CountrySearch): string {
  const href = actHref(nation, config);
  const query = new URLSearchParams(countryReturnQuery(context)).toString();
  return query ? `${href}${href.includes("?") ? "&" : "?"}${query}` : href;
}

export function countryReturnHref(nation: string, context: CountrySearch): string {
  const query = new URLSearchParams(countrySearch(context)).toString();
  return `${place.country(nation)}${query ? `?${query}` : ""}`;
}
