import type { PortraitGenderPresentation, PortraitHeritage } from "../schemas/portrait.js";

/**
 * Who sits on the American bench: how many are women, and what heritage they
 * carry, by the office and the party.
 *
 * The world used to draw every officeholder's presentation from one global
 * 47/47/6 table and every American's face from one national mix, so a
 * Republican Senate caucus came out half women and as diverse as a Democratic
 * House caucus. The record says otherwise, and the gap between the parties is
 * larger than the gap between the offices, so the party a person carries picks
 * the row as much as the seat does.
 *
 * Every row is `seed/women-in-cabinet.tsv`, which copies the rows of the leader
 * table's `us-bench.tsv` (packages/world/sources/leader-table, sources and
 * coding rules in us-bench.sources.md, all opened 2026-09-23): the 2020 Census
 * adult population, the confirmed department heads of the last four
 * administrations, the 119th Congress (CRS R48535, August 4, 2025) and the 2026
 * governors (Ballotpedia, CAWP). The paired test holds this file to that table.
 */
export type UsBenchGroup = "population" | "cabinet" | "house" | "senate" | "governor";
export type UsBenchParty = "democrat" | "republican" | "all";

export type UsBenchRow = {
  readonly women: number;
  readonly white: number;
  readonly hispanic: number;
  readonly black: number;
  readonly asian: number;
  readonly other: number;
};

const row = (women: number, white: number, hispanic: number, black: number, asian: number, other: number): UsBenchRow => ({
  women,
  white,
  hispanic,
  black,
  asian,
  other,
});

export const US_BENCH_ROWS: Readonly<Record<UsBenchGroup, Readonly<Partial<Record<UsBenchParty, UsBenchRow>>>>> = {
  population: { all: row(0.515, 0.608, 0.168, 0.117, 0.061, 0.046) },
  cabinet: {
    all: row(0.253, 0.713, 0.126, 0.095, 0.035, 0.031),
    democrat: row(0.296, 0.606, 0.173, 0.139, 0.048, 0.033),
    republican: row(0.21, 0.82, 0.08, 0.05, 0.021, 0.029),
  },
  house: {
    all: row(0.29, 0.715, 0.107, 0.132, 0.039, 0.007),
    democrat: row(0.443, 0.509, 0.165, 0.25, 0.071, 0.005),
    republican: row(0.142, 0.913, 0.05, 0.018, 0.009, 0.009),
  },
  senate: {
    all: row(0.26, 0.85, 0.06, 0.05, 0.03, 0.01),
    democrat: row(0.34, 0.766, 0.085, 0.085, 0.064, 0),
    republican: row(0.189, 0.925, 0.038, 0.019, 0, 0.019),
  },
  governor: {
    democrat: row(0.417, 0.917, 0.062, 0.021, 0, 0),
    republican: row(0.154, 0.962, 0, 0, 0, 0.038),
  },
};

/**
 * The governors' row for a person of neither party: the two party rows
 * weighted by the seats each holds (24 Democrats, 26 Republicans), because the
 * table carries no pooled row for that office.
 */
const GOVERNOR_SEATS = { democrat: 24, republican: 26 } as const;

function pooledGovernorRow(): UsBenchRow {
  const d = US_BENCH_ROWS.governor.democrat!;
  const r = US_BENCH_ROWS.governor.republican!;
  const total = GOVERNOR_SEATS.democrat + GOVERNOR_SEATS.republican;
  const mix = (key: keyof UsBenchRow) =>
    Math.round(((d[key] * GOVERNOR_SEATS.democrat + r[key] * GOVERNOR_SEATS.republican) / total) * 1000) / 1000;
  return row(mix("women"), mix("white"), mix("hispanic"), mix("black"), mix("asian"), mix("other"));
}

/**
 * The office row each seat is read against.
 *
 * Congressional leaders read as the House (their caucuses are mostly House
 * members, and the Senate's five leaders are too few for a share), committee
 * chairs as the Senate whose panels they chair, and a journalist as the adult
 * population. Every other American seat, the bureau chiefs included, reads as a
 * cabinet: the table has no row for senior appointees below the cabinet, and
 * the sources note names the cabinet row as the reasonable proxy.
 */
const SEAT_GROUP: Readonly<Record<string, UsBenchGroup>> = {
  "role-governor": "governor",
  "role-committee-chair": "senate",
  "role-congressional-leader": "house",
  "role-opposition-leader": "house",
  "role-journalist": "population",
};

export function usBenchGroupFor(role: string): UsBenchGroup {
  return SEAT_GROUP[role] ?? "cabinet";
}

/** The row for this seat and party; a person of neither party reads the office's pooled row. */
export function usBenchRow(role: string, party: "democrat" | "republican" | "independent" | undefined): UsBenchRow {
  const group = usBenchGroupFor(role);
  const rows = US_BENCH_ROWS[group];
  const partyRow = party === "democrat" || party === "republican" ? rows[party] : undefined;
  if (partyRow) return partyRow;
  if (rows.all) return rows.all;
  return pooledGovernorRow();
}

/**
 * How many of a bench present androgynous. The record counts women and men and
 * nobody else, so this is a rendering choice rather than a measurement: kept
 * small and taken from the men's share, so the women's share still matches the
 * table.
 */
export const US_ANDROGYNOUS_SHARE = 0.02;

export function usBenchGenderWeights(row: UsBenchRow): Readonly<Record<PortraitGenderPresentation, number>> {
  return {
    masculine: Math.max(0, 1 - row.women - US_ANDROGYNOUS_SHARE),
    feminine: row.women,
    androgynous: US_ANDROGYNOUS_SHARE,
  };
}

/**
 * Where America's Asian population traces its origin, which splits the table's
 * single Asian American share across three kinds of face and three name
 * groups. ACS 2023 1-year, table B02015 ("Asian Alone by Selected Groups"),
 * United States, opened 2026-09-23 through data.census.gov. The Census files
 * Hmong under East Asian; they are counted with Southeast Asia here, where
 * their names sit.
 */
export const ASIAN_AMERICAN_ORIGIN = {
  east: 4_228_441 + 262_269 + 725_773 + 1_466_761 + 7_674 + 39_237 + 1_170,
  south: 289_423 + 4_713_643 + 208_748 + 15_037 + 17_022 + 68_525 + 607_713 + 10_396,
  southeast:
    220_379 + 257_203 + 3_103_814 + 76_478 + 176_801 + 26_002 + 20_055 + 7_733 + 202_982 + 1_908_676 + 4_264 + 337_925,
} as const;

/**
 * The faces a bench row draws, one weighted pick. White is drawn as northern
 * European, which is the face the national mix has always given white
 * Americans, and the census "other" group as mixed.
 */
export function usBenchHeritageMix(row: UsBenchRow): ReadonlyArray<{ heritage: PortraitHeritage; weight: number }> {
  const origin = ASIAN_AMERICAN_ORIGIN;
  const asian = origin.east + origin.south + origin.southeast;
  const entries: ReadonlyArray<{ heritage: PortraitHeritage; weight: number }> = [
    { heritage: "europe-north", weight: row.white },
    { heritage: "latin-america", weight: row.hispanic },
    { heritage: "africa-west", weight: row.black },
    { heritage: "east-asia", weight: (row.asian * origin.east) / asian },
    { heritage: "south-asia", weight: (row.asian * origin.south) / asian },
    { heritage: "southeast-asia", weight: (row.asian * origin.southeast) / asian },
    { heritage: "mixed", weight: row.other },
  ];
  return entries.filter((entry) => entry.weight > 0);
}
