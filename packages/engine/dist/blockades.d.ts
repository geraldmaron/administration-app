import type { NationId } from "@admin/world";
import type { Effect } from "./effects.js";
import { type InstrumentContext } from "./instrument-gates.js";
import type { Campaign } from "./state.js";
export type Blockade = {
    readonly id: string;
    readonly imposer: NationId;
    readonly target: NationId;
    readonly startedTurn: number;
    /** 0..1 of the target's seaborne trade stopped while it stands. */
    readonly cut: number;
    /** The war the blockade opened or joined. Every blockade has one, because a blockade is an act of war. */
    readonly conflictId: string;
    /** The deployment that pays for the hulls, where the imposer's books carry one. */
    readonly commitmentId?: string;
    /** The War Powers introduction it was reported under, where the imposer has a Congress. */
    readonly obligationId?: string;
};
export type BlockadeEffect = {
    readonly kind: "blockade";
    readonly set: Blockade;
};
export declare function applyBlockade(campaign: Campaign, effect: BlockadeEffect): Campaign;
/** Planning value: the share of seaborne trade a blockade stops against a coast with nothing to funnel it. */
export declare const BLOCKADE_BASE_CUT = 0.5;
/** Planning value: what a strait the target's trade has to pass adds, per unit of exposure: a navy sits on the strait. */
export declare const BLOCKADE_STRAIT_CUT = 0.25;
/** Planning value: the most a blockade stops; some trade always leaks by land, by air and by night. */
export declare const BLOCKADE_MAX_CUT = 0.9;
/** What a blockade ordered with this force against this coast would stop. */
export declare function blockadeCut(ctx: InstrumentContext): number;
/**
 * The record a landed blockade leaves, tied to the effects in the same packet
 * that hold it on station.
 */
export declare function blockadeRecord(ctx: InstrumentContext, conflictId: string, siblings: readonly Effect[]): Effect;
/** Every blockade still on station, oldest first. */
export declare function blockadesInForce(campaign: Campaign): readonly Blockade[];
/** The blockade this government already holds on that one, if it holds one. */
export declare function blockadeBy(campaign: Campaign, imposer: NationId, target: NationId): Blockade | undefined;
/**
 * How much of a country's seaborne trade is stopped this week, 0..1.
 *
 * The heaviest blockade on it, not the sum: two navies off one coast stop the
 * same ships, and a second blockade adding its cut to the first would be the
 * compounding this record exists to end.
 */
export declare function blockadeCutOn(campaign: Campaign, nation: NationId): number;
