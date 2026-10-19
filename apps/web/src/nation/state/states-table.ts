import { underDeclaredEmergency, type Campaign, type UsParty } from "@admin/engine";
import { stateLensValue, type NationLensId, type NationOverview, type StateApprovalCell, type StateRow } from "@admin/player-core";
import type { SortDirection } from "@admin/ui-web";
import type { Valence } from "../../shell/valence";

/** One state as the table prints it: who governs, the reading on the lens the map shows, and whether anything is running there. */
export type StateTableRow = {
  readonly id: string;
  readonly name: string;
  readonly href: string;
  readonly governor: string | undefined;
  readonly governorId?: string | undefined;
  readonly party: UsParty | undefined;
  readonly reading: string;
  /** The lens value the reading is ranked by, highest first. */
  readonly rank: number;
  /** Whether the reading is in the President's favor; absent when the lens is not a judgment (lean, population). */
  readonly valence?: Valence;
  /** The reading drawn on a 0..1 track: where it sits, the line it is judged against, and the baseline a signed reading is drawn from. */
  readonly meter?: { readonly value: number; readonly mark?: number; readonly from?: number };
  /** Approval against the previous weekly sample, in share; absent before a second week is on record. */
  readonly change?: number;
  /** Approval week by week from the oath, oldest first. */
  readonly history: readonly number[];
  readonly conditions: number;
  readonly declared: boolean;
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

export const STATE_SORT_KEYS = ["name", "governor", "reading", "change", "flags"] as const;
export type StateSortKey = (typeof STATE_SORT_KEYS)[number];

export type StateFilter = {
  readonly query: string;
  readonly party: UsParty | "any";
  /** Only states with a condition running or a declaration over them. */
  readonly flaggedOnly: boolean;
};

export const NO_FILTER: StateFilter = { query: "", party: "any", flaggedOnly: false };

/** Approval at or above the middle is good, a thin slate of support is watch, and under 40% is bad; a call is read by who carries the state. */
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
    return {
      id: row.id,
      name: row.name,
      href: row.href,
      governor: governor ? campaign.people[governor.person]?.base.name : undefined,
      governorId: governor?.person,
      party: governor?.party,
      reading: value.text,
      rank: value.rank,
      valence: readingValence(row, lens),
      meter: readingMeter(row, lens, largest),
      ...(cell?.change === undefined ? {} : { change: cell.change }),
      history: cell?.history ?? [],
      conditions: row.conditions,
      declared: underDeclaredEmergency(campaign, row.id),
    };
  });
}

const flagged = (row: StateTableRow): boolean => row.conditions > 0 || row.declared;

export function filterStates(rows: readonly StateTableRow[], filter: StateFilter): readonly StateTableRow[] {
  const query = filter.query.trim().toLowerCase();
  return rows.filter(
    (row) =>
      (query === "" || row.name.toLowerCase().includes(query) || row.id.toLowerCase() === query || (row.governor ?? "").toLowerCase().includes(query)) &&
      (filter.party === "any" || row.party === filter.party) &&
      (!filter.flaggedOnly || flagged(row)),
  );
}

const COMPARE: Readonly<Record<StateSortKey, (a: StateTableRow, b: StateTableRow) => number>> = {
  name: (a, b) => a.name.localeCompare(b.name),
  governor: (a, b) => (a.governor ?? "￿").localeCompare(b.governor ?? "￿"),
  reading: (a, b) => a.rank - b.rank,
  change: (a, b) => (a.change ?? 0) - (b.change ?? 0),
  flags: (a, b) => a.conditions + Number(a.declared) - (b.conditions + Number(b.declared)),
};

/** Sorted by the chosen column, ties by name so the order is stable under any sort. */
export function sortStates(rows: readonly StateTableRow[], key: StateSortKey, direction: SortDirection): readonly StateTableRow[] {
  const sign = direction === "ascending" ? 1 : -1;
  return [...rows].sort((a, b) => sign * COMPARE[key](a, b) || a.name.localeCompare(b.name));
}
