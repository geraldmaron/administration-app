import { type IdeologyAxis, type IdeologyVector, type SectorId, type StateCharacter, type StateEconomyAxis } from "@admin/world";
import type { StateEffect } from "./effects.js";
import type { DomesticChannel } from "./cohort-channels.js";
import type { Campaign } from "./state.js";
export type DomesticMagnitude = "light" | "moderate" | "heavy";
/**
 * Who an act hits at home. Declared by the act, never inferred from prose.
 * `sectors` is the convenient half (name the real industries) and folds into
 * `axes` through SECTOR_AXIS; `axes` is the direct half, for an act whose
 * signature is not an industry list.
 */
export type DomesticSignature = {
    readonly axes?: Partial<Record<StateEconomyAxis, number>>;
    readonly sectors?: readonly SectorId[];
    readonly urban?: number;
    readonly federal?: number;
    /**
     * What the act says about the country, not what industry it touches.
     *
     * The values it reads are already differentiated: `AlignmentPullShape` lets a
     * reply declare exactly this vector, and `COHORT_MOTIVATION[cohort].beliefs`
     * carries a real, distinguishing position on it for all sixteen cohorts, with
     * rural sitting 0.15-0.25 toward `authLibertarian` and urban 0.1-0.2 the
     * other way. What this field supplies is the reader. Without it a declared
     * pull moves one national accumulator (`player.alignments`) and nothing else,
     * so an identity-coded act lands identically on every state and every cohort
     * regardless of what either actually believes. Folded the same way `urban`
     * and `federal` are.
     */
    readonly values?: Partial<Record<IdeologyAxis, number>>;
    /**
     * The policy channels the act moves (civil-rights enforcement, immigration,
     * health access, disability programs, veterans' benefits), −1..1 each. They
     * reach cohorts only: how directly each channel bears on a cohort is
     * `CHANNEL_REACH`. A state's lean never reads them, because demography does
     * not derive lean (DECISIONS 5.10).
     */
    readonly channels?: Partial<Record<DomesticChannel, number>>;
    readonly magnitude: DomesticMagnitude;
    /** Slug the grievance mark carries and a scenario condition can name. */
    readonly signature: string;
    readonly reason: string;
};
export declare const MAGNITUDE_STEP: Readonly<Record<DomesticMagnitude, number>>;
/** Hard ceiling on what any single routed act may do to one state's lean. */
export declare const STATE_ROUTE_CAP = 0.025;
/** Hard ceiling on the sum of routed movement in one state in one turn. */
export declare const STATE_ROUTE_TURN_CAP = 0.04;
/** Decay per turn for a mark written by a routed act (~sixteen weeks to fade). */
export declare const BASE_MARK_DECAY = 0.06;
/** Fold sectors into axes: each named sector adds +1 on its SECTOR_AXIS landing. */
export declare function foldedAxes(signature: DomesticSignature): Record<StateEconomyAxis, number>;
/**
 * A state's own position on the three-axis ideology vector, read off the one
 * signal a state actually carries: `lean` (Dem ← → Rep, −1..1).
 *
 * A state does not carry a full `IdeologyVector`: authoring 51 × 3 figures is
 * a real cost, and whether to pay it is an open design call. `lean` is folded
 * onto all three axes as the
 * best available proxy, on the same precedent `bands.ts` already sets for
 * every other derived-rather-than-authored figure: `economicLeftRight` and
 * `authLibertarian` read `lean` directly (a Republican-leaning state reads
 * positive on both, which is the correlation the real coalition actually
 * has); `nationalistGlobalist` reads urbanization inverted, because the axis
 * `lean` tracks least is the one urban/rural sorts on more directly than
 * party does. Superseded without ceremony the day a real per-state vector is
 * authored — this function is the only caller that would need to change.
 */
export declare function stateValues(character: StateCharacter, lean: number): IdeologyVector;
/** Affinity of one state's character for a signature. Pure, no roll. */
export declare function stateAffinity(character: StateCharacter, lean: number, signature: DomesticSignature): number;
/** A safe state still moves, but less: elasticity = 1 − 0.5 × |lean|. */
export declare function stateElasticity(lean: number): number;
/**
 * Compile a domestic signature into one StateEffect per state that clears the
 * movement floor. Iteration is over STATE_IDS in declaration order so the
 * effect list is byte-identical run to run.
 */
export declare function routeDomestic(campaign: Campaign, signature: DomesticSignature): readonly StateEffect[];
