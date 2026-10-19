import type { NationRuntime } from "./state.js";
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
export declare const POLICY_STAT_RANGES: {
    readonly "economy.growth": readonly [-0.3, 0.3];
    readonly "economy.inflation": readonly [-0.1, 2];
    readonly "economy.unemployment": readonly [0, 1];
    readonly "economy.debt": readonly [0, 5];
    readonly "energy.importDependence": readonly [0, 1];
    readonly "military.readiness": readonly [0, 1];
    readonly "military.doctrineQuality": readonly [0, 1];
    readonly "security.intelCapability": readonly [0, 1];
    readonly "security.counterIntel": readonly [0, 1];
    readonly "security.corruptionIndex": readonly [0, 1];
    readonly "security.insurgencyPressure": readonly [0, 1];
    readonly "security.borderControl": readonly [0, 1];
    readonly "politics.legitimacy": readonly [0, 1];
    readonly "politics.pressFreedom": readonly [0, 1];
    readonly "politics.protestPressure": readonly [0, 1];
    readonly "softPower.diplomaticReach": readonly [0, 1];
};
export type PolicyStatPath = keyof typeof POLICY_STAT_RANGES;
/**
 * One stat by its policy path. Exported because a program is now scored
 * against the country carrying it as well as applied to it, and the scorer must
 * read the figure through the same accessor the writer does.
 */
export declare function policyStatValue(stats: NationRuntime["stats"], path: PolicyStatPath): number;
export declare function statAt(stats: NationRuntime["stats"], path: PolicyStatPath): number;
export declare function outputScale(stats: NationRuntime["stats"], path: PolicyStatPath): number;
/**
 * The range this path is held inside for this nation, in the stat's own unit.
 *
 * Exported because a check on the bound and the write that enforces it have to
 * be the same arithmetic: a stock's ceiling is a multiple of the economy
 * carrying it, so a caller reading `POLICY_STAT_RANGES` alone would compare a
 * figure in USD millions against a share of output.
 */
export declare function policyStatBounds(stats: NationRuntime["stats"], path: PolicyStatPath): readonly [number, number];
/**
 * Which way is *up* for each path, so competence can scale delivery without a
 * caller having to decide per stance whether it is being helped or charged.
 * `+1` means a rise is what a government would be trying to buy.
 */
export declare const BENEFICIAL_DIRECTION: Readonly<Record<PolicyStatPath, 1 | -1>>;
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
export declare const RESTING_POINT_PATHS: readonly ["economy.growth", "economy.inflation", "economy.unemployment", "politics.legitimacy", "politics.protestPressure"];
export type RestingPointPath = (typeof RESTING_POINT_PATHS)[number];
/** How far a standing program moves each rate's resting point, in the rate's own unit. */
export type ProgramRestingOffset = Readonly<Record<RestingPointPath, number>>;
export declare const NO_RESTING_OFFSET: ProgramRestingOffset;
export declare function isRestingPointPath(path: PolicyStatPath): path is RestingPointPath;
