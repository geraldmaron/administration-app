import {
  compareDates,
  graftDisclosed,
  selectCausesOf,
  selectConsequencesOf,
  selectDecisionLegacy,
  selectRootCausesOf,
  selectDateOfTurn,
  type ActionRecord,
  type Campaign,
  type CausalOrigin,
  type EffectActor,
  type GameDate,
  type MetricSet,
  type OpinionDriver,
} from "@admin/engine";
import { METRIC_LABELS, OPINION_DRIVER_LABELS, formatRatio, formatSignedPoints, roleTitle } from "../format/figures";
import { formatMoney } from "../format/money";
import { charterOf } from "../campaign/founding-options";
import { eventPlace } from "./event-place";
import { foregroundLedger } from "./foreground";

// The Record's entries as a screen reads them: who acted, when, what moved
// from what to what, and what it answered to. Every figure is read off what
// `apply()` stamped on the ledger; nothing is recomputed against today's board.

export const ACTOR_WORDS: Readonly<Record<EffectActor, string>> = {
  player: "Your administration",
  world: "The world",
  developer: "Developer amendment",
};

export const ORIGIN_WORDS: Readonly<Record<CausalOrigin, string>> = {
  decision: "Your decision",
  institution: "A government agency acting on its own",
  world: "Another country or group",
  scheduled: "The calendar",
  scenario: "A situation brought to you",
};

const METRIC_KEYS: readonly (keyof MetricSet)[] = ["approval", "treasury", "stability", "militaryReadiness", "standing"];

/** Movements smaller than this print as no movement; the ledger keeps float noise from clamps. */
const MOVED = 0.00005;

/** One reading's move across one entry, from the value before it to the value after. */
export type ReadingMove = {
  readonly key: keyof MetricSet;
  readonly label: string;
  readonly before: number;
  readonly after: number;
  readonly delta: number;
  /** The change as the row prints it: "+0.4 points", "−$1.2B". */
  readonly text: string;
  readonly beforeText: string;
  readonly afterText: string;
};

function figure(key: keyof MetricSet, value: number): string {
  return key === "treasury" ? formatMoney(value) : formatRatio(value);
}

function changeText(key: keyof MetricSet, delta: number): string {
  if (key === "treasury") return `${delta >= 0 ? "+" : "−"}${formatMoney(Math.abs(delta))}`;
  return `${formatSignedPoints(delta)} points`;
}

/**
 * The readings as they stood just after the entry at `index`: today's figures
 * with every later entry's recorded change taken back off. Each entry's `cost`
 * is the before/after diff `apply()` measured, so the walk back is exact.
 */
function readingsAfter(campaign: Campaign, index: number): MetricSet {
  const later = campaign.ledger.slice(index + 1);
  return Object.fromEntries(
    METRIC_KEYS.map((key) => [key, later.reduce((value, entry) => value - (entry.cost?.[key] ?? 0), campaign.player.metrics[key])]),
  ) as MetricSet;
}

function movesAfter(entry: ActionRecord, after: MetricSet): readonly ReadingMove[] {
  return METRIC_KEYS.flatMap((key): ReadingMove[] => {
    const delta = entry.cost?.[key] ?? 0;
    if (Math.abs(delta) < (key === "treasury" ? 0.5 : MOVED)) return [];
    const before = after[key] - delta;
    return [{ key, label: METRIC_LABELS[key], before, after: after[key], delta, text: changeText(key, delta), beforeText: figure(key, before), afterText: figure(key, after[key]) }];
  });
}

/** The readings an entry moved, each from its value before the entry to its value after. */
export function entryMoves(campaign: Campaign, entry: ActionRecord): readonly ReadingMove[] {
  const index = campaign.ledger.indexOf(entry);
  return index < 0 ? [] : movesAfter(entry, readingsAfter(campaign, index));
}

/**
 * Every entry's moves in one walk back from today's readings, for a screen
 * that reads the whole ledger. Asking `entryMoves` per entry rewinds the
 * ledger each time, which is quadratic over a term of thousands of entries.
 */
export function ledgerMoves(campaign: Campaign): ReadonlyMap<ActionRecord, readonly ReadingMove[]> {
  const moves = new Map<ActionRecord, readonly ReadingMove[]>();
  let after: MetricSet = { ...campaign.player.metrics };
  for (let index = campaign.ledger.length - 1; index >= 0; index -= 1) {
    const entry = campaign.ledger[index]!;
    moves.set(entry, movesAfter(entry, after));
    const before = after;
    after = Object.fromEntries(METRIC_KEYS.map((key) => [key, before[key] - (entry.cost?.[key] ?? 0)])) as MetricSet;
  }
  return moves;
}

