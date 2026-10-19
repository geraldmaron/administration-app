import { type CohortId, type IdeologyVector, type StateEconomyAxis } from "@admin/world";
import { type OpinionDriver } from "./opinion-drivers.js";
export type CohortMotivation = {
    /**
     * Multiplicative tilt on OPINION_WEIGHTS. Authored, not the lens itself:
     * a tilt says "this cohort weighs services harder than the country does",
     * which is the sentence a designer can defend, and the lens is derived by
     * normalizing so a lens can never fail to sum to one.
     * Every entry in [LENS_TILT_FLOOR, LENS_TILT_CAP]. Law 3.
     */
    readonly tilt: Readonly<Record<OpinionDriver, number>>;
    /**
     * Where this cohort's politics sit, on the same three axes as
     * Person.ideology and Party.beliefs. Religiosity is the
     * authLibertarian coordinate; there is no fourth axis for it.
     */
    readonly beliefs: IdeologyVector;
    /**
     * How far the cohort is spread around that center. Floored at
     * COHORT_MIN_SPREAD, and alignment is scaled by (1 - spread), which is the
     * arithmetic that makes a reliable bloc impossible. Law 3.
     */
    readonly spread: number;
    /** Which of the six state economy axes employ it. Sums to 1. The routing target. */
    readonly exposure: Readonly<Record<StateEconomyAxis, number>>;
    /** How much of the household's income arrives through public programs. */
    readonly programReliance: number;
    /** How much an act has to be about this cohort before it registers. Multiplies strain, never support. */
    readonly attention: number;
    /**
     * The share that turns out when nothing has happened to them. Authored from
     * published participation rates: 65-plus and under-35 do not vote at the
     * same rate and never have.
     */
    readonly baseTurnout: number;
    /** What this cohort is called on a screen. Never a demographic label used as a slur or a shorthand. */
    readonly name: string;
};
/**
 * Twenty-nine entries. Tilts are material-channel weights (Law 1), not dispositions;
 * within each axis they are written to cancel under national share weighting so
 * the share-weighted mean lens stays within LENS_CENTERING_TOLERANCE of
 * OPINION_WEIGHTS (boundary law 3 / cohort-lens-centered).
 */
export declare const COHORT_MOTIVATION: Readonly<Record<CohortId, CohortMotivation>>;
