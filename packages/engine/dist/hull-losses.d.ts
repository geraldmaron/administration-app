import { type ForceAssetId, type NationId } from "@admin/world";
import type { Effect } from "./effect-types.js";
import type { RngStreams } from "./rng.js";
import { type Campaign, type CasualtiesBySide, type Conflict, type ConflictSide } from "./state.js";
/**
 * Chance a week that one exposed hull is lost, at full intensity, against an
 * enemy that can fire on ships. From the Navy's account of Desert Storm: two
 * warships (Tripoli and Princeton) put out of action by mines inside about six
 * weeks with about 115 US warships in theater, 2 / (6 × 115) ≈ 0.003 (Navy
 * report "USN in Desert Shield, Desert Storm", gulflink.health.mil/histories/
 * db/navy/usnavy_053.html and usnavy_056.html, opened 2026-10-13). Earnest
 * Will reads lower, one hit in about 61 weeks with 12 to 30 ships, which fits a
 * cooler war. The hottest war in the series is read as full intensity.
 */
export declare const HULL_LOSS_PER_WEEK = 0.003;
/**
 * Planning value: the share of a lost hull's crew killed. The surface
 * combatants sunk in 1982 lost 7 to 12 percent of their crews (Sheffield 20
 * of 281, Coventry 19 of 287, Ardent 22 of 177; secondary counts, opened
 * 2026-10-13), and Stark, hit and saved in 1987, lost 37 (Navy report,
 * usnavy_018.html). A crew of the catalog's size times this share.
 */
export declare const LOST_CREW_KILLED = 0.1;
export type HullLoss = {
    readonly id: string;
    readonly nation: NationId;
    readonly unitType: ForceAssetId;
    /** The hull number and name, where the register still has an unlost name in the class. */
    readonly hull?: string;
    readonly name?: string;
    readonly conflictId: string;
    readonly turn: number;
    readonly killed: number;
};
export type HullLossEffect = {
    readonly kind: "hullLoss";
    readonly set: HullLoss;
};
export declare function applyHullLoss(campaign: Campaign, effect: HullLossEffect): Campaign;
/** Every hull lost so far, oldest first; absent on older saves, which read as none. */
export declare function selectHullLosses(campaign: Campaign): readonly HullLoss[];
/** A register name as a sentence reads it: "JOHN S MCCAIN" is "John S. McCain". */
export declare function hullDisplayName(name: string): string;
export type HullWeek = {
    readonly effects: readonly Effect[];
    readonly side?: ConflictSide;
    readonly killed: number;
};
/**
 * Whether the war costs the President a hull this week, and what the loss
 * writes. At most one hull a war a week, decided on a stream of its own so no
 * draw the war's week already makes moves.
 */
export declare function hullLossThisWeek(campaign: Campaign, conflict: Conflict, streams: RngStreams): HullWeek;
/** The war's loss bands with a lost crew's dead added to the President's side, counted as its own are. */
export declare function withHullDeaths(casualties: CasualtiesBySide, week: HullWeek): CasualtiesBySide;
