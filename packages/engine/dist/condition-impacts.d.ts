import type { ConditionKind, ConditionScope } from "./state.js";
import type { RestingPointPath } from "./policy-stats.js";
export declare const SCOPE_WEIGHT: Readonly<Record<ConditionScope, number>>;
export type ImpactProfile = {
    readonly regimeStability: number;
    readonly protestPressure: number;
    readonly insurgencyPressure: number;
    readonly reserveDrain: number;
    /**
     * NOT a decrement applied here — a pressure term `macroDriftPhase` reads.
     *
     * A plain `growth` number subtracted from the nation's own stat every week is
     * harmless for a flood, whose onset does not read growth, and a trap for a
     * recession, whose onset does: the condition becomes the largest writer of
     * the figure it is gated on, so its own drag keeps its onset pressure high
     * and the recovery test it closes on can never be met. A campaign then
     * converges on growth pinned at the schema's clamp under a permanent
     * maximum-severity recession, a ratchet wearing weather's clothes.
     *
     * The rule that prevents it: a standing condition may not write the stat its
     * own onset reads (`STANDING_ONSET`, below). Rather than keep two mechanisms
     * and require the next kind added to know which one it may use, every kind,
     * acute included, routes its macro effect through here, so growth,
     * inflation and unemployment have exactly one writer and one computable
     * equilibrium. A kind whose onset reads a rate may not carry that rate here —
     * Law 8 — and the three rate kinds carry none at all: they are labels.
     *
     * ALL THREE terms are signed as harm, not as a delta: a positive `growth` is
     * a drag on output, a positive `inflation` makes the country dearer, and a
     * positive `unemployment` puts more people out of work. Growth and
     * unemployment therefore enter the drift phase on the same sign; inflation
     * enters on the opposite one — that is the phase's problem and not this
     * table's. Authoring a term as a delta rather than as harm is the mistake to
     * watch for here, because it reads as correct on the growth and unemployment
     * channels and inverts the inflation one.
     */
    readonly macroPressure: {
        readonly growth: number;
        readonly inflation: number;
        readonly unemployment: number;
    };
};
export declare const NO_IMPACT: ImpactProfile;
export declare const IMPACTS: Readonly<Record<ConditionKind, ImpactProfile>>;
/**
 * What a hazard is called: the noun a sentence uses, and the label a screen
 * prints above a figure.
 *
 * One table, because there were two and they disagreed. The engine wrote "a
 * cyclone" into every headline while the board printed "Cyclone" above the
 * severity, and neither was the word an American reader would use for a storm
 * that made landfall in Florida. A second source for the same word is a second
 * chance to be wrong in only one of them.
 *
 * `noun` carries its own article, because the article is part of the word: it is
 * "flooding" and "a tornado", and a caller that prepended "a" would write "a
 * flooding". `label` is the bare name, title-cased for a heading.
 */
export type HazardWords = {
    readonly noun: string;
    readonly label: string;
};
/**
 * Which ocean a tropical cyclone came out of, which is the only thing that
 * decides what it is called.
 *
 * The same storm is a hurricane in the Atlantic and the eastern Pacific, a
 * typhoon in the western Pacific, and a cyclone in the Indian Ocean and the
 * south Pacific. The game is set in the United States, so the word a player
 * reads for their own country's storms has to be "hurricane" — and a storm
 * hitting the Philippines still has to be a typhoon, or the dataset's fifty
 * other countries are narrated in a register nobody uses about them either.
 */
export type CycloneBasin = "atlantic" | "northwest-pacific" | "indian";
/** Where a coastline sits, for the purpose of naming its storms. */
export declare function cycloneBasinOf(geo: {
    readonly lat: number;
    readonly lon: number;
}): CycloneBasin;
/**
 * The words for a hazard, in the basin it happened in.
 *
 * `geo` absent reads as the Atlantic, which is the United States: every home
 * sentence in the game is about American ground, and a caller with no country
 * in hand is on it.
 */
export declare function hazardWords(kind: ConditionKind, geo?: {
    readonly lat: number;
    readonly lon: number;
}): HazardWords;
/** The noun, article included, for a sentence. */
export declare function hazardNoun(kind: ConditionKind, geo?: {
    readonly lat: number;
    readonly lon: number;
}): string;
/** Every spelling the condition headline writer can emit, for reading archived headlines. */
export declare function hazardNouns(kind: ConditionKind): readonly string[];
/** The bare name, for a heading over a figure. */
export declare function hazardLabel(kind: ConditionKind, geo?: {
    readonly lat: number;
    readonly lon: number;
}): string;
/**
 * The resting point a kind's own cause sits on, and which direction of a
 * program's shift on it answers the condition.
 *
 * Without this, having *chosen* a program in the answering department was the
 * whole of the reading, so austerity sped a recession's recovery exactly as fast
 * as stimulus did, and borrowing harder "answered" a debt crisis. A stance is
 * attention to a file; a stance pushing the wrong way is not.
 *
 * Only the kinds whose cause is one of the five resting points, which is the
 * five standing conditions the economy produces plus unrest. A hurricane has no
 * axis — no program makes the storm smaller — so a weather kind keeps the plain
 * reading of whether the department is being run at all.
 */
export declare const CONDITION_AXIS: Partial<Record<ConditionKind, {
    readonly path: RestingPointPath;
    readonly answers: 1 | -1;
}>>;
export declare const SMALL_STATE_POPULATION = 1000000;
/** The extent phrase for a scope, sized to the country; a country of unknown size reads as a large one. */
export declare function scopePhrase(scope: ConditionScope, population?: number): string;
