import type { Campaign } from "./state.js";
import { type BudgetAccount, type BudgetAllocation, type BudgetStatPath, type StatecraftAccount } from "./budget.js";
export type CapabilityHorizon = {
    readonly account: BudgetAccount;
    readonly path: BudgetStatPath;
    readonly current: number;
    readonly required: number;
    /**
     * Turns until the requirement is met at the standing appropriation.
     * `undefined` when the account is holding or drawing down — the requirement
     * is not being approached at all, which is a different fact from "a long
     * time" and must read as one.
     */
    readonly turns?: number;
};
/**
 * How long the standing appropriation needs to reach a capability figure.
 *
 * The whole point of the account is that a player can see the answer before
 * they commit a term to it: "sixty-one weeks" is a plan, and "unreachable" was
 * the bug.
 */
export declare function turnsToReach(campaign: Campaign, account: BudgetAccount, path: BudgetStatPath, required: number, allocation?: BudgetAllocation): CapabilityHorizon;
/**
 * The capability figure each rung of the ladder is gated on, declared so a
 * screen can say what an appropriation is *for*.
 *
 * The gates themselves live in `instruments.ts` as closures over live state,
 * which is right for resolving an attempt and useless for planning one: a
 * player cannot read a closure. This is the same requirement in a form the
 * budget can be steered by, and `budget.test.ts` proves the two agree by
 * building a campaign to each threshold and asserting the rung it names opens.
 *
 * Only the rungs gated on something an appropriation can move are listed. A
 * blockade needs a coastal target and an embargo needs trade to withhold;
 * neither is a thing money buys, and pretending otherwise on the budget screen
 * would be a promise the ladder does not keep.
 */
export declare const CAPABILITY_MILESTONES: readonly {
    readonly account: StatecraftAccount;
    readonly rung: 1 | 2 | 3 | 4 | 5;
    readonly name: string;
    readonly path: BudgetStatPath;
    readonly required: number;
}[];
/**
 * What each capability is called in the words a player is choosing in.
 *
 * A rung is gated on one specific figure inside an account, which is not
 * always the account's headline: a limited strike wants air strength, and
 * quoting the defense establishment's readiness beside it names a number that
 * has nothing to do with the requirement.
 */
export declare const CAPABILITY_LABELS: Readonly<Record<BudgetStatPath, string>>;
/**
 * The next rung this account is climbing toward, with how long the standing
 * appropriation needs to open it — the reading that turns a share of GDP into
 * a plan a small country can hold a term against.
 */
export declare function nextMilestone(campaign: Campaign, account: BudgetAccount, allocation?: BudgetAllocation): (CapabilityHorizon & {
    readonly rung: number;
    readonly name: string;
}) | undefined;
