import type { NationId } from "@admin/world";
import { type InstrumentId, type RungLevel } from "./instruments.js";
import { type Campaign } from "./state.js";
/** How long a received act stays answerable, in weeks. A quarter: past it the act is the record's, not the week's. */
export declare const RESPONSE_WINDOW_WEEKS = 13;
/** One coercive act the record states, as a reader of who did what to whom. */
export type StatedAct = {
    readonly actor: NationId;
    readonly target: NationId;
    readonly instrument: InstrumentId;
    readonly rung: RungLevel;
    readonly turn: number;
    /**
     * The act's place in the ledger. Two governments can answer each other inside
     * one week, since each acting government's packet lands before the next one
     * decides, so which came first is read from the record's order, never the turn.
     */
    readonly order: number;
    readonly landed: boolean;
    /** The actor's own stamp says the act was an answer to something. */
    readonly answering: boolean;
};
/** What one government means to answer, and the act its answer is measured against. */
export type ResponseIntent = {
    readonly toward: NationId;
    /** 0..1, after decay, saturation, resolve and whatever answers it has already given. */
    readonly intent: number;
    readonly instrument: InstrumentId;
    readonly rung: RungLevel;
    /** The partner coerced, where the intent is a partner's rather than the target's own. */
    readonly onBehalfOf?: NationId;
    /** The heaviest act it is answering, as it was made: what a bulletin names. */
    readonly answered: {
        readonly instrument: InstrumentId;
        readonly rung: RungLevel;
    };
};
/** Every government's pending intents, keyed by holder then by the government it would answer. */
export type ResponseBook = ReadonlyMap<string, ReadonlyMap<string, ResponseIntent>>;
/** The coercive acts inside the answerable window, oldest first. */
export declare function actsInWindow(campaign: Campaign): readonly StatedAct[];
/** How hard an act pressed, before age: the instrument's coercion, the rung's height, and whether it landed. */
export declare function actWeight(act: Pick<StatedAct, "instrument" | "rung" | "landed">): number;
/**
 * How much a government is in a position to answer this one at all: its weight
 * against the other's, its temper, and how much of its own trade it would be
 * putting at risk. Honduras sanctioned by the United States has little weight,
 * a mild temper and two fifths of its trade on the line; China has none of
 * those reasons to hold.
 */
export declare function resolveToAnswer(campaign: Campaign, holder: NationId, coercer: NationId): number;
/** Every government's pending intent to answer, read off the window of the record. */
export declare function responseBook(campaign: Campaign): ResponseBook;
/** The heaviest intent a government holds against anybody: what the actor draw reads. */
export declare function strongestIntent(book: ResponseBook, holder: NationId): number;
export declare function answerFit(intent: Pick<ResponseIntent, "instrument" | "rung">, instrument: InstrumentId, rung: RungLevel): number;
/** The response term for one candidate: the pending intent toward its target, by how well the move answers it. */
export declare function responsePull(intent: ResponseIntent | undefined, instrument: InstrumentId, rung: RungLevel): number;
