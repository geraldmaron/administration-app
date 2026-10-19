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
export declare const US_BENCH_ROWS: Readonly<Record<UsBenchGroup, Readonly<Partial<Record<UsBenchParty, UsBenchRow>>>>>;
export declare function usBenchGroupFor(role: string): UsBenchGroup;
/** The row for this seat and party; a person of neither party reads the office's pooled row. */
export declare function usBenchRow(role: string, party: "democrat" | "republican" | "independent" | undefined): UsBenchRow;
/**
 * How many of a bench present androgynous. The record counts women and men and
 * nobody else, so this is a rendering choice rather than a measurement: kept
 * small and taken from the men's share, so the women's share still matches the
 * table.
 */
export declare const US_ANDROGYNOUS_SHARE = 0.02;
export declare function usBenchGenderWeights(row: UsBenchRow): Readonly<Record<PortraitGenderPresentation, number>>;
/**
 * Where America's Asian population traces its origin, which splits the table's
 * single Asian American share across three kinds of face and three name
 * groups. ACS 2023 1-year, table B02015 ("Asian Alone by Selected Groups"),
 * United States, opened 2026-09-23 through data.census.gov. The Census files
 * Hmong under East Asian; they are counted with Southeast Asia here, where
 * their names sit.
 */
export declare const ASIAN_AMERICAN_ORIGIN: {
    readonly east: number;
    readonly south: number;
    readonly southeast: number;
};
/**
 * The faces a bench row draws, one weighted pick. White is drawn as northern
 * European, which is the face the national mix has always given white
 * Americans, and the census "other" group as mixed.
 */
export declare function usBenchHeritageMix(row: UsBenchRow): ReadonlyArray<{
    heritage: PortraitHeritage;
    weight: number;
}>;
