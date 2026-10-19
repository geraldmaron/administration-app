import type { InstrumentId, RungLevel } from "./instruments.js";
export type SkillProxy = "passive" | "reckless" | "prudent" | "hawk" | "diplomat" | "economist" | "institutionalist" | "populist" | "technocrat" | "opportunist" | "spendthrift" | "escalator" | "caretaker";
/**
 * How a player picks among the acts they can afford.
 *
 * `heaviest` reaches for the top rung it can pay for; `surest` takes the best
 * odds and, among equal odds, the gentlest rung; `climbing` starts at the
 * bottom and works up as the term runs, which is what escalation actually
 * looks like when someone is doing it on purpose; `measured` sits at the
 * middle of the ladder and refuses both ends.
 */
export type RungBias = "heaviest" | "surest" | "climbing" | "measured";
export type ProxyProfile = {
    /** Why this player is in the population — the question only they can answer. */
    readonly summary: string;
    /**
     * The program they mean to govern under. Adopted in the first week where the
     * domain is the President's own; where its substance is revenue, the bill is
     * transmitted and the program waits on the count, the same way a player's
     * does.
     */
    readonly program: readonly string[];
    /**
     * The success chance they refuse to act below. Above 1 means they never act
     * at all, which is how `passive` is expressed as data rather than as a case.
     */
    readonly oddsFloor: number;
    /**
     * The share of the opening treasury they will not spend past in one act.
     * 0 means they will spend to the floor.
     */
    readonly reserveShare: number;
    readonly rungBias: RungBias;
    /** Reached for first where anything affordable matches; empty means no preference. */
    readonly instruments: readonly InstrumentId[];
    /** Names sent up per week. 0 is a president who never fills an office. */
    readonly nominationsPerWeek: number;
    /** How many names they keep moving at once. */
    readonly pipelineWidth: number;
    /** Acts only where the act is free — high odds, trivial price, nobody objects. */
    readonly freeWinsOnly: boolean;
};
/** The rung a `climbing` player is reaching for, given how far into the term they are. */
export declare function climbingRung(step: number, horizon: number): RungLevel;
/** Where a `measured` player sits on the ladder. */
export declare const MEASURED_RUNG: RungLevel;
export declare const PROXY_PROFILES: Readonly<Record<SkillProxy, ProxyProfile>>;
/**
 * Ordered so a report reads as a population rather than as an alphabet: the
 * three that bracket the space first, then the ten that fill it in.
 */
export declare const SKILL_PROXIES: readonly SkillProxy[];
/**
 * The three the standing bands in `balance.test.ts` were measured against.
 *
 * Kept as its own list rather than sliced off the front of `SKILL_PROXIES`,
 * because what makes these three special is not their position — it is that
 * their numbers are written down in a gate, and reordering the population
 * must not silently re-point that gate at a different set of players.
 */
export declare const BRACKET_PROXIES: readonly SkillProxy[];
/** A fiscal player, with the programs it takes up partway through the term, week by week since the oath. */
export type FiscalProxyProfile = ProxyProfile & {
    readonly schedule?: readonly {
        readonly week: number;
        readonly program: readonly string[];
    }[];
};
/**
 * Players who differ from one another only in how they run the national books,
 * for measuring what borrowing costs a President. Kept apart from the
 * population above so that adding one moves none of the bands measured on it.
 */
export declare const FISCAL_PROXY_PROFILES: Readonly<Record<string, FiscalProxyProfile>>;
