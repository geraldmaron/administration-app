import type { InstrumentId } from "./instruments.js";
/** The layers a contest is decided on, per instrument. Ids are stable; labels are presentation. */
export declare const CONTEST_LAYERS: {
    readonly military: readonly ["ground", "air", "sea", "cyber", "space", "reach", "sustainment"];
    readonly economic: readonly ["dependence", "reserves", "market", "resolve"];
    readonly diplomatic: readonly ["reach", "standing", "coalition", "temperature"];
    readonly covert: readonly ["collection", "access", "penetration"];
    readonly assistance: readonly ["purse", "delivery", "absorption"];
};
type LayerWeights<I extends InstrumentId> = Readonly<Record<(typeof CONTEST_LAYERS)[I][number], number>>;
export type ContestDials = {
    /**
     * How far a total edge of ±1 moves the odds away from an even 0.5. At 0.45 a
     * side that wins every layer outright lands at 0.95 and a side that loses
     * every one lands at 0.05 — decisive, but never a certainty in either
     * direction, which is the property the whole model exists to hold.
     */
    readonly contrast: number;
    readonly floor: number;
    readonly ceiling: number;
    /** Rung difficulty: the same leverage lands a démarche far more reliably than an invasion. */
    readonly rungReliability: Readonly<Record<1 | 2 | 3 | 4 | 5, number>>;
    /** How much a nuclear defender stiffens against the top rungs, and how much the attacker's own arsenal buys back. */
    readonly deterrenceDrag: number;
    readonly deterrenceMutualRelief: number;
    /**
     * How much the victim's likely allies stiffen an attack that would start a
     * war with them in it (planning value; needs validation on the 12-seed run).
     */
    readonly alliedDeterrenceDrag: number;
    /** How hard repetition (`repeatDrag`) pushes back on the edge. */
    readonly habituation: number;
    /** Per-instrument layer weights. Each set sums to 1; the model asserts it. */
    readonly weights: {
        readonly military: LayerWeights<"military">;
        readonly economic: LayerWeights<"economic">;
        readonly diplomatic: LayerWeights<"diplomatic">;
        readonly covert: LayerWeights<"covert">;
        readonly assistance: LayerWeights<"assistance">;
    };
    /**
     * How much of a military layer is the quality of the force versus the size of
     * it. Quality-only made a brigade count decoration; mass-only made doctrine
     * and readiness decoration.
     */
    readonly forceMassShare: number;
    /** What a defender holds simply by being at home, before any of its own numbers are counted. */
    readonly homeGroundFloor: number;
    /**
     * How a nation's people divide between the five domains when the dataset
     * carries no order of battle for it.
     *
     * Three governments have an authored decomposition and forty-seven do not,
     * and a screen that showed the three and shrugged at the rest would make the
     * granularity a property of the research rather than of the game. The shares
     * are the shape of a conventional force — most of it on the ground, a fifth
     * in the air — modulated per nation by how much weight its doctrine actually
     * puts in each domain. An authored order of battle always wins over this.
     */
    readonly defaultBranchShare: Readonly<Record<"ground" | "air" | "sea" | "cyber" | "space", number>>;
};
export declare const CONTEST_DIALS: ContestDials;
export {};
