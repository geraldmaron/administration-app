import { underDeclaredEmergency, type Campaign, type UsParty } from "@admin/engine";
import type { StateId } from "@admin/world";
import { formatSignedPoints, stateLensValue, stateRelationship, type NationLensId, type NationOverview, type StateApprovalCell, type StateRelationship, type StateRow } from "@admin/player-core";
import type { Valence } from "../format";
import type { Direction, StateFocus, StateSortKey } from "./search";

/** One state as the table prints it: who governs, the reading on the chosen lens, and whether anything is running there. */
export type StateTableRow = {
  readonly id: string;
  readonly name: string;
  readonly href: string;
  readonly governor: string | undefined;
  readonly governorId?: string | undefined;
  readonly party: UsParty | undefined;
  readonly reading: string;
  /** The lens value the reading is ranked by. */
  readonly rank: number;
  /** Whether the reading is in the President's favor; absent when the lens is not a judgment (lean, population). */
  readonly valence?: Valence;
  /** The reading on a 0..1 track: where it sits, the line it is judged against, and the baseline a signed reading is drawn from. */
  readonly meter?: { readonly value: number; readonly mark?: number; readonly from?: number };
  /** Approval against the previous weekly sample, in share; absent before a second week is on record. */
  readonly change?: number;
  /** Approval week by week from the oath, oldest first. */
  readonly history: readonly number[];
  readonly conditions: number;
  readonly declared: boolean;
  /** The governor's standing in plain words; "No governor" where none is seated. */
  readonly relationship: string;
  readonly relationshipBand?: StateRelationship["band"];
  /** 0..1 toward the administration, the key the column sorts by; absent with no governor. */
  readonly disposition?: number;
  readonly leansAgainst: boolean;
  /** What the standing means for an ask of the governor. */
  readonly relationshipMeaning: string;
  /** Matters the state has put to the President: open requests and running conditions that call for an answer. */
  readonly needs: number;
  readonly needTitles: readonly string[];
  /** Federal acts open this week against the state's lead matter. */
  readonly acts: number;
};

/** A partisan lean of this many points either side of Even fills the track: no state is further out than the most partisan one. */
const LEAN_SPAN = 0.4;

/** A state's reading on the lens as a track position, so the table shows size before the figure is read. */
export function readingMeter(row: StateRow, lens: NationLensId, largest: number): StateTableRow["meter"] {
  switch (lens) {
    case "approval":
      return { value: row.approval, mark: 0.5 };
    case "call":
      return { value: row.call.share, mark: 0.5 };
    case "lean":
      return { value: 0.5 + Math.max(-1, Math.min(1, row.lean / LEAN_SPAN)) / 2, from: 0.5 };
    case "population":
      return { value: largest > 0 ? row.population / largest : 0 };
  }
}

export type StateFilter = {
  readonly query: string;
  readonly party: UsParty | "any";
  /** Only states with a condition running or a declaration over them. */
  readonly flaggedOnly: boolean;
  /** One slice of the management view: states that need the President, whose governor leans against, or that are under a declaration. */
  readonly focus: StateFocus | "any";
};

export const NO_FILTER: StateFilter = { query: "", party: "any", flaggedOnly: false, focus: "any" };

/** Approval at or above half is good, a thin slate of support is watch, and under 40% is bad; a call is read by who carries the state. */
export function readingValence(row: StateRow, lens: NationLensId): Valence | undefined {
  if (lens === "approval") return row.approval >= 0.5 ? "good" : row.approval >= 0.4 ? "watch" : "bad";
  if (lens !== "call") return undefined;
  if (row.call.administrationVotes > 0 && row.call.administrationVotes < row.call.electoralVotes) return "watch";
  return row.call.winner === "administration" ? "good" : "bad";
}

