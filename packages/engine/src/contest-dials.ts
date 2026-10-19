// Every number that decides whether an act against another government works.
//
// They live here, together, because balance is a thing you tune rather than a
// thing you discover: a designer who wants war to bite harder should be able to
// find one file, move one weight, and have the odds, the projection pane and
// the dossier's comparison all move with it. Scattering these across the
// estimator meant the only way to retune the game was to read it.
//
// Nothing in here is read at module scope by a surface. Callers take the
// dials through `assessContest`, so a future campaign-level override has one
// seam to pass through.
import type { InstrumentId } from "./instruments.js";

/** The layers a contest is decided on, per instrument. Ids are stable; labels are presentation. */
export const CONTEST_LAYERS = {
  military: ["ground", "air", "sea", "cyber", "space", "reach", "sustainment"],
  economic: ["dependence", "reserves", "market", "resolve"],
  diplomatic: ["reach", "standing", "coalition", "temperature"],
  covert: ["collection", "access", "penetration"],
  assistance: ["purse", "delivery", "absorption"],
} as const satisfies Record<InstrumentId, readonly string[]>;

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

export const CONTEST_DIALS: ContestDials = {
  contrast: 0.45,
  floor: 0.05,
  ceiling: 0.95,
  rungReliability: { 1: 1, 2: 0.97, 3: 0.9, 4: 0.82, 5: 0.72 },
  deterrenceDrag: 0.35,
  deterrenceMutualRelief: 0.7,
  alliedDeterrenceDrag: 0.3,
  habituation: 1,
  weights: {
    // Land is the heaviest because taking or holding ground is what a military
    // act is ultimately judged on; air outranks sea because every rung on the
    // ladder below an invasion is flown rather than sailed.
    military: { ground: 0.26, air: 0.2, sea: 0.13, cyber: 0.09, space: 0.05, reach: 0.15, sustainment: 0.12 },
    economic: { dependence: 0.35, reserves: 0.25, market: 0.2, resolve: 0.2 },
    diplomatic: { reach: 0.35, standing: 0.25, coalition: 0.2, temperature: 0.2 },
    covert: { collection: 0.45, access: 0.3, penetration: 0.25 },
    assistance: { purse: 0.35, delivery: 0.3, absorption: 0.35 },
  },
  forceMassShare: 0.4,
  homeGroundFloor: 0.45,
  defaultBranchShare: { ground: 0.55, air: 0.2, sea: 0.18, cyber: 0.04, space: 0.03 },
};
