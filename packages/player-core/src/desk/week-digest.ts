import { selectDateOfTurn, stateApprovals, type ActionRecord, type Campaign, type FeedItem, type GameDate, type MetricSet } from "@admin/engine";
import type { StateId } from "@admin/world";
import { formatRatio, formatSignedPoints } from "../format/figures";
import { place } from "../navigation/places";
import { foregroundLedger } from "../record/foreground";
import { ledgerMoves, metricMoves, recordRowOf, type ReadingMove, type RecordRow } from "../record/record-entry";
import { isInheritedRow } from "../record/inheritance";

// Any closed week of the term, rebuilt from what the campaign keeps: the
// weekly metric and state-approval series, the ledger and the wire. The last
// run's brief covers only the run that just ended and is gone once time runs
// again; a president asking "what happened the week the strike landed" needs
// the week itself, so this reads the stored history rather than a session.
//
// Week W is stamped in two places. The President's own acts that week carry
// turn W. The week's close (the world's moves and what the wire filed about
// them) is applied as the next week opens and carries turn W + 1. The series
// rows are the figures each week opened on, so week W runs from row W to row
// W + 1, or to the open week's opening for the most recent closed week.

/** Smaller than a twentieth of a point is no change anyone would read. */
const STILL = 0.0005;

/** How many states the digest names on each side of the week's movement. */
const MOVERS = 5;

export type StateMove = {
  readonly id: StateId;
  readonly name: string;
  readonly before: number;
  readonly after: number;
  readonly delta: number;
  readonly text: string;
  readonly href: string;
};

export type WeekTab = {
  readonly week: number;
  readonly from: GameDate;
  /** Approval's move across the week, for the stepper's bar; absent where the series no longer holds the week. */
  readonly approvalDelta?: number;
};

export type WeekDigest = WeekTab & {
  readonly to: GameDate;
  readonly moves: readonly ReadingMove[];
  readonly acts: readonly RecordRow[];
  readonly world: readonly RecordRow[];
  readonly wire: readonly FeedItem[];
  /** The states whose approval rose most and fell most, largest first; a state that did not move is in neither. */
  readonly risers: readonly StateMove[];
  readonly fallers: readonly StateMove[];
  /** True when the series no longer holds the week's figures, so only its record and wire can be shown. */
  readonly scrolledOut: boolean;
};

/** The metric row the week opened on, or undefined where the bounded series has dropped it or it is the predecessor's. */
export function openingRow(campaign: Campaign, week: number): MetricSet | undefined {
  const history = campaign.player.metricHistory;
  const index = history.length - 1 - (campaign.turn - 1 - week);
  if (index < 0 || index >= history.length || isInheritedRow(campaign, index)) return undefined;
  return history[index];
}

/**
 * The figures the open week started from. Where the campaign kept no opening,
 * today's figures stand in, the same baseline the Brief's "this week" reads:
 * taking this week's ledger back off instead would also take off the automatic
 * entries the week's close files under the administration.
 */
function openWeekMetrics(campaign: Campaign): MetricSet {
  return campaign.week?.metrics ?? campaign.player.metrics;
}

export function closingRow(campaign: Campaign, week: number): MetricSet | undefined {
  return week + 1 >= campaign.turn ? openWeekMetrics(campaign) : openingRow(campaign, week + 1);
}

type StateFigures = Readonly<Partial<Record<StateId, number>>>;

function stateSample(campaign: Campaign, week: number): StateFigures | undefined {
  if (week >= campaign.turn) return campaign.week?.stateApproval?.approval ?? stateApprovals(campaign);
  return campaign.stateApprovalHistory?.find((sample) => sample.turn === week)?.approval;
}

export function stateMoves(campaign: Campaign, week: number): readonly StateMove[] {
  const before = stateSample(campaign, week);
  const after = stateSample(campaign, week + 1);
  if (!before || !after) return [];
  return (Object.keys(after) as StateId[]).flatMap((id): StateMove[] => {
    const was = before[id];
    const now = after[id];
    if (was === undefined || now === undefined || Math.abs(now - was) < STILL) return [];
    const name = campaign.states[id]?.base.name ?? id;
    return [{ id, name, before: was, after: now, delta: now - was, text: `${formatSignedPoints(now - was)} points, ${formatRatio(was)} to ${formatRatio(now)}`, href: place.state(id) }];
  });
}

/** Every closed week the digest can open, newest first. The term's first week has none before it to close. */
export function digestWeeks(campaign: Campaign): readonly WeekTab[] {
  const oldest = Math.max(1, Math.min(...campaign.feed.map((item) => item.turn - 1), ...campaign.ledger.map((entry) => entry.turn), campaign.turn - 1));
  const weeks: WeekTab[] = [];
  for (let week = campaign.turn - 1; week >= oldest; week -= 1) {
    const before = openingRow(campaign, week);
    const after = closingRow(campaign, week);
    weeks.push({ week, from: selectDateOfTurn(campaign, week), ...(before && after ? { approvalDelta: after.approval - before.approval } : {}) });
  }
  return weeks;
}

function rowsOf(campaign: Campaign, entries: readonly ActionRecord[], moves: ReadonlyMap<ActionRecord, readonly ReadingMove[]>): readonly RecordRow[] {
  return [...entries].reverse().flatMap((entry) => (entry.causal ? [recordRowOf(campaign, entry, entry.causal.eventId, moves.get(entry) ?? [])] : []));
}

/** One closed week as the digest reads it, or undefined for a week the term has not closed. */
export function weekDigest(campaign: Campaign, week: number): WeekDigest | undefined {
  if (!Number.isInteger(week) || week < 1 || week >= campaign.turn) return undefined;
  const before = openingRow(campaign, week);
  const after = closingRow(campaign, week);
  const ledger = foregroundLedger(campaign);
  const byEntry = ledgerMoves(campaign);
  const movers = stateMoves(campaign, week);
  const byDelta = [...movers].sort((a, b) => b.delta - a.delta);
  const rows = rowsOf(campaign, ledger.filter((entry) =>
    (entry.turn === week && entry.actor === "player") ||
    (entry.turn === week + 1 && entry.actor === "world")), byEntry);
  return {
    week,
    from: selectDateOfTurn(campaign, week),
    to: selectDateOfTurn(campaign, week + 1),
    ...(before && after ? { approvalDelta: after.approval - before.approval } : {}),
    // A move that prints as no change ("−0 points") is float noise, not a reading the week moved.
    moves: before && after ? metricMoves(before, after).filter((move) => move.key === "treasury" || Math.abs(move.delta) >= STILL) : [],
    acts: rows.filter((row) => row.actor === "player"),
    world: rows.filter((row) => row.actor === "world"),
    wire: campaign.feed.filter((item) => item.turn === week + 1).reverse(),
    risers: byDelta.filter((move) => move.delta > 0).slice(0, MOVERS),
    fallers: byDelta.filter((move) => move.delta < 0).reverse().slice(0, MOVERS),
    scrolledOut: !before || !after,
  };
}
