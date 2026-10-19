import type { NationRuntime } from "./state.js";

// The stat paths a program may move, the range each is held inside, and which
// way is up for each of them.
//
// Split out of policy.ts because three different callers need this vocabulary
// without needing the stance catalogue behind it: the writer that applies a
// program, the scorer that prices one for a foreign government, and the tests
// that check a long campaign never wrote a stat outside the schema. Keeping the
// bound and the write in one small module is also what stops a caller checking
// a figure against a range in different units from the one it was written in.

/**
 * The stat paths a program is allowed to move on the nation running it, with
 * the schema range each is held inside. Typed as an explicit union rather than
 * `string` so a stance cannot name a path that does not exist, and kept small
 * on purpose: a policy system that can move anything is a cheat code.
 *
 * `economy.debt` is the one entry whose numbers are a share of output rather
 * than the stat's own unit, because the stat is a nominal stock in USD
 * millions and no fixed sum means the same thing to two economies. Both the
 * range and any authored delta on it are multiplied by the nation's own GDP in
 * `statEffect`, so `-0.08` reads as eight points of output wherever it is
 * written and the ceiling stays the five-times-output the ratio always had.
 */
export const POLICY_STAT_RANGES = {
  "economy.growth": [-0.3, 0.3],
  "economy.inflation": [-0.1, 2],
  "economy.unemployment": [0, 1],
  "economy.debt": [0, 5],
  "energy.importDependence": [0, 1],
  "military.readiness": [0, 1],
  "military.doctrineQuality": [0, 1],
  "security.intelCapability": [0, 1],
  "security.counterIntel": [0, 1],
  "security.corruptionIndex": [0, 1],
  "security.insurgencyPressure": [0, 1],
  "security.borderControl": [0, 1],
  "politics.legitimacy": [0, 1],
  "politics.pressFreedom": [0, 1],
  "politics.protestPressure": [0, 1],
  "softPower.diplomaticReach": [0, 1],
} as const satisfies Record<string, readonly [number, number]>;

export type PolicyStatPath = keyof typeof POLICY_STAT_RANGES;

/**
 * One stat by its policy path. Exported because a program is now scored
 * against the country carrying it as well as applied to it, and the scorer must
 * read the figure through the same accessor the writer does.
 */
export function policyStatValue(stats: NationRuntime["stats"], path: PolicyStatPath): number {
  return statAt(stats, path);
}

export function statAt(stats: NationRuntime["stats"], path: PolicyStatPath): number {
  const [group, field] = path.split(".") as [keyof NationRuntime["stats"], string];
  return (stats[group] as unknown as Record<string, number>)[field]!;
}

/** The one path whose range and deltas are shares of output. */
const OUTPUT_SCALED_PATH: PolicyStatPath = "economy.debt";

export function outputScale(stats: NationRuntime["stats"], path: PolicyStatPath): number {
  return path === OUTPUT_SCALED_PATH ? Math.max(1, stats.economy.gdp) : 1;
}

/**
 * The range this path is held inside for this nation, in the stat's own unit.
 *
 * Exported because a check on the bound and the write that enforces it have to
 * be the same arithmetic: a stock's ceiling is a multiple of the economy
 * carrying it, so a caller reading `POLICY_STAT_RANGES` alone would compare a
 * figure in USD millions against a share of output.
 */
export function policyStatBounds(
  stats: NationRuntime["stats"],
  path: PolicyStatPath,
): readonly [number, number] {
  const [min, max] = POLICY_STAT_RANGES[path];
  const scale = outputScale(stats, path);
  return [min * scale, max * scale];
}

/**
 * Which way is *up* for each path, so competence can scale delivery without a
 * caller having to decide per stance whether it is being helped or charged.
 * `+1` means a rise is what a government would be trying to buy.
 */
export const BENEFICIAL_DIRECTION: Readonly<Record<PolicyStatPath, 1 | -1>> = {
  "economy.growth": 1,
  "economy.inflation": -1,
  "economy.unemployment": -1,
  "economy.debt": -1,
  "energy.importDependence": -1,
  "military.readiness": 1,
  "military.doctrineQuality": 1,
  "security.intelCapability": 1,
  "security.counterIntel": 1,
  "security.corruptionIndex": -1,
  "security.insurgencyPressure": -1,
  "security.borderControl": 1,
  "politics.legitimacy": 1,
  "politics.pressFreedom": 1,
  "politics.protestPressure": -1,
  "softPower.diplomaticReach": 1,
};


/**
 * The paths whose next value is computed from their previous one by the rate
 * law in `macro.ts`. A program's delta on one of these moves where the rate
 * RESTS; every other path takes the delta as a level, week by week, as before.
 *
 * The distinction is not stylistic. A weekly increment against a proportional
 * reversion does not deliver the number that was written — it settles where the
 * increment and the reversion step cancel, at the increment divided by the
 * reversion rate. That is 25x the authored figure on the three economic rates
 * and 100x on the two political ones, so an authored 0.001 of growth was worth
 * two and a half points of it. Measured over 720,000 nation-weeks, a world of
 * governments each running an ordinary program rested four points of growth
 * above the highest resting point the law can produce, nothing could read as
 * below its own trend, and the recession kind could not open at all.
 *
 * Written as a resting-point shift, the number means what it says, and goes on
 * meaning it if the reversion rate changes or a turn stops being a week — a
 * weekly increment's delivered value depends on both.
 */
export const RESTING_POINT_PATHS = [
  "economy.growth",
  "economy.inflation",
  "economy.unemployment",
  "politics.legitimacy",
  "politics.protestPressure",
] as const satisfies readonly PolicyStatPath[];

export type RestingPointPath = (typeof RESTING_POINT_PATHS)[number];

/** How far a standing program moves each rate's resting point, in the rate's own unit. */
export type ProgramRestingOffset = Readonly<Record<RestingPointPath, number>>;

export const NO_RESTING_OFFSET: ProgramRestingOffset = {
  "economy.growth": 0,
  "economy.inflation": 0,
  "economy.unemployment": 0,
  "politics.legitimacy": 0,
  "politics.protestPressure": 0,
};

export function isRestingPointPath(path: PolicyStatPath): path is RestingPointPath {
  return (RESTING_POINT_PATHS as readonly PolicyStatPath[]).includes(path);
}
