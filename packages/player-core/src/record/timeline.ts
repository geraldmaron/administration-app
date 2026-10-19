import { compareDates, type ActionRecord, type Campaign, type EffectActor } from "@admin/engine";
import { ledgerMoves, recordRowOf, type ReadingMove, type RecordRow } from "./record-entry";
import { eventPlace, type EventPlace } from "./event-place";
import { foregroundLedger } from "./foreground";

// The Record's timeline as a screen filters it: each entry with the domain it
// belongs to, the place it happened and how it came out, all read off the
// causal stamp `apply()` wrote. Nothing here is searched for in prose except
// the player's own search words.

export type TimelineOutcome = "under-way" | "in-effect" | "helped" | "hurt";

export const OUTCOME_WORDS: Readonly<Record<TimelineOutcome, string>> = {
  "under-way": "Under way",
  "in-effect": "In effect",
  helped: "Raised approval",
  hurt: "Lowered approval",
};

const DOMAIN_OF_SYSTEM: Readonly<Record<string, string>> = {
  trade: "Economy",
  markets: "Economy",
  macro: "Economy",
  fiscal: "Economy",
  impacts: "Economy",
  policy: "Economy",
  states: "Economy",
  congress: "Congress and law",
  treaties: "Congress and law",
  nominations: "Congress and law",
  cases: "Congress and law",
  docket: "Congress and law",
  judiciary: "Congress and law",
  orders: "Congress and law",
  platform: "Congress and law",
  cabinet: "Cabinet and agencies",
  institutions: "Cabinet and agencies",
  "war-powers": "Security",
  "combatant-commands": "Security",
  "covert-action": "Security",
  intelligence: "Security",
  alliances: "Foreign affairs",
  statecraft: "Foreign affairs",
  "foreign-politics": "Foreign affairs",
  engagement: "Foreign affairs",
  "world-events": "Foreign affairs",
  compacts: "Foreign affairs",
  conversation: "Foreign affairs",
  press: "Press and public",
  opinion: "Press and public",
  leak: "Press and public",
  conditions: "Emergencies",
  emergency: "Emergencies",
  response: "Emergencies",
  assistance: "Emergencies",
  recession: "Economy",
  "fiscal-crisis": "Economy",
  "inflation-shock": "Economy",
  "housing-crunch": "Economy",
  "energy-shortage": "Economy",
  economic: "Foreign affairs",
  diplomatic: "Foreign affairs",
  loyalty: "Cabinet and agencies",
};

const OTHER_DOMAIN = "Other";

export type TimelineRow = RecordRow & {
  readonly domains: readonly string[];
  readonly outcomes: readonly TimelineOutcome[];
  readonly subject?: NonNullable<EventPlace["subject"]>;
  readonly storySubjects?: readonly { readonly id: string; readonly label: string }[];
  readonly place: EventPlace;
};

export type TimelineFilter = {
  readonly actor?: EffectActor;
  readonly domain?: string;
  readonly subject?: string;
  readonly outcome?: TimelineOutcome;
  /** Words the entry's headline, description, domain or place must all contain. */
  readonly query?: string;
};

export type TimelineOption<T extends string = string> = { readonly value: T; readonly label: string; readonly count: number };

export type TimelineReading = {
  /** Newest first, after the filters. */
  readonly rows: readonly TimelineRow[];
  /** How many entries the Record holds before any filter. */
  readonly total: number;
  readonly domains: readonly TimelineOption[];
  readonly subjects: readonly TimelineOption[];
  readonly outcomes: readonly TimelineOption<TimelineOutcome>[];
};

function domainsOf(entry: ActionRecord): readonly string[] {
  // A system the table does not name (a hazard's kind, a statecraft instrument) rides beside one it does and adds nothing of its own.
  const found = new Set((entry.causal?.systems ?? []).flatMap((system) => DOMAIN_OF_SYSTEM[system] ?? []));
  return found.size === 0 ? [OTHER_DOMAIN] : [...found].sort();
}

