import { type InstrumentId, type RungLevel } from "./instruments.js";
import { nationName } from "./naming.js";
import type { EngagementKind } from "./engagement.js";
export type WireAct = {
    /** Display names, already as a sentence carries them. */
    readonly actor: string;
    readonly target: string;
    readonly instrument: InstrumentId;
    readonly rung: RungLevel;
    readonly landed: boolean;
    /** The resolver's failure branch id, where one fired. */
    readonly riskId?: string;
    /** The week, so the phrasing shape is stable per act rather than per rung. */
    readonly turn: number;
};
/** A country as a wire sentence carries it, article and all. */
export declare const wireName: typeof nationName;
/** The move as a noun phrase a later paragraph can refer back to. */
export declare function movePhrase(instrument: InstrumentId, rung: RungLevel): string;
/**
 * One sentence, in plain words, about what one government did to another and
 * how it went.
 *
 * Pure and deterministic: the same act in the same week always produces the
 * same sentence, which is what lets a dispatch be composed at read time instead
 * of stored.
 */
export declare function wireLine(act: WireAct): string;
/**
 * What the act leaves standing, as a clause an article can build a paragraph
 * on. Never a figure and never a quote: the composer may only restate what the
 * simulation already decided.
 */
export declare function wireStake(act: WireAct): string;
/**
 * The plain-words phrase for a move named the way the catalogue names it.
 * Falls back to the name itself, lower-cased to sit mid-sentence, which is what
 * a caller handing over something that is not a rung at all ("health program")
 * wants anyway.
 */
export declare function movePhraseNamed(catalogueName: string): string;
/**
 * The catalogue's own name for a rung. A feed item records it in `facts` so the
 * piece behind the headline can say what the move was without the composer
 * having to be handed the ladder.
 */
export declare function rungCatalogueName(instrument: InstrumentId, rung: RungLevel): string | undefined;
/**
 * What the player is warned about before committing: one named failure branch,
 * in plain words, naming the target, in the tense a forecast is written in.
 *
 * Deterministic and phrasing-stable — a forecast that read differently on two
 * openings of the same board would be a second opinion of the same odds.
 */
export declare function wireRisk(act: WireAct & {
    readonly riskId: string;
}): string;
/** The display names of an engagement's two parties, articles already applied. */
export type EngagementAct = {
    readonly kind: EngagementKind;
    readonly actor: string;
    readonly target: string;
    readonly byPresident: boolean;
    readonly received: boolean;
    readonly turn: number;
};
/** The readout of an engagement, in the week it was made. Deterministic for a given act and week. */
export declare function engagementLine(act: EngagementAct): string;
