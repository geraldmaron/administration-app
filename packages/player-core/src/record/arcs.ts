import {
  daysBetween,
  selectClosedFamilies,
  selectDateOfTurn,
  selectNation,
  selectOpenFamilies,
  type Campaign,
  type FamilyDisposition,
  type GameDate,
  type ScenarioFamilyRun,
} from "@admin/engine";

/** One story as the Record lists it: running, or finished and how. */
export type ArcRow = {
  readonly family: string;
  /** The opener's subject as the President first read it. */
  readonly title: string;
  /** The country the arc was about, by name. */
  readonly counterpart: string;
  readonly openedDate: GameDate;
  readonly closedDate?: GameDate;
  readonly disposition?: FamilyDisposition;
  /** Weeks from the opener to the close, or to today for a story still running. Computed, never typed. */
  readonly weeks: number;
  /** How many decisions the arc put in front of the President. */
  readonly chapters: number;
};

export type ArcReading = {
  readonly finished: readonly ArcRow[];
  readonly running: readonly ArcRow[];
  /**
   * The newest close, when the stretch since it is longer than `ARC_QUIET_DAYS`:
   * a term that has not finished anything in a quarter is a thing the Record
   * says rather than leaves the player to notice.
   */
  readonly quietSince?: GameDate;
};

/** How long without a close before the Record says so. A reporting threshold, not a mechanic. */
export const ARC_QUIET_DAYS = 84;

/** The words the Record prints for each ending, at one weight: a lost arc is not a smaller line than a held one. */
export const ARC_DISPOSITION_WORDS: Readonly<Record<FamilyDisposition, string>> = {
  held: "Held",
  lost: "Lost",
  lapsed: "Lapsed",
};

function counterpartName(campaign: Campaign, run: ScenarioFamilyRun): string {
  return selectNation(campaign, run.counterpart)?.base.identity.name ?? String(run.counterpart);
}

function rowOf(campaign: Campaign, run: ScenarioFamilyRun): ArcRow {
  const openedDate = selectDateOfTurn(campaign, run.openedTurn);
  const closedDate = run.closedTurn === undefined ? undefined : selectDateOfTurn(campaign, run.closedTurn);
  const counterpart = counterpartName(campaign, run);
  return {
    family: run.family,
    title: run.title ?? `The situation with ${counterpart}`,
    counterpart,
    openedDate,
    ...(closedDate ? { closedDate } : {}),
    ...(run.disposition ? { disposition: run.disposition } : {}),
    weeks: Math.max(1, Math.round(daysBetween(openedDate, closedDate ?? campaign.calendar) / 7)),
    chapters: run.beats.length,
  };
}

/** Every arc the administration has opened, finished first (newest close first), then what is still running. */
export function selectArcReading(campaign: Campaign): ArcReading {
  const finished = selectClosedFamilies(campaign).map((run) => rowOf(campaign, run));
  const running = selectOpenFamilies(campaign).map((run) => rowOf(campaign, run));
  const newest = finished[0]?.closedDate;
  const quiet = newest !== undefined && daysBetween(newest, campaign.calendar) > ARC_QUIET_DAYS;
  return { finished, running, ...(quiet ? { quietSince: newest } : {}) };
}

/**
 * Arcs that ended between two readings of the same campaign, newest first:
 * the one line a stop brief owes the player when a story closed while the
 * world was running, whether it was answered or lapsed.
 */
export function arcsClosedBetween(before: Campaign, after: Campaign): readonly ArcRow[] {
  const wasClosed = new Set(selectClosedFamilies(before).map((run) => run.family));
  return selectClosedFamilies(after)
    .filter((run) => !wasClosed.has(run.family))
    .map((run) => rowOf(after, run));
}