/** The readings that moved from one set of figures to another: what one act or one run did. */
export function metricMoves(before: MetricSet, after: MetricSet): readonly ReadingMove[] {
  return METRIC_KEYS.flatMap((key): ReadingMove[] => {
    const delta = after[key] - before[key];
    if (Math.abs(delta) < (key === "treasury" ? 0.5 : MOVED)) return [];
    return [{ key, label: METRIC_LABELS[key], before: before[key], after: after[key], delta, text: changeText(key, delta), beforeText: figure(key, before[key]), afterText: figure(key, after[key]) }];
  });
}

/** The readings that moved between two campaigns, from the first's value to the second's. */
export function readingMoves(before: Campaign, after: Campaign): readonly ReadingMove[] {
  return metricMoves(before.player.metrics, after.player.metrics);
}

/** The public judgments an entry moved, heaviest first. */
export function entryJudgments(entry: ActionRecord): readonly { readonly driver: OpinionDriver; readonly label: string; readonly delta: number; readonly text: string }[] {
  return (Object.keys(OPINION_DRIVER_LABELS) as OpinionDriver[]).flatMap((driver) => {
    const delta = entry.mood?.[driver] ?? 0;
    return Math.abs(delta) < MOVED ? [] : [{ driver, label: OPINION_DRIVER_LABELS[driver], delta, text: `${formatSignedPoints(delta)} points` }];
  }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

export type RecordRow = {
  readonly id: string;
  readonly date: GameDate;
  readonly actor: EffectActor;
  readonly actorWord: string;
  readonly description: string;
  /** The description's first sentence, for a title; the rest is the body. */
  readonly headline: string;
  readonly moves: readonly ReadingMove[];
  /** The subsystems it moved ("trade", "congress", "macro"), which the timeline draws as its mark. */
  readonly systems: readonly string[];
  /** The foreign governments it names, in the order it names them, whose flags the timeline shows. */
  readonly nations: readonly string[];
};

/** The first sentence of a ledger description, which carries what happened; the rest is how. */
export function headlineOf(description: string): string {
  // An abbreviation ends in a period too ("U.S. Congress"), so a stop after one is not the end of the sentence.
  const match = /^(.+?(?<!\b(?:U\.S|U\.K|St|Mr|Mrs|Ms|Dr|No|vs|Inc|Corp|Jr|Sr))[.!?])(?=\s+[A-Z(])/.exec(description);
  return match?.[1] ?? description;
}

function dateOf(campaign: Campaign, entry: ActionRecord): GameDate {
  return entry.causal?.createdDate ?? selectDateOfTurn(campaign, entry.turn);
}

function foreignNationsOf(campaign: Campaign, entry: ActionRecord): readonly string[] {
  const named = (entry.causal?.entities ?? []).filter((id) => id !== campaign.founding.nation && campaign.nations[id as keyof Campaign["nations"]] !== undefined);
  return [...new Set(named)];
}

function graftActorWord(campaign: Campaign, entry: ActionRecord): string | undefined {
  const graft = entry.causal?.graft;
  if (!graft) return undefined;
  const title = roleTitle(graft.role, charterOf(campaign).roleTitles);
  const name = campaign.people[graft.person as keyof Campaign["people"]]?.base.name;
  return name ? `${name}, ${title}` : title;
}

/** One ledger entry as a row, with the moves already read off the ledger so a whole-term screen walks it once. */
export function recordRowOf(campaign: Campaign, entry: ActionRecord, id: string, moves: readonly ReadingMove[]): RecordRow {
  const graftActor = graftActorWord(campaign, entry);
  return {
    id,
    date: dateOf(campaign, entry),
    actor: graftActor ? "player" : entry.actor,
    actorWord: graftActor ?? ACTOR_WORDS[entry.actor],
    description: entry.description,
    headline: headlineOf(entry.description),
    moves,
    systems: entry.causal?.systems ?? [],
    nations: foreignNationsOf(campaign, entry),
  };
}

/** The Record's timeline, newest first: every entry a president reads that the causal graph can name. */
export function recordRows(campaign: Campaign, actor?: EffectActor): readonly RecordRow[] {
  const moves = ledgerMoves(campaign);
  return [...foregroundLedger(campaign)]
    .reverse()
    .filter((entry) => entry.causal !== undefined && (actor === undefined || (entry.causal.graft ? "player" : entry.actor) === actor))
    .map((entry) => recordRowOf(campaign, entry, entry.causal!.eventId, moves.get(entry) ?? []));
}

export type RecordLink = { readonly id: string; readonly description: string; readonly date: GameDate };

export type EntryStage = {
  readonly key: "issued" | "under-way" | "resolved";
  readonly label: string;
  /** The day the stage began, where the ledger kept one. */
  readonly date?: GameDate;
  readonly reached: boolean;
  /** The stage the entry stands in today. */
  readonly current: boolean;
};

export type RecordEntryReading = RecordRow & {
  readonly origin?: string;
  /** The day it bites, where that is later than the day it was decided. */
  readonly effectiveDate?: GameDate;
  /** Issued and in effect, or decided and still under way. */
  readonly status: string;
  /** Issued, under way where it takes time to bite, and resolved once it has. */
  readonly stages: readonly EntryStage[];
  readonly judgments: ReturnType<typeof entryJudgments>;
  readonly subjects: NonNullable<import("@admin/engine").ActionRecord["subjects"]>;
  readonly accounting: NonNullable<import("@admin/engine").ActionRecord["accounting"]>;
  readonly causes: readonly RecordLink[];
  readonly consequences: readonly RecordLink[];
  /** The events at the head of the chain this one answers to, found by walking origins upward. */
  readonly roots: readonly RecordLink[];
  /** Every event downstream of this one, however many steps away. */
  readonly downstreamCount: number;
  /** The map's framing for the entry: its first US state, else its first government, else the country. */
  readonly camera: string;
  readonly selection?: string;
};

function linkOf(record: { readonly causal: { readonly eventId: string; readonly createdDate: GameDate }; readonly description: string }): RecordLink {
  return { id: record.causal.eventId, description: record.description, date: record.causal.createdDate };
}

function stagesOf(created: GameDate, effective: GameDate | undefined, pending: boolean): readonly EntryStage[] {
  const delayed = effective !== undefined && compareDates(effective, created) > 0;
  if (!delayed) {
    return [
      { key: "issued", label: "Issued", date: created, reached: true, current: false },
      { key: "resolved", label: "In effect", date: created, reached: true, current: true },
    ];
  }
  return [
    { key: "issued", label: "Issued", date: created, reached: true, current: false },
    { key: "under-way", label: "Under way", reached: true, current: pending },
    { key: "resolved", label: "In effect", date: effective, reached: !pending, current: !pending },
  ];
}

/** One entry, read whole, or nothing for an id this administration's ledger does not hold. */
export function recordEntry(campaign: Campaign, eventId: string): RecordEntryReading | undefined {
  const entry = campaign.ledger.find((candidate) => candidate.causal?.eventId === eventId);
  if (!entry?.causal || !graftDisclosed(campaign, entry)) return undefined;
  const effective = entry.causal.effectiveDate;
  const pending = effective !== undefined && compareDates(effective, campaign.calendar) > 0;
  const where = eventPlace(campaign, entry);
  return {
    ...recordRowOf(campaign, entry, eventId, entryMoves(campaign, entry)),
    origin: entry.causal.graft ? "Someone working in your administration" : ORIGIN_WORDS[entry.causal.origin],
    ...(effective && compareDates(effective, entry.causal.createdDate) > 0 ? { effectiveDate: effective } : {}),
    status: pending ? "Started, but not in effect yet" : "In effect",
    stages: stagesOf(entry.causal.createdDate, effective, pending),
    judgments: entryJudgments(entry),
    accounting: entry.accounting ?? [],
    subjects: entry.subjects ?? [],
    causes: selectCausesOf(campaign.ledger.filter((row) => graftDisclosed(campaign, row)), eventId).map(linkOf),
    consequences: selectConsequencesOf(campaign.ledger.filter((row) => graftDisclosed(campaign, row)), eventId).map(linkOf),
    roots: selectRootCausesOf(campaign.ledger.filter((row) => graftDisclosed(campaign, row)), eventId).map(linkOf),
    downstreamCount: selectDecisionLegacy(campaign.ledger.filter((row) => graftDisclosed(campaign, row)), eventId).length,
    camera: where.camera,
    ...(where.selection ? { selection: where.selection } : {}),
  };
}
