import { type Campaign, type DecisionFramingKey, type EffectPacket, type PressAction } from "@admin/engine";
import { type MetricStance } from "../format/figures.js";
import { type ActComparison } from "../congress/act-comparison.js";
/** The three plays, by the key the engine knows them by. */
export declare const PRESS_ACTIONS: readonly PressAction[];
export type PodiumReading = {
    readonly secretary?: {
        readonly id: string;
        readonly name: string;
        readonly spent: boolean;
    };
    readonly subject: string;
    readonly silence: string;
    readonly standing: {
        readonly value: number;
        readonly percent: string;
        readonly stance: MetricStance;
    };
};
/** The podium this week: the secretary, what reporters will ask about, how long since anyone took a question, and the corps's standing. */
export declare function podiumReading(campaign: Campaign): PodiumReading;
/** A desk a play can be aimed at. */
export type PressDesk = {
    readonly id: string;
    readonly name: string;
};
export declare function pressDesks(campaign: Campaign): readonly PressDesk[];
/** The three plays, the two aimed ones at `desk`. Saying nothing is no play; its clock is the waiting line. */
export declare function pressActComparison(campaign: Campaign, desk: string | undefined): ActComparison;
export declare function pressActPacket(campaign: Campaign, kind: PressAction, desk: string | undefined): EffectPacket;
export type FramingOffer = {
    readonly id: string;
    readonly name: string;
    readonly signed: string;
    /** Weeks left in which the podium can still explain it. */
    readonly weeksLeft: number;
};
/** The orders the podium can still explain: signed in the last weeks and not yet framed. */
export declare function framingOffers(campaign: Campaign): readonly FramingOffer[];
/** The four framings of one order; unframed, reporters judge the text as written. */
export declare function framingComparison(campaign: Campaign, recordId: string): ActComparison;
export declare function framingPacket(campaign: Campaign, recordId: string, framing: DecisionFramingKey): EffectPacket;
/** Sending the press secretary out to take the week's bad answer. */
export declare function takeTheHitComparison(campaign: Campaign): ActComparison;
export declare function takeTheHitPacket(campaign: Campaign): EffectPacket;
