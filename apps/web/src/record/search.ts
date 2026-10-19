import type { EffectActor } from "@admin/engine";
import type { TimelineFilter, TimelineOutcome } from "@admin/player-core";

export const RECORD_VIEWS = ["acts", "promises", "arcs", "standing", "assessments"] as const;
export type RecordView = (typeof RECORD_VIEWS)[number];

const OUTCOMES: readonly TimelineOutcome[] = ["under-way", "in-effect", "helped", "hurt"];
const ACTORS: readonly EffectActor[] = ["player", "world"];

/** What the Record keeps in its address, so Back, reload and a shared link all return to the same list and the same entry. */
export type RecordSearch = {
  readonly view?: RecordView;
  readonly q?: string;
  readonly actor?: EffectActor;
  readonly domain?: string;
  readonly subject?: string;
  readonly outcome?: TimelineOutcome;
  readonly entry?: string;
};

/** A change to the search: a key set to undefined is removed. */
export type RecordPatch = { readonly [K in keyof RecordSearch]?: RecordSearch[K] | undefined };

function text(value: unknown, max: number): string | undefined {
  return typeof value === "string" && value.length > 0 ? value.slice(0, max) : undefined;
}

/** Reads an address's search into the Record's keys, dropping anything it does not recognize and every default. */
export function recordSearch(search: Record<string, unknown>): RecordSearch {
  const view = RECORD_VIEWS.find((candidate) => candidate === search.view);
  const actor = ACTORS.find((candidate) => candidate === search.actor);
  const outcome = OUTCOMES.find((candidate) => candidate === search.outcome);
  const q = text(search.q, 120);
  const domain = text(search.domain, 60);
  const subject = text(search.subject, 120);
  const entry = text(search.entry, 80);
  return {
    ...(view && view !== "acts" ? { view } : {}),
    ...(q ? { q } : {}),
    ...(actor ? { actor } : {}),
    ...(domain ? { domain } : {}),
    ...(subject ? { subject } : {}),
    ...(outcome ? { outcome } : {}),
    ...(entry ? { entry } : {}),
  };
}

/** The selector's filter for what the search holds. */
export function filterOf(search: RecordPatch): TimelineFilter {
  return {
    ...(search.actor ? { actor: search.actor } : {}),
    ...(search.domain ? { domain: search.domain } : {}),
    ...(search.subject ? { subject: search.subject } : {}),
    ...(search.outcome ? { outcome: search.outcome } : {}),
    ...(search.q ? { query: search.q } : {}),
  };
}

export function isFiltered(search: RecordPatch): boolean {
  return Object.keys(filterOf(search)).length > 0;
}

/** A link into the Record: the list at /record, or an entry opened beside it, with the filters carried along. */
export function recordHref(search: RecordSearch): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) if (typeof value === "string") params.set(key, value);
  const query = params.toString();
  return query ? `/record?${query}` : "/record";
}

/** The same search with no entry open, which is the list on a phone and the empty detail beside it on a desktop. */
export function withoutEntry(search: RecordSearch): RecordSearch {
  return Object.fromEntries(Object.entries(search).filter(([key]) => key !== "entry")) as RecordSearch;
}
