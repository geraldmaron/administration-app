import type { EffectActor } from "@admin/engine";
import type { TimelineFilter, TimelineOutcome } from "@admin/player-core";

export const RECORD_VIEWS = ["acts", "promises", "arcs", "standing", "assessments"] as const;
export type RecordView = (typeof RECORD_VIEWS)[number];

const OUTCOMES: readonly TimelineOutcome[] = ["under-way", "in-effect", "helped", "hurt"];
const ACTORS: readonly EffectActor[] = ["player", "world"];

/** What the Record keeps in its address, so Back, reload and a shared link all return to the same list and the same entry. */
export type RecordParams = {
  readonly view?: RecordView;
  readonly q?: string;
  readonly actor?: EffectActor;
  readonly domain?: string;
  readonly subject?: string;
  readonly outcome?: TimelineOutcome;
  readonly entry?: string;
};

/** A change to the params: a key set to undefined is removed. */
export type RecordPatch = { readonly [K in keyof RecordParams]?: RecordParams[K] | undefined };

type Raw = Readonly<Record<string, string | readonly string[] | undefined>>;

function text(raw: Raw, key: string, max: number): string | undefined {
  const value = raw[key];
  const first = Array.isArray(value) ? value[0] : value;
  return typeof first === "string" && first.length > 0 ? first.slice(0, max) : undefined;
}

/** Reads the router's params into the Record's keys, dropping anything it does not recognize and every default. */
export function recordParams(raw: Raw): RecordParams {
  const view = RECORD_VIEWS.find((candidate) => candidate === text(raw, "view", 20));
  const actor = ACTORS.find((candidate) => candidate === text(raw, "actor", 20));
  const outcome = OUTCOMES.find((candidate) => candidate === text(raw, "outcome", 20));
  const q = text(raw, "q", 120);
  const domain = text(raw, "domain", 60);
  const subject = text(raw, "subject", 120);
  const entry = text(raw, "entry", 80);
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

/** The selector's filter for what the params hold. */
export function filterOf(params: RecordPatch): TimelineFilter {
  return {
    ...(params.actor ? { actor: params.actor } : {}),
    ...(params.domain ? { domain: params.domain } : {}),
    ...(params.subject ? { subject: params.subject } : {}),
    ...(params.outcome ? { outcome: params.outcome } : {}),
    ...(params.q ? { query: params.q } : {}),
  };
}

export function isFiltered(params: RecordPatch): boolean {
  return Object.keys(filterOf(params)).length > 0;
}

/** Applies a patch, dropping every key it clears. */
export function patched(params: RecordParams, patch: RecordPatch): RecordParams {
  return recordParams({ ...params, ...patch } as Raw);
}

/** A link into the Record: the list at /record, or an entry opened beside it, with the filters carried along. */
export function recordHref(params: RecordParams): string {
  const query = new URLSearchParams(Object.entries(params).filter((pair): pair is [string, string] => typeof pair[1] === "string")).toString();
  return query ? `/record?${query}` : "/record";
}

/** Every key for the router, unset ones cleared, so a patch replaces what the address held. */
export function routerParams(params: RecordParams): Record<string, string | undefined> {
  return { view: params.view, q: params.q, actor: params.actor, domain: params.domain, subject: params.subject, outcome: params.outcome, entry: params.entry };
}

/** What the filters keep, said in words beside them. */
export function matchCount(matching: number, total: number, filtered: boolean): string {
  if (total === 0) return "No entries yet";
  return filtered ? `${matching.toLocaleString("en-US")} of ${total.toLocaleString("en-US")} entries match` : `${total.toLocaleString("en-US")} ${total === 1 ? "entry" : "entries"}`;
}
