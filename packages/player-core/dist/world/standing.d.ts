import { type Campaign } from "@admin/engine";
import type { NationId } from "@admin/world";
import { type RecordStart, type TrendChange } from "../polling/record-trend";
import type { ReadingBand, Stance } from "../reading";
/** A band with where it sits on its own four steps, 1 to 4, so a screen can light the step. */
export type StandingBand = ReadingBand & {
    readonly level: number;
};
/**
 * One side of a relationship, as a screen captions it.
 *
 * Printing one direction under the other's caption is the error every surface
 * that reads a posture has to avoid, so the caption travels with the band.
 */
export type StandingReading = {
    /** Whose view it is: "Their view of you", "Your read of them". */
    readonly caption: string;
    readonly trust: StandingBand;
};
/**
 * Both directions of the relationship with one government, and the United
 * States' own read of the tension, the common aims and the threat. Their view
 * of the United States is absent and `unread` is true when the services have
 * no read on them.
 */
export type Standing = {
    readonly theirs?: StandingReading;
    readonly ours?: StandingReading;
    readonly unread: boolean;
    readonly tension?: StandingBand;
    readonly aims?: StandingBand;
    readonly threat?: StandingBand;
    readonly trend: StandingTrend;
};
/**
 * How the relationship has moved, as the engine observed it week by week. The
 * changes are for drawing a slope, not for printing: a screen still says the
 * band. Their side is absent while the services cannot read them, for the same
 * reason their current band is: the record holds it, the President does not.
 */
export type StandingTrend = {
    readonly start: RecordStart;
    readonly ours?: TrendChange;
    readonly theirs?: TrendChange;
    readonly tension?: TrendChange;
};
export declare const THEIR_VIEW = "Their view of you";
/** The observed course of one government's standing with the United States. */
export declare function standingTrend(campaign: Campaign, nation: NationId, unread: boolean): StandingTrend;
export declare function standingToward(campaign: Campaign, nation: NationId): Standing | undefined;
/**
 * How a government is drawn on the board: its own trust in the United States
 * where the services read it, "unread" where they do not, and nothing for a
 * government with no relationship kept either way. The fill, the stance
 * filter and the board's counts all read this, so they cannot disagree.
 */
export declare function boardStance(standing: Standing | undefined): Stance | "unread" | undefined;
type GoodsTrade = {
    readonly imports: number;
    readonly exports: number;
};
/** US goods trade with every partner together, in the trade volumes' own units. */
export declare function goodsTradeTotals(campaign: Campaign): GoodsTrade;
/** A partner's share of US goods trade, 0..1, from the committed trade volumes. */
export declare function goodsTradeShare(campaign: Campaign, nation: NationId): number | undefined;
export {};
