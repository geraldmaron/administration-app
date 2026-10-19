import type { NationId } from "@admin/world";
import { recordWeek, type WeeklyCourse } from "./economy-archive.js";
import { relationshipKey, type Campaign } from "./state.js";

// How every government and the United States stood toward each other as each
// week closed: the United States' trust in it, its trust in the United States,
// and the tension the United States reads. `Relationship.history` is a log of
// what happened between two capitals; this is the course the figures took.
//
// A week's entry holds only the governments whose reading moved at the
// precision the save keeps, so an absent government is one whose reading was
// exactly what it had last been and the course carries it forward without
// guessing. The first entry of a record holds every government. A month that
// leaves the weekly ring keeps every change its weeks held.

/** Two years weekly, like the economy's ring; older weeks fold to their month. */
export const RELATIONS_HISTORY_WINDOW = 104;

/** One government's reading. A side is absent when no relationship is kept that way. */
export type TrustReading = {
  /** The United States' trust in it, -1..1. */
  readonly ours?: number;
  /** Its trust in the United States, -1..1. Recorded whether or not the services read it. */
  readonly theirs?: number;
  /** The tension the United States reads with it, 0..1. */
  readonly tension?: number;
};

export type RelationsSample = {
  readonly turn: number;
  readonly ties: Readonly<Record<string, TrustReading>>;
};

/** The weekly ring, the months before it, and the turn the record opened on (see `OpinionRecord`). */
export type RelationsRecord = WeeklyCourse<RelationsSample> & { readonly since: number };

/** One point of one government's course: the reading carried to a recorded week. */
export type TrustPoint = TrustReading & { readonly turn: number };

const round3 = (value: number): number => Math.round(value * 1000) / 1000;

function readingOf(campaign: Campaign, nation: NationId): TrustReading {
  const home = campaign.founding.nation;
  const from = campaign.relationships[relationshipKey(home, nation)];
  const toward = campaign.relationships[relationshipKey(nation, home)];
  return {
    ...(from ? { ours: round3(from.trust), tension: round3(from.tension) } : {}),
    ...(toward ? { theirs: round3(toward.trust) } : {}),
  };
}

function tieReadings(campaign: Campaign): Record<string, TrustReading> {
  const home = campaign.founding.nation;
  return Object.fromEntries(
    (Object.keys(campaign.nations) as NationId[]).filter((id) => id !== home).map((id) => [id, readingOf(campaign, id)]),
  );
}

const sameReading = (a: TrustReading | undefined, b: TrustReading | undefined): boolean =>
  a !== undefined && b !== undefined && a.ours === b.ours && a.theirs === b.theirs && a.tension === b.tension;

const mergeTies = (earlier: RelationsSample, later: RelationsSample): RelationsSample => ({
  turn: later.turn,
  ties: { ...earlier.ties, ...later.ties },
});

function entries(record: RelationsRecord): readonly RelationsSample[] {
  return [...record.monthly, ...record.weekly];
}

/** Every government's reading as the record last saw it. */
function lastReadings(record: RelationsRecord): Readonly<Record<string, TrustReading>> {
  return entries(record).reduce<Record<string, TrustReading>>((last, sample) => ({ ...last, ...sample.ties }), {});
}

/**
 * The record with the week `closed` ends filed as `turn`. Draws nothing and
 * reads nothing back, so keeping it cannot change anything else the week does.
 */
export function withRelationsSample(closed: Campaign, turn: number): RelationsRecord {
  const now = tieReadings(closed);
  const record = closed.relationsRecord;
  if (!record) return { since: closed.turn, weekly: [{ turn, ties: now }], monthly: [] };
  const last = lastReadings(record);
  const moved = Object.fromEntries(Object.entries(now).filter(([id, reading]) => !sameReading(reading, last[id])));
  return { since: record.since, ...recordWeek(record, { turn, ties: moved }, RELATIONS_HISTORY_WINDOW, mergeTies) };
}

/**
 * One government's course, oldest first: a point at every recorded week in the
 * ring and every month before it, each carrying the reading as it then stood.
 * Empty when the record holds nothing of it.
 */
export function trustCourse(campaign: Campaign, nation: NationId): readonly TrustPoint[] {
  const record = campaign.relationsRecord;
  if (!record) return [];
  const points: TrustPoint[] = [];
  let current: TrustReading | undefined;
  for (const sample of entries(record)) {
    current = sample.ties[nation] ?? current;
    if (current) points.push({ turn: sample.turn, ...current });
  }
  return points;
}
