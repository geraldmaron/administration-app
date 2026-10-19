import { WORLD_REGIONS, actHref, isWorldReading, place, type ActConfig, type WorldReadingId, type WorldRegionId } from "@admin/player-core";

// What each World address may carry in its query, read defensively: an
// address is typed, pasted and bookmarked, so anything unknown is dropped
// rather than trusted. The parsers are the legacy routes' own rules.

export type Query = Readonly<Record<string, string | readonly string[] | undefined>>;

/** One value of a query key; a repeated key reads as its first value. */
export function one(query: Query, key: string): string | undefined {
  const value = query[key];
  return Array.isArray(value) ? value[0] : (value as string | undefined);
}

export const COUNTRY_VIEWS = ["overview", "diplomacy", "economy", "security", "intelligence", "activity"] as const;
export type CountryView = (typeof COUNTRY_VIEWS)[number];

export const COUNTRY_VIEW_LABELS: Readonly<Record<CountryView, string>> = {
  overview: "Overview",
  diplomacy: "Diplomacy",
  economy: "Economy",
  security: "Security",
  intelligence: "Intel",
  activity: "Activity",
};

export function isCountryView(value: unknown): value is CountryView {
  return typeof value === "string" && (COUNTRY_VIEWS as readonly string[]).includes(value);
}

export type CountrySearch = { readonly view?: CountryView; readonly sector?: string };

/** The country file's address: the view when it is not the first, and the goods the trade view has picked. */
export function countrySearch(search: Readonly<Record<string, unknown>>): CountrySearch {
  return {
    ...(isCountryView(search.view) && search.view !== "overview" ? { view: search.view } : {}),
    ...(typeof search.sector === "string" && search.sector.length > 0 && search.sector.length <= 80 ? { sector: search.sector } : {}),
  };
}

/** Return context is presentation-only and can only address this action's government. */
export function countryReturnSearch(search: Readonly<Record<string, unknown>>): CountrySearch {
  return countrySearch({ view: search.returnView, sector: search.returnSector });
}

export function countryReturnQuery(context: CountrySearch): Record<string, string> {
  const origin = countrySearch(context);
  return { ...(origin.view ? { returnView: origin.view } : {}), ...(origin.sector ? { returnSector: origin.sector } : {}) };
}

function withQuery(href: string, query: Readonly<Record<string, string>>): string {
  const text = Object.entries(query)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
  return text ? `${href}${href.includes("?") ? "&" : "?"}${text}` : href;
}

/** Preserve origin independently of action terms: changing tariff goods never changes the return selection. */
export function countryActHref(nation: string, config: ActConfig, context: CountrySearch): string {
  return withQuery(actHref(nation, config), countryReturnQuery(context));
}

export function countryReturnHref(nation: string, context: CountrySearch): string {
  const origin = countrySearch(context);
  return withQuery(place.country(nation), { ...(origin.view ? { view: origin.view } : {}), ...(origin.sector ? { sector: origin.sector } : {}) });
}

export type WorldSearch = { readonly reading?: WorldReadingId; readonly region?: WorldRegionId; readonly q?: string };

/** Old links named the map's color as `lens`; its forces and trade colors keep their meaning. */
const FROM_LENS: Readonly<Record<string, WorldReadingId>> = { forces: "forces", trade: "trade" };

export function worldSearch(search: Readonly<Record<string, unknown>>): WorldSearch {
  const reading = isWorldReading(search.reading) ? search.reading : typeof search.lens === "string" ? FROM_LENS[search.lens] : undefined;
  return {
    ...(reading && reading !== "standing" ? { reading } : {}),
    ...(typeof search.region === "string" && WORLD_REGIONS.includes(search.region as WorldRegionId) ? { region: search.region as WorldRegionId } : {}),
    ...(typeof search.q === "string" && search.q.length > 0 ? { q: search.q.slice(0, 120) } : {}),
  };
}

/** The selected coalition member stays attached to its body when returning from an action. */
export function orgSearch(search: Readonly<Record<string, unknown>>): { readonly member?: string } {
  return typeof search.member === "string" && /^[A-Z]{3}$/.test(search.member) ? { member: search.member } : {};
}

/** A dataset region id as a reader says it: "region-east-asia" is East Asia. */
export function regionName(region: string): string {
  return region
    .replace(/^region-/, "")
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** A query as a flat record of its first values, for the parsers above. */
export function flatQuery(query: Query): Readonly<Record<string, string>> {
  return Object.fromEntries(Object.keys(query).flatMap((key) => {
    const value = one(query, key);
    return value === undefined ? [] : [[key, value]];
  }));
}
