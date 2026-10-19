import type { StateId } from "@admin/world";
/**
 * One week's reading of the economy the country lives in, as a household would
 * describe it rather than as the books do.
 *
 * Kept as its own series rather than folded into `metricHistory`, because none
 * of these four is a presidential metric: growth, inflation, unemployment and
 * the cost of living are facts about the country that the administration only
 * partly moves, and the situation room reads them against each other rather
 * than against approval.
 */
export type EconomySample = {
    readonly turn: number;
    readonly growth: number;
    readonly inflation: number;
    readonly unemployment: number;
    readonly costOfLiving: number;
};
/**
 * One week's approval, state by state, rounded to a thousandth for the save.
 * Partial because a campaign may carry fewer states than the dataset names.
 */
export type StateApprovalSample = {
    readonly turn: number;
    readonly approval: Readonly<Partial<Record<StateId, number>>>;
};
/**
 * One week of the feed, folded to a count.
 *
 * The feed itself is bounded, so a campaign that ran a hundred weeks cannot say
 * what the world was doing in week nine. The digest keeps the shape of a week —
 * how much happened, where, and of what kinds — at a size a save can carry for
 * the whole term.
 */
export type FeedDigestWeek = {
    readonly turn: number;
    readonly region: string;
    readonly count: number;
    readonly kinds: readonly string[];
};
