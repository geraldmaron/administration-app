import { type Campaign, type Effect, type MetricSet } from "@admin/engine";
import type { NationId } from "@admin/world";
import { type ActConfig, type ActOption } from "./catalogue";
/** A relationship reading an act can move, named for whose view it is. */
export type RelationshipKey = "theirTrust" | "ourTrust" | "tension" | "alignment" | "threat" | "reliance";
export type EffectMark = {
    readonly key: RelationshipKey | keyof MetricSet;
    readonly label: string;
    /** The engine's own step on the reading's 0..1 (or -1..1) scale; a screen prints it as points of a hundred beside `word`. */
    readonly delta: number;
    /** Whether the move is good for the President. */
    readonly good: boolean;
    /** How far the step reaches on the one scale every option is drawn on, 0..1. */
    readonly share: number;
    /** The step in words: "Rises a little", "Falls sharply", "+0.4 points". */
    readonly word: string;
};
export type OptionEffects = {
    /** When the marks happen: "If they accept", "Once the Senate ratifies it", "If it works". */
    readonly when: string;
    readonly marks: readonly EffectMark[];
    /** What it starts that no reading shows: a War Powers clock. */
    readonly notes?: readonly string[];
};
/**
 * The largest step a single act takes on any relationship reading: a mutual
 * defense treaty's. Every option is drawn against it, so a call and a treaty
 * read in proportion to each other rather than each filling its own bar.
 */
export declare const EFFECT_SCALE: number;
/** The marks a set of effects makes: the President's edge, their edge, and the panel. */
export declare function marksOf(campaign: Campaign, nation: NationId, effects: readonly Effect[]): readonly EffectMark[];
/** What one option moves, where the engine can say before it is taken. */
export declare function optionEffects(campaign: Campaign, nation: NationId, option: ActOption, config?: ActConfig): OptionEffects | undefined;
