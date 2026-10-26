/**
 * The opening board: the world this administration finds at the oath.
 *
 * Two boards. The default is drawn from the campaign seed: zero, one or two
 * interstate wars from a catalog of hostile pairs, each pair's weight a
 * planning value. The other is the world as of 2026, held as a named preset so
 * the real snapshot stays playable. Both carry the civil and non-state wars as
 * insurgencies in their hosts, US forces at their installations, and the
 * sanctions programs in force; the seeded board keeps each of those by how
 * likely the table reads it to last into 2029.
 *
 * The United States is never a belligerent at the oath, no pair that shares a
 * defense body is drawn, and no pair where either side is a US treaty ally is
 * drawn, because a war on an ally at the oath would leave the country owing a
 * war it never chose. The draw is hashed from the seed, never streamed, so a
 * board replays exactly.
 */
import { type NationId } from "@admin/world";
import type { Campaign, Commitment, Conflict, GameDate, NationRuntime, OperatorRuntime } from "./state.js";
import type { TradeMeasure } from "./trade.js";
/** A held front opens under the held line, so the tick reads it as held from its first week. */
export declare const OPENING_HELD_INTENSITY: number;
/** The day the carried-conflicts table was read, which is the date the preset claims. */
export declare const WORLD_2026_AS_OF: GameDate;
type OpeningPosture = "active" | "held";
type Flashpoint = {
    readonly aggressor: NationId;
    readonly defender: NationId;
    readonly posture: OpeningPosture;
    /** When the fighting began, where a real war stands behind the pair. */
    readonly since?: GameDate;
    /** Plausibility weight: the dyad's tension, halved where its sources record no fighting in 2025 or 2026. A planning value. */
    readonly weight: number;
    readonly source: string;
};
/** Every pair the seeded board can draw from: the carried wars first, then the dyad pairs. */
export declare const FLASHPOINT_CATALOG: readonly Flashpoint[];
/** The carried interstate wars as of 2026: Russia against Ukraine active, the Iran front held, the United States absent. */
export declare function presetWorld2026(asOf?: GameDate): readonly Conflict[];
/**
 * The seeded board's wars, marked inherited with no real date claimed. Without
 * a roster every catalog pair counts as drawable, which is the draw a script
 * sees before a campaign exists.
 */
export declare function openingBoard(seed: string, nations?: Readonly<Record<string, NationRuntime>>, asOf?: GameDate): readonly Conflict[];
/**
 * One measure an inherited program files: what kind it is, the trade sector a
 * sectoral program reaches (a list-based program designates named persons and
 * reaches none), the day the authority it rests on took effect, so evasion
 * reads a program the world has lived with for years as mature, and the
 * primary text the scope and date were read from.
 */
export type InheritedProgram = {
    readonly kind: "embargo" | "sanctions" | "asset-restriction";
    readonly sector?: string;
    readonly listed?: true;
    /** An import ban at our border, which designates nobody abroad. */
    readonly direction?: "imports";
    /** 0..1 of the sector's sales the designated companies carry, where the program names companies. */
    readonly covered?: number;
    readonly since: GameDate;
    /** The source's own words for the day the authority took effect, which `since` must match. */
    readonly effective: string;
    readonly source: string;
};
/**
 * What each carried program actually reaches, read 2026-10-25, dated at the
 * day its authority took effect. A comprehensive embargo stops what the target
 * sells the United States; a sectoral designation reaches the sector's sales
 * (or the designated companies' share of them) to everyone the dollar
 * touches; an import ban stops only what crosses our border; a list-based
 * program designates people and cuts no trade.
 */
export declare const INHERITED_PROGRAMS: Readonly<Record<string, readonly InheritedProgram[]>>;
/**
 * Which world a campaign opens on: a board drawn from the campaign seed, or
 * the world as of 2026 held as a named preset. The seeded board is the
 * default; the preset exists so the real snapshot stays playable.
 */
export type OpeningPreset = "seeded" | "world-2026";
/** Everything the board carries into the oath, each keyed the way the campaign stores it. */
export type OpeningWorld = {
    readonly conflicts: readonly Conflict[];
    readonly operators: readonly OperatorRuntime[];
    readonly commitments: readonly Commitment[];
    readonly measures: readonly TradeMeasure[];
};
/**
 * The world this administration finds at the oath: the wars, the insurgencies
 * in their hosts, US forces at their installations (and the Gulf posture where
 * the board carries the Iran front), and the sanctions programs in force.
 */
export declare function openingWorld(nations: Readonly<Record<string, NationRuntime>>, asOf: GameDate, seed: string, preset?: OpeningPreset): OpeningWorld;
/** The carried rows a board left out, and why, for the board's report. */
export declare function openingBoardOmissions(nations: Readonly<Record<string, NationRuntime>>): readonly string[];
export type InheritedWorldReading = {
    readonly banner: string;
    readonly mapped: string;
    readonly wars: readonly {
        readonly id: string;
        readonly asOf: GameDate;
        readonly source: string;
    }[];
    readonly insurgencies: readonly NationId[];
};
/**
 * The banner over the world the administration found: the wars it inherited
 * with where each was read from, and the insurgencies it found in their hosts.
 * Undefined on a board that carried no war.
 */
export declare function selectInheritedWorld(campaign: Campaign): InheritedWorldReading | undefined;
/** The board's lines. None claims a date the board did not read, and each says what the game set rather than reported. */
export declare const OPENING_LINES: {
    readonly underWay: "The war was already under way when this administration took office.";
    readonly mapped: "Its opening state was set by the game from the transition's picture, not reported.";
    readonly since: (date: GameDate) => string;
    readonly banner: "The world as this administration found it.";
    readonly bannerAsOf: (date: GameDate) => string;
    readonly posture: "The Gulf posture is the game's planning estimate; the buildup's direction is reported, its size is not.";
};
export {};