/** Every state in the overview as a table row, read on the given lens. */
export function stateTableRows(campaign: Campaign, overview: NationOverview, lens: NationLensId, cells: readonly StateApprovalCell[]): readonly StateTableRow[] {
  const largest = Math.max(0, ...overview.rows.map((row) => row.population));
  const record = new Map(cells.map((cell) => [cell.state as string, cell]));
  return overview.rows.map((row) => {
    const governor = campaign.states[row.id]?.governor;
    const value = stateLensValue(row, lens);
    const cell = record.get(row.id);
    const valence = readingValence(row, lens);
    const relation = stateRelationship(campaign, row.id as StateId);
    return {
      id: row.id,
      name: row.name,
      href: row.href,
      governor: governor ? campaign.people[governor.person]?.base.name : undefined,
      governorId: governor?.person,
      party: governor?.party,
      reading: value.text,
      rank: value.rank,
      ...(valence ? { valence } : {}),
      meter: readingMeter(row, lens, largest),
      ...(cell?.change === undefined ? {} : { change: cell.change }),
      history: cell?.history ?? [],
      conditions: row.conditions,
      declared: underDeclaredEmergency(campaign, row.id),
      relationship: relation?.word ?? "No governor",
      ...(relation?.band ? { relationshipBand: relation.band } : {}),
      ...(relation?.disposition === undefined ? {} : { disposition: relation.disposition }),
      leansAgainst: relation?.leansAgainst ?? false,
      relationshipMeaning: relation?.meaning ?? "",
      needs: relation?.needsCount ?? 0,
      needTitles: relation?.needs.map((need) => need.title) ?? [],
      acts: relation?.actCount ?? 0,
    };
  });
}

const flagged = (row: StateTableRow): boolean => row.conditions > 0 || row.declared;

const FOCUS_TEST: Readonly<Record<StateFocus, (row: StateTableRow) => boolean>> = {
  needs: (row) => row.needs > 0,
  against: (row) => row.leansAgainst,
  declared: (row) => row.declared,
};

/** How many states each slice of the management view holds, for the block above the table. */
export function focusCounts(rows: readonly StateTableRow[]): Readonly<Record<StateFocus, number>> {
  return { needs: rows.filter(FOCUS_TEST.needs).length, against: rows.filter(FOCUS_TEST.against).length, declared: rows.filter(FOCUS_TEST.declared).length };
}

export function filterStates(rows: readonly StateTableRow[], filter: StateFilter): readonly StateTableRow[] {
  const query = filter.query.trim().toLowerCase();
  return rows.filter(
    (row) =>
      (query === "" || row.name.toLowerCase().includes(query) || row.id.toLowerCase() === query || (row.governor ?? "").toLowerCase().includes(query)) &&
      (filter.party === "any" || row.party === filter.party) &&
      (!filter.flaggedOnly || flagged(row)) &&
      (filter.focus === "any" || FOCUS_TEST[filter.focus](row)),
  );
}

const COMPARE: Readonly<Record<StateSortKey, (a: StateTableRow, b: StateTableRow) => number>> = {
  name: (a, b) => a.name.localeCompare(b.name),
  governor: (a, b) => (a.governor ?? "￿").localeCompare(b.governor ?? "￿"),
  reading: (a, b) => a.rank - b.rank,
  change: (a, b) => (a.change ?? 0) - (b.change ?? 0),
  relationship: (a, b) => (a.disposition ?? 2) - (b.disposition ?? 2),
  needs: (a, b) => a.needs - b.needs,
  flags: (a, b) => a.conditions + Number(a.declared) - (b.conditions + Number(b.declared)),
};

/** Sorted by the chosen column, ties by name so the order is stable under any sort. */
export function sortStates(rows: readonly StateTableRow[], key: StateSortKey, direction: Direction): readonly StateTableRow[] {
  const sign = direction === "ascending" ? 1 : -1;
  return [...rows].sort((a, b) => sign * COMPARE[key](a, b) || a.name.localeCompare(b.name));
}

/** A week's move in tenths of a point, the precision the Digest uses; whole points read a typical week as zero. */
export function weekPoints(change: number): string {
  return Math.abs(change) < 0.0005 ? "No change" : `${formatSignedPoints(change)} pts`;
}
