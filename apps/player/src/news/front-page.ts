import type { CoverageRow } from "@admin/player-core";

// The press page's front page, read off the same coverage rows the feed
// lists: the week's lead, the stories under it, the week's coverage by topic,
// and the governments the press has been writing about. Nothing is ranked by
// anything but who filed it, how many people read that desk, and when.

export type FrontSection = { readonly topic: CoverageRow["topic"]; readonly label: string; readonly rows: readonly CoverageRow[] };

export type FrontPage = {
  /** The week the front page is set from: the newest week anything was filed in. */
  readonly week?: number;
  readonly lead?: CoverageRow;
  /** The next stories of that week, widest-read desks first. */
  readonly top: readonly CoverageRow[];
  /** That week's stories by topic, the busiest topic first, the lead and the top stories left out. */
  readonly sections: readonly FrontSection[];
};

const TOP = 4;
const PER_SECTION = 3;

/** Widest-read desk first, then newest. A notice or summary has no desk and ranks after every desk's story. */
function byReach(reach: ReadonlyMap<string, number>) {
  return (a: CoverageRow, b: CoverageRow): number => (reach.get(b.outletId ?? "") ?? -1) - (reach.get(a.outletId ?? "") ?? -1) || b.index - a.index;
}

function sectionsOf(rows: readonly CoverageRow[]): readonly FrontSection[] {
  const groups = new Map<CoverageRow["topic"], CoverageRow[]>();
  for (const row of rows) groups.set(row.topic, [...(groups.get(row.topic) ?? []), row]);
  return [...groups]
    .map(([topic, list]) => ({ topic, label: list[0]!.topicLabel, rows: list.slice(0, PER_SECTION), size: list.length }))
    .sort((a, b) => b.size - a.size || a.label.localeCompare(b.label))
    .map(({ topic, label, rows: shown }) => ({ topic, label, rows: shown }));
}

/** The front page for the newest week: rows arrive newest first, as `coverageRows` returns them. */
export function frontPage(rows: readonly CoverageRow[], reach: ReadonlyMap<string, number>): FrontPage {
  const newest = rows[0];
  if (!newest) return { top: [], sections: [] };
  const week = newest.week;
  const ranked = rows.filter((row) => row.week === week).sort(byReach(reach));
  const journalism = ranked.filter((row) => row.genre === "journalism");
  const lead = journalism[0] ?? ranked[0];
  const top = journalism.filter((row) => row !== lead).slice(0, TOP);
  const shown = new Set([lead, ...top]);
  return { week, ...(lead ? { lead } : {}), top, sections: sectionsOf(ranked.filter((row) => !shown.has(row))) };
}

export type NamedNation = { readonly id: string; readonly name: string; readonly count: number };

/** The governments the coverage names, the most-covered first. */
export function nationsInCoverage(rows: readonly CoverageRow[]): readonly NamedNation[] {
  const counts = new Map<string, NamedNation>();
  for (const row of rows) {
    for (const nation of row.nations) counts.set(nation.id, { id: nation.id, name: nation.name, count: (counts.get(nation.id)?.count ?? 0) + 1 });
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** The rows that name one government, or every row when none is chosen. */
export function namingNation(rows: readonly CoverageRow[], nation: string | undefined): readonly CoverageRow[] {
  return nation ? rows.filter((row) => row.nations.some((entry) => entry.id === nation)) : rows;
}
