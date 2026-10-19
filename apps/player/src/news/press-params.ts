import { COVERAGE_TONES, TOPIC_LABEL, place, type CoverageFilter, type CoverageTone } from "@admin/player-core";
import type { FeedItem } from "@admin/engine";

export const PRESS_VIEWS = ["front", "feed", "desks", "respond", "abroad"] as const;
export type PressView = (typeof PRESS_VIEWS)[number];

/**
 * The press page's address: its view and the filters on the feed, so a desk,
 * a week, a lean, a topic or a government can be linked to and comes back on
 * reload.
 */
export type PressParams = {
  readonly view?: PressView;
  readonly outlet?: string;
  readonly topic?: FeedItem["kind"];
  readonly tone?: CoverageTone;
  readonly week?: number;
  readonly nation?: string;
};

const TOPICS = Object.keys(TOPIC_LABEL) as FeedItem["kind"][];

type Raw = Readonly<Record<string, string | readonly string[] | undefined>>;

function one(raw: Raw, key: string): string | undefined {
  const value = raw[key];
  const text = Array.isArray(value) ? value[0] : value;
  return typeof text === "string" && text !== "" ? text : undefined;
}

/** Reads the router's search params into the press page's keys, dropping anything unrecognized. */
export function pressParams(raw: Raw): PressParams {
  const view = PRESS_VIEWS.find((candidate) => candidate === one(raw, "view"));
  const topic = TOPICS.find((candidate) => candidate === one(raw, "topic"));
  const tone = COVERAGE_TONES.find((candidate) => candidate === one(raw, "tone"));
  const weekText = one(raw, "week");
  const week = weekText !== undefined && /^\d+$/.test(weekText) ? Number(weekText) : undefined;
  const outlet = one(raw, "outlet");
  const nation = one(raw, "nation");
  return {
    ...(view && view !== "front" ? { view } : {}),
    ...(outlet ? { outlet } : {}),
    ...(topic ? { topic } : {}),
    ...(tone ? { tone } : {}),
    ...(week !== undefined ? { week } : {}),
    ...(nation ? { nation } : {}),
  };
}

/** The selector's filter, which is the address read as player-core wants it. The government filter is applied separately. */
export function coverageFilterOf({ outlet, topic, tone, week }: PressParams): CoverageFilter {
  return { ...(outlet ? { outlet } : {}), ...(topic ? { topic } : {}), ...(tone ? { tone } : {}), ...(week !== undefined ? { week } : {}) };
}

export function filterCount(params: PressParams): number {
  return Object.keys(coverageFilterOf(params)).length + (params.nation ? 1 : 0);
}

/** A link to the press page with these params; a filter with no view opens the feed. */
export function pressHref(params: PressParams): string {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined).map(([key, value]): [string, string] => [key, String(value)]);
  const query = new URLSearchParams(entries).toString();
  return `${place.pressOffice()}${query ? `?${query}` : ""}`;
}

/** A filtered destination always opens the feed. */
export function feedHref(filters: Omit<PressParams, "view">): string {
  return pressHref({ view: "feed", ...filters });
}

/** The params as plain strings for the router, with every unset key cleared. */
export function routerParams(params: PressParams): Record<string, string | undefined> {
  return {
    view: params.view,
    outlet: params.outlet,
    topic: params.topic,
    tone: params.tone,
    week: params.week === undefined ? undefined : String(params.week),
    nation: params.nation,
  };
}
