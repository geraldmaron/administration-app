import { COVERAGE_TONES, TOPIC_LABEL, place, type CoverageFilter, type CoverageTone } from "@admin/player-core";
import type { FeedItem } from "@admin/engine";

export const PRESS_VIEWS = ["coverage", "analysis", "response", "abroad"] as const;
export type PressView = (typeof PRESS_VIEWS)[number];

/** The press page's address: the filters on the coverage feed, so a desk, a week or a lean can be linked to. */
export type PressSearch = {
  readonly view?: PressView;
  readonly outlet?: string;
  readonly topic?: FeedItem["kind"];
  readonly tone?: CoverageTone;
  readonly week?: number;
};

const TOPICS = Object.keys(TOPIC_LABEL) as FeedItem["kind"][];

export function pressSearch(search: Record<string, unknown>): PressSearch {
  const view = PRESS_VIEWS.find((candidate) => candidate === search.view);
  const topic = TOPICS.find((candidate) => candidate === search["topic"]);
  const tone = COVERAGE_TONES.find((candidate) => candidate === search["tone"]);
  const week = typeof search["week"] === "number" && Number.isInteger(search["week"]) ? search["week"] : undefined;
  const outlet = typeof search["outlet"] === "string" && search["outlet"] !== "" ? search["outlet"] : undefined;
  return { ...(view ? { view } : {}), ...(outlet ? { outlet } : {}), ...(topic ? { topic } : {}), ...(tone ? { tone } : {}), ...(week !== undefined ? { week } : {}) };
}

/** The feed's filter, which is the address read as the selector wants it. */
export const filterOf = ({ outlet, topic, tone, week }: PressSearch): CoverageFilter => ({ ...(outlet ? { outlet } : {}), ...(topic ? { topic } : {}), ...(tone ? { tone } : {}), ...(week !== undefined ? { week } : {}) });

export const isFiltered = (search: PressSearch): boolean => Object.keys(filterOf(search)).length > 0;

/** Old section links remain valid when their content moves into focused views. */
export function pressViewForSection(section: string): PressView {
  const id = section.replace(/^#/, "");
  return id === "press-desks" || id === "press-weeks" ? "analysis" : id === "press-respond" || id === "press-stories" ? "response" : id === "press-abroad" ? "abroad" : "coverage";
}

export function pressHref(search: PressSearch, section?: string): string {
  const params = new URLSearchParams(Object.entries(search).filter(([, value]) => value !== undefined).map(([key, value]) => [key, String(value)]));
  const query = params.toString();
  return `${place.pressOffice()}${query ? `?${query}` : ""}${section ? `#${section}` : ""}`;
}

/** A filtered destination always opens the coverage workspace. */
export function feedHref(search: PressSearch): string {
  const { view: _view, ...filters } = search;
  return pressHref(filters, "press-feed");
}
