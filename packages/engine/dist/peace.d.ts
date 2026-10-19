import { type NationId } from "@admin/world";
import { type Campaign, type Conflict, type ConflictSide } from "./state.js";
import type { EffectPacket } from "./effects.js";
import type { RngStreams } from "./rng.js";
import { type Term, type TermKey, type Willingness, type WillingnessForecast } from "./willingness.js";
export type PeaceProjection = {
    readonly conflict: Conflict;
    readonly ourSide: ConflictSide;
    readonly counterpart: NationId;
    /** As prose carries it: "the United Kingdom", "China". */
    readonly counterpartName: string;
    /** 0..1 — how badly the other side wants this over. */
    readonly willingness: number;
    readonly wouldAccept: boolean;
    /** Whether terms are already on the table between the two governments. */
    readonly offered: boolean;
    readonly reasoning: string;
    /** The weighed terms and the bar they were read against, which is what the verdict is. */
    readonly terms: readonly Term[];
    readonly threshold: number;
    readonly forecast: WillingnessForecast;
    readonly leading: readonly TermKey[];
};
/** Where willingness has to reach before a government signs rather than fights on. */
export declare const ACCEPTS_TERMS = 0.5;
/** How far the persistent noise can move another government's answer. The President's table reads it without. */
export declare const PEACE_NOISE = 0.05;
/**
 * The authored world's middle on vengefulness, a dataset constant for the
 * reason the other temperament centers are: a reshaped world must still move
 * the verdict, which a center taken from the live campaign would absorb.
 */
export declare const VENGEFULNESS_CENTER: number;
/** One government's question about ending its part in one war: the terms, and the bar it reads them against. */
export type PeaceReading = {
    readonly nation: NationId;
    readonly side: ConflictSide;
    readonly terms: readonly Term[];
    readonly threshold: number;
};
/**
 * What the war has cost the side, weighted toward the cost rather than the
 * map: a government whose country is worn out and whose people have stopped
 * backing the war signs while still holding ground, and one that is winning
 * does not sign because it is asked nicely. A grudge holds it in, weighted by
 * how well the dataset knows its character; danger at home lowers the bar,
 * because for a government that may fall a settlement is survival.
 */
export declare function peaceReading(campaign: Campaign, conflict: Conflict, side: ConflictSide, nation?: NationId): PeaceReading;
/** The decision: the reading weighed, with the noise the caller drew (none for the President's table). */
export declare function weighPeace(reading: PeaceReading, noise?: number): Willingness;
/**
 * What a peace move would find, before it is made. Pure and seed-independent,
 * the same contract every projection in the engine holds: the decision with
 * the noise left out, which is exactly what `settleWar` holds the counterpart
 * to.
 */
export declare function projectPeace(campaign: Campaign, conflictId: string): PeaceProjection | undefined;
/** Every war this government is a party to, with the peace table read for each. */
export declare function selectPeaceTables(campaign: Campaign): readonly PeaceProjection[];
export type PeaceResult = {
    readonly ok: true;
    readonly packet: EffectPacket;
    readonly projection: PeaceProjection;
} | {
    readonly ok: false;
    readonly reason: string;
};
/**
 * Sue for peace.
 *
 * Costs standing whatever comes of it, and deliberately does not depend on
 * whether the other side will take it: putting terms to a government that is
 * still winning is a thing presidents do, and it is exactly the version of this
 * act that is read at home as weakness.
 */
export declare function offerTerms(campaign: Campaign, conflictId: string): PeaceResult;
/**
 * End it at a table.
 *
 * Requires both that terms are on the table and that the other government would
 * take them — the two halves of an agreement, refused separately so a player
 * who cannot end a war is told which half is missing. A country that joined
 * somebody else's war cannot sign that war's peace for the government it came
 * in beside; it can leave. The settled war carries `settleByAgreement`'s own
 * shape, so a war ended here and a war ended by a scenario reply are
 * indistinguishable to everything downstream.
 */
export declare function settleWar(campaign: Campaign, conflictId: string): PeaceResult;
/**
 * Cool the front without ending it.
 *
 * One step down for one week's worth of restraint, which is exactly the size of
 * the step a strike puts up — so a president who pulls back and then hits again
 * has spent a week and arrived where they started.
 */
export declare function coolFront(campaign: Campaign, conflictId: string): PeaceResult;
export type LeaveProjection = {
    readonly conflict: Conflict;
    readonly side: ConflictSide;
    /** The principal the United States came in beside, and leaves fighting. */
    readonly alongside: NationId;
    readonly against: NationId;
    readonly cost: {
        readonly standing: number;
    };
    /** Why the country cannot leave, where it cannot. */
    readonly refusal?: string;
};
/**
 * What walking out of a war would cost, stated before it is done, from the
 * same constants `leaveWar` spends. Only a war the country joined can be
 * left; a war it is a principal of ends at a table.
 */
export declare function projectLeave(campaign: Campaign, conflictId: string): LeaveProjection | undefined;
export type LeaveResult = {
    readonly ok: true;
    readonly packet: EffectPacket;
    readonly projection: LeaveProjection;
} | {
    readonly ok: false;
    readonly reason: string;
};
/**
 * Leave the war. The principals fight on, and their peace, when it comes, is
 * not this country's to sign. The forces committed to it come home, and the
 * government left fighting remembers.
 */
export declare function leaveWar(campaign: Campaign, conflictId: string): LeaveResult;
/**
 * Two governments ending their own war at a table, when both would sign.
 * The same willingness the President's counterpart answers, with the
 * persistent noise in, so no victor is named and neither side is told it won.
 * Nothing where the President's country is a principal: that table is the
 * President's.
 */
export declare function npcSettlementPacket(campaign: Campaign, conflict: Conflict, streams: RngStreams): EffectPacket | undefined;
/**
 * The governments that came into this war and now want out, each leaving on
 * its own answer to the same question a principal answers. The President's
 * country is not among them: it leaves only by the President's act.
 */
export declare function departurePackets(campaign: Campaign, conflict: Conflict, streams: RngStreams): readonly EffectPacket[];
/**
 * The peace questions a war's week asks before it is fought: whether its two
 * principals end it at a table, and otherwise which of the governments that
 * joined it go home. A war that settles loses nobody first.
 */
export declare function alliancePackets(campaign: Campaign, conflict: Conflict, streams: RngStreams): readonly EffectPacket[];