function outcomesOf(campaign: Campaign, entry: ActionRecord): readonly TimelineOutcome[] {
  const effective = entry.causal?.effectiveDate;
  const pending = effective !== undefined && compareDates(effective, campaign.calendar) > 0;
  const approval = entry.cost?.approval ?? 0;
  return [pending ? "under-way" : "in-effect", ...(approval > 0.00005 ? (["helped"] as const) : []), ...(approval < -0.00005 ? (["hurt"] as const) : [])];
}

function rowOf(campaign: Campaign, entry: ActionRecord, moves: readonly ReadingMove[]): TimelineRow {
  const place = eventPlace(campaign, entry);
  return {
    ...recordRowOf(campaign, entry, entry.causal!.eventId, moves),
    domains: domainsOf(entry),
    storySubjects: [...new Map((entry.subjects ?? []).map((subject) => [subject.id, { id: subject.id, label: subject.name }])).values()],
    outcomes: outcomesOf(campaign, entry),
    ...(place.subject ? { subject: place.subject } : {}),
    place,
  };
}

function tally(values: readonly (readonly [string, string])[]): readonly TimelineOption[] {
  const counts = new Map<string, { label: string; count: number }>();
  for (const [value, label] of values) counts.set(value, { label, count: (counts.get(value)?.count ?? 0) + 1 });
  return [...counts].map(([value, { label, count }]) => ({ value, label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

// A term of thousands of entries is read for every keystroke of the search
// box, so the rows are built once per campaign state.
const ROWS = new WeakMap<Campaign, readonly TimelineRow[]>();

function allRows(campaign: Campaign): readonly TimelineRow[] {
  const cached = ROWS.get(campaign);
  if (cached) return cached;
  const moves = ledgerMoves(campaign);
  const rows = [...foregroundLedger(campaign)].reverse().filter((entry) => entry.causal !== undefined).map((entry) => rowOf(campaign, entry, moves.get(entry) ?? []));
  ROWS.set(campaign, rows);
  return rows;
}

function matchesQuery(row: TimelineRow, words: readonly string[]): boolean {
  const haystack = `${row.description} ${row.subject?.label ?? ""} ${row.domains.join(" ")} ${(row.storySubjects ?? []).map((subject) => subject.label).join(" ")}`.toLowerCase();
  return words.every((word) => haystack.includes(word));
}

/** Every entry of the term, newest first, with the options each filter can take and how many entries each would keep. */
export function recordTimeline(campaign: Campaign, filter: TimelineFilter = {}): TimelineReading {
  const all = allRows(campaign);
  const actorRows = filter.actor ? all.filter((row) => row.actor === filter.actor) : all;
  const words = (filter.query ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  const rows = actorRows.filter(
    (row) =>
      (filter.domain === undefined || row.domains.includes(filter.domain)) &&
      (filter.subject === undefined || row.subject?.id === filter.subject || row.storySubjects?.some((subject) => subject.id === filter.subject)) &&
      (filter.outcome === undefined || row.outcomes.includes(filter.outcome)) &&
      matchesQuery(row, words),
  );
  return {
    rows,
    total: all.length,
    domains: tally(actorRows.flatMap((row) => row.domains.map((domain): readonly [string, string] => [domain, domain]))),
    subjects: tally(actorRows.flatMap((row) => [...(row.subject ? [[row.subject.id, row.subject.label] as const] : []), ...(row.storySubjects ?? []).map((subject) => [subject.id, subject.label] as const)])),
    outcomes: (Object.keys(OUTCOME_WORDS) as TimelineOutcome[]).flatMap((value) => {
      const count = actorRows.filter((row) => row.outcomes.includes(value)).length;
      return count > 0 ? [{ value, label: OUTCOME_WORDS[value], count }] : [];
    }),
  };
}
