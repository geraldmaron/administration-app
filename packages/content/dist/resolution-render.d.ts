import { type UnitDesignation } from "@admin/world";
import { type ResolutionBeat, type ResolutionSequenceDef } from "./resolution-beat.js";
/** The nations and the person a sequence is played for. */
export type ResolutionCast = {
    /** The player's own government, as the roster displays it ("the United States"). */
    readonly actor: string;
    readonly target: string;
    readonly person: string;
};
export type RenderedResolutionStep = {
    readonly kind: ResolutionBeat["kind"];
    readonly outcome: ResolutionBeat["outcome"];
    /** The step's line with every slot filled and nothing left to substitute. */
    readonly line: string;
};
export type RenderedResolutionSequence = {
    readonly id: string;
    readonly steps: readonly RenderedResolutionStep[];
    /** The one formation the whole sequence names, absent if no step names one. */
    readonly unit?: UnitDesignation;
};
/**
 * One sequence, ready to read. `seedParts` are joined the way every other
 * deterministic draw in the game joins a stream key, so the same campaign and
 * the same resolution always name the same formation.
 *
 * The unit is drawn once per sequence rather than once per step, because two
 * steps that both say {{unit}} are talking about the same formation.
 */
export declare function renderResolutionSequence(def: ResolutionSequenceDef, cast: ResolutionCast, ...seedParts: Array<string | number>): RenderedResolutionSequence;
