import type { Nation, NationId, RedLine } from "@admin/world";
import type { InstrumentId, RungLevel } from "./instruments.js";
import { type Campaign } from "./state.js";
/** What crossing a line of this family looks like, and what answering it looks like. */
export type RedLineRule = {
    /** The instruments that can cross this line at all. */
    readonly instruments: readonly InstrumentId[];
    /** The rung at which an act on one of those instruments becomes a crossing. */
    readonly crossedFrom: RungLevel;
    /** The rung the declaring government's answer starts at. */
    readonly answeredAt: RungLevel;
};
/**
 * Every authored `RedLine.id`, and what it means to cross it.
 *
 * Keyed on the id rather than parsed out of the sentence: the sentence is
 * written for the player and rewording it must not silently change what the
 * government will answer. `red-lines.test.ts` fails if the dataset ever ships
 * an id this table does not carry, so a new line cannot arrive undeclared.
 */
export declare const RED_LINE_RULES: Readonly<Record<string, RedLineRule>>;
/** A line one government declared and another government has since crossed. */
export type RedLineCrossing = {
    readonly holder: NationId;
    readonly by: NationId;
    readonly redLine: RedLine;
    readonly rule: RedLineRule;
    /** The turn the crossing act landed on. */
    readonly turn: number;
};
/**
 * How long a crossing stays answerable.
 *
 * A government that has been struck answers in the weeks after, not for the
 * rest of the campaign: past this the act is a grudge on the relationship,
 * which is where the record of it belongs and where it already decays.
 */
export declare const CROSSING_ANSWERABLE_FOR = 8;
/**
 * The lines this government declared that somebody has crossed lately.
 *
 * Two records are read, and both are records of acts that actually happened.
 * The player's own commitments are stated on the ledger — instrument, rung and
 * target — so a strike on Iran's declared sites is legible as exactly that. A
 * war the actor is currently defending is the other: an invasion in progress
 * crosses every line a country has, and nobody has to look up which.
 *
 * Nothing here reads an NPC's commitments against a third party, because the
 * ledger does not record which government took a world action — only that one
 * did. A crossing this module cannot see is better than a crossing it invents.
 */
export declare function crossingsAgainst(campaign: Campaign, holder: NationId): readonly RedLineCrossing[];
/**
 * The crossing this move would be answering, if it is answering one.
 *
 * A move answers a crossing when it is aimed at whoever crossed the line and
 * reaches at least as far up the ladder as the line's own answer: a démarche
 * is not an answer to a strike, and the government said as much itself.
 */
export declare function answers(crossings: readonly RedLineCrossing[], target: NationId, rung: RungLevel): RedLineCrossing | undefined;
/**
 * How much a government wants a move because it is the answer it promised.
 *
 * Scaled by how far the answer goes past the rung the line itself names, so
 * the promised answer is preferred to an unpromised escalation on top of it —
 * a state that said it would answer a strike does not thereby want a war.
 */
export declare function redLinePull(crossing: RedLineCrossing | undefined, rung: RungLevel): number;
/** Whether this government's own lines are about ground, which is what a disputed border is. */
export declare function holdsTerritorialLine(nation: Nation): boolean;
