import type { NationId } from "@admin/world";
import { type ConsequenceValence, type RungBand } from "./consequences.js";
import type { InstrumentId, RungLevel } from "./instruments.js";
import type { FeedItem } from "./state.js";
/** The situation a sequence is authored against, as the resolver produces it. */
export type ResolutionSequenceSituation = {
    readonly instrument: InstrumentId;
    readonly rungBand: RungBand;
    readonly valence: ConsequenceValence;
    /** The named failure branch, present only on a failure. */
    readonly riskId?: string;
};
/**
 * The engine's view of an authored step sequence: what selection keys on, and
 * nothing else.
 *
 * The steps, their lines and their slot constraints stay in the content package
 * and never come through here. The engine decides *which* sequence a resolution
 * draws; filling it is the content renderer's job, and a copy of the fill rules
 * on this side would be a second thing to keep in lockstep forever.
 */
export type ResolutionSequenceEntry = {
    readonly id: string;
    readonly instrument: InstrumentId;
    readonly rungBands: readonly RungBand[];
    readonly valence: ConsequenceValence;
    readonly riskAffinity?: readonly string[];
    readonly weight: number;
};
/**
 * What a resolution carries so a surface can play the sequence it drew.
 *
 * The id rather than the document, for the same reason a drawn consequence
 * carries its id: the caller owns the pool it handed over and can look the
 * document back up, and a result that stays plain data still saves and diffs.
 */
export type StagedResolution = {
    readonly sequenceId: string;
    /** The instrument, rung band, valence and branch the draw was keyed on. */
    readonly situationKey: string;
    /**
     * What a renderer joins to name the same formation this act named. Handed
     * back rather than left to be recomposed, because the fill seam lives on the
     * content side and the two have to draw the same unit for the same campaign.
     */
    readonly seedParts: readonly string[];
};
/**
 * The canonical situation string, in the order the content package's own key
 * function writes it. It is a seed and a label, never a contract either side
 * parses: matching is done field by field below.
 */
export declare function resolutionSituationKey(situation: ResolutionSequenceSituation): string;
/**
 * The sequence this situation plays, or nothing.
 *
 * Keyed rather than streamed: a resolution is read back on the Record and
 * re-rendered every time a screen mounts, and a stateful draw would give the
 * same act different steps on the second reading. The hash is over the campaign
 * seed, the act and the situation, so the same read is the same steps forever
 * and two campaigns that made the same move do not watch the same one.
 */
export declare function selectResolutionSequence(pool: readonly ResolutionSequenceEntry[], situation: ResolutionSequenceSituation, seed: string): ResolutionSequenceEntry | undefined;
/** Everything the draw is keyed on that is not the situation itself. */
export type StagedResolutionAct = {
    readonly campaignSeed: string;
    readonly actor: NationId;
    readonly target: NationId;
    readonly instrument: InstrumentId;
    readonly rung: RungLevel;
    readonly turn: number;
};
/**
 * The staged reading of one resolved act, spread straight into the result.
 *
 * An empty object rather than an undefined key, so a resolution nobody banked a
 * sequence for hands back exactly the object it always did.
 */
export declare function stagedResolutionFor(act: StagedResolutionAct, valence: ConsequenceValence, riskId: string | undefined, pool: readonly ResolutionSequenceEntry[] | undefined): {
    readonly staged?: StagedResolution;
};
/**
 * What the rendered sequence turned out to have named.
 *
 * The designation arrives from the caller rather than being drawn here. The
 * constraint a step's verbs put on the draw is authored beside the line, on the
 * content side, and an engine that generated its own unit would name a
 * different one than the sequence the player just watched.
 */
export type StagedResolutionReport = {
    readonly act: StagedResolutionAct;
    readonly valence: ConsequenceValence;
    /** The two governments as the roster displays them. */
    readonly actorName: string;
    readonly targetName: string;
    /** Whether this administration is the one that moved. */
    readonly byPlayer: boolean;
    /** Whether anyone outside the building learned it happened. */
    readonly visible: boolean;
    /** The formation the sequence named, absent when no step named one. */
    readonly unit?: string;
};
/**
 * The wire's one line about a staged act, naming the formation that carried it.
 *
 * A hook, not an emission: it builds a FeedItem and stops there. Whether the
 * week reports this is the caller's call, and the item lands the way every
 * other feed write lands — through a packet — rather than by a second path out
 * of the resolver.
 */
export declare function stagedResolutionFeedItem(report: StagedResolutionReport): FeedItem;
