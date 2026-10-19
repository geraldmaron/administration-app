import type { Effect } from "./effect-types.js";
import type { Campaign, CasualtiesBySide, Conflict, ConflictSide, WarLossBand } from "./state.js";
/**
 * Civilians killed in the defender's country for each of its soldiers killed.
 * Ukraine, two years in: the UN monitoring mission verified more than 10,000
 * civilians killed (https://ukraine.un.org/en/261245-two-year-update-protection-
 * civilians-impact-hostilities-civilians-24-february-2022, 2024-02-21) against
 * 31,000 Ukrainian soldiers by the government's count (Kyiv Independent,
 * 2024-02-25), 0.32; a year on, 12,654 against 43,000, 0.29 (OHCHR, 2025-02-21;
 * Ukrainska Pravda, 2024-12-08). Both opened 2026-10-13. A verified minimum
 * over a government count, so if anything low; the short war in Georgia in
 * 2008, fought through towns, ran nearer 1.2 (EU fact-finding mission, 2009).
 */
export declare const CIVILIANS_PER_SOLDIER_KILLED = 0.3;
/**
 * A side's cumulative losses so far, as a surface may print them: the stored
 * bands with their edges coarsened. Undefined until a week has been counted.
 */
export declare function casualtyBand(_campaign: Campaign, conflict: Conflict, side: ConflictSide): WarLossBand | undefined;
/** Wounded for each killed at this tempo: the held line's record below it, then between the light and the heavy record. */
export declare function woundedPerKilled(intensity: number): number;
export type WeeklyLosses = {
    readonly killed: number;
    readonly wounded: number;
};
/**
 * One side's central estimate for one week. `pressure` is the share of the
 * week's weight the side carries from the strength ratio alone, before the
 * week's swing, so the figure is derived rather than drawn.
 */
export declare function weeklyLosses(campaign: Campaign, conflict: Conflict, side: ConflictSide, pressure: number): WeeklyLosses;
/**
 * The war's loss bands after this week, each side's running totals widened by
 * how sure anyone can be of them. Both edges accumulate whole people, so a
 * band that was wide while the war was young stays honest about the weeks it
 * was guessed; only the reading coarsens them.
 */
export declare function accumulateCasualties(campaign: Campaign, conflict: Conflict, pressure: Readonly<Record<ConflictSide, number>>): CasualtiesBySide;
/**
 * The week's dead taken off each fighting government's population, split by
 * the people each has in the theater. The central estimate, not the band: the
 * band is what can be said about the dead, and the population loses the dead
 * themselves. The wounded come home.
 */
export declare function warDeathTolls(campaign: Campaign, conflict: Conflict, pressure: Readonly<Record<ConflictSide, number>>): readonly Effect[];
/**
 * The civilians a week of fighting kills in the defender's country, where the
 * war is fought: a share of the defending side's soldiers killed that week.
 */
export declare function civilianDeaths(campaign: Campaign, conflict: Conflict, pressure: Readonly<Record<ConflictSide, number>>): number;
/**
 * A war saved before the dead and wounded were kept apart carries one band of
 * both. It is split at the ratio the war's tempo now reads, the only figure the
 * save offers; a war already split is left alone, so loading twice changes
 * nothing.
 */
export declare function withSplitCasualties(campaign: Campaign): Campaign;
