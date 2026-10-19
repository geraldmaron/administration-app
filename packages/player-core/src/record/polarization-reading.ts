import {
  ERA_POLARIZATION,
  POLARIZATION_DRIFT_MAX,
  POLARIZATION_DRIFT_MIN,
  blocApprovals,
  erosionOf,
  headlineOf,
  opinionCourse,
  polarizationDrift,
  selectElectorate,
  valenceSlope,
  type Campaign,
} from "@admin/engine";

/**
 * How divided the country is, as the engine holds it: the era's level, which
 * the founding public is read at, plus what this administration has added or
 * healed, kept inside the range one term can reach. Division sets how far
 * apart the parties start and how little a President's own identifiers move on
 * the record, so it is read beside what it costs rather than as a score.
 *
 * What the ledger recorded is kept for attribution: every entry that moved the
 * stock, with the actor that ordered it.
 */
export type PolarizationMove = {
  readonly turn: number;
  readonly description: string;
  /** Signed, in stock units: positive divided the country further, negative gave some back. */
  readonly delta: number;
};

export type PolarizationReading = {
  /** The stock now; the era's level is `anchor`. */
  readonly value: number;
  /** The era's level, where a public with nothing added or healed sits. */
  readonly anchor: number;
  /** What this administration has added (positive) or healed (negative), in stock units. */
  readonly drift: number;
  /** The least and most a term can move the stock from the anchor. */
  readonly driftMin: number;
  readonly driftMax: number;
  /** Where the stock sits along the range a term can reach, 0 at its floor and 1 at its ceiling; the anchor sits at `anchorAt`. */
  readonly position: number;
  readonly anchorAt: number;
  /** The stock as a share above (or below) the era's level: 0.04 reads "4 percent more divided". */
  readonly againstEra: number;
  /** How much an identifier of the President's own party moves on the record, against an independent's 1: now, and at the era's level. */
  readonly ownIdentifierMovement: { readonly now: number; readonly atEra: number };
  /** What the drift is worth to the headline, in share of the country: now against the same week at the era's level. */
  readonly headlineEffect: number;
  /** The stock at every closed week the campaign observed, oldest first. */
  readonly series: readonly number[];
  /** What this administration's own decisions added. Never negative. */
  readonly addedByUs: number;
  /** What the world added without being asked. */
  readonly addedByTheWorld: number;
  /** What was given back. Never negative. */
  readonly healed: number;
  /** The single decision that divided the country most, if any did. */
  readonly heaviest?: PolarizationMove;
};

function polarizationMoves(campaign: Campaign): readonly (PolarizationMove & { readonly byPlayer: boolean })[] {
  return campaign.ledger
    .filter((entry) => entry.mood?.polarization !== undefined && entry.mood.polarization !== 0)
    .map((entry) => ({
      turn: entry.turn,
      description: entry.description,
      delta: entry.mood!.polarization!,
      byPlayer: entry.actor === "player",
    }));
}

/** The headline the same week would read at the era's level of division. */
function headlineAtEra(campaign: Campaign): number {
  const reading = selectElectorate(campaign);
  const inputs = { ...reading, polarization: ERA_POLARIZATION, erosion: erosionOf(campaign, ERA_POLARIZATION) };
  return headlineOf(reading.shares, blocApprovals(inputs));
}

export function polarizationReading(campaign: Campaign): PolarizationReading {
  const moves = polarizationMoves(campaign);
  const value = selectElectorate(campaign).polarization;
  const divided = moves.filter((move) => move.delta > 0);
  const heaviest = divided.reduce<PolarizationMove | undefined>(
    (worst, move) => (worst === undefined || move.delta > worst.delta ? move : worst),
    undefined,
  );
  const { partisanship, headline } = selectElectorate(campaign);
  const series = [...opinionCourse(campaign).map((sample) => sample.polarization)];
  return {
    value,
    anchor: ERA_POLARIZATION,
    drift: polarizationDrift(value),
    driftMin: POLARIZATION_DRIFT_MIN,
    driftMax: POLARIZATION_DRIFT_MAX,
    position: (polarizationDrift(value) - POLARIZATION_DRIFT_MIN) / (POLARIZATION_DRIFT_MAX - POLARIZATION_DRIFT_MIN),
    anchorAt: -POLARIZATION_DRIFT_MIN / (POLARIZATION_DRIFT_MAX - POLARIZATION_DRIFT_MIN),
    againstEra: value / ERA_POLARIZATION - 1,
    ownIdentifierMovement: {
      now: valenceSlope(partisanship.ownId, value),
      atEra: valenceSlope(partisanship.ownId, ERA_POLARIZATION),
    },
    headlineEffect: headline - headlineAtEra(campaign),
    series,
    addedByUs: divided.filter((move) => move.byPlayer).reduce((sum, move) => sum + move.delta, 0),
    addedByTheWorld: divided.filter((move) => !move.byPlayer).reduce((sum, move) => sum + move.delta, 0),
    healed: moves.filter((move) => move.delta < 0).reduce((sum, move) => sum - move.delta, 0),
    ...(heaviest ? { heaviest: { turn: heaviest.turn, description: heaviest.description, delta: heaviest.delta } } : {}),
  };
}
