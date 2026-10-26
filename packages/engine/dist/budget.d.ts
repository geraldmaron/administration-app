import { type Campaign, type NationRuntime } from "./state.js";
import type { TurnPhase } from "./turn-loop.js";
import { ACCOUNT_CAP, accountCap } from "./funding.js";
/**
 * The instruments an appropriation can build an establishment for.
 *
 * Not every instrument is one. Assistance is funded per act out of the
 * treasury, and the capabilities its rungs gate on — reserves, the size of the
 * economy, the readiness the transfer comes out of, the foreign service that
 * delivers it — are all built by the four accounts that already exist. A fifth
 * statecraft account would be a second way to buy the same four things.
 */
export declare const STATECRAFT_ACCOUNTS: readonly ["diplomatic", "economic", "covert", "military"];
/**
 * Every account on the budget, which is the five instruments and the government
 * itself.
 *
 * The domestic line is not an instrument and never will be — nothing on the
 * escalation ladder gates on it. It is here because a budget of four statecraft
 * accounts is not a budget: a president who could only ever move money between
 * the foreign service and the navy was never making the choice the office
 * actually makes, which is between what the state projects abroad and what it
 * delivers at home. With this line on the same continuous allocation, a carrier
 * is finally paid for out of something.
 */
export declare const BUDGET_ACCOUNTS: readonly ["diplomatic", "economic", "covert", "military", "domestic"];
export type BudgetAccount = (typeof BUDGET_ACCOUNTS)[number];
/** An account that is also an instrument, which is every account but the domestic line. */
export type StatecraftAccount = (typeof STATECRAFT_ACCOUNTS)[number];
/** A standing appropriation: share of GDP per account, per year. */
export type BudgetAllocation = Readonly<Record<BudgetAccount, number>>;
export { ACCOUNT_CAP, accountCap };
/** An appropriation of nothing — the shape, before anything has been voted. */
export declare function inheritedBudget(): BudgetAllocation;
/**
 * What a founding actually opens on: every account funded at exactly what
 * holding it costs.
 *
 * An administration that has voted no budget of its own is not one whose
 * army is dissolving — it is one still paying its predecessor's bills. Opening
 * at zero would have made doing nothing a drawdown, which turns the first
 * decision of every campaign into a mandatory one and makes "hold what I
 * inherited" the one position the player cannot take. It also means the state
 * costs money from turn one, which is the fact the whole account rests on.
 */
export declare function sustainingBudget(runtime: NationRuntime, branchAdequacy?: number): BudgetAllocation;
/**
 * A stat an account moves, with the schema range it is held inside and how much
 * of the account's push it takes.
 *
 * The weights inside an account sum to 1 by construction (asserted in
 * `budget.test.ts`), so an account is a fixed quantity of institution-building
 * distributed across the things that institution is made of — never a way to
 * buy four stats for the price of one.
 */
export type BudgetTarget = {
    readonly path: BudgetStatPath;
    readonly weight: number;
};
export declare const BUDGET_STAT_RANGES: {
    readonly "softPower.diplomaticReach": readonly [0, 1];
    readonly "softPower.culturalReach": readonly [0, 1];
    readonly "security.intelCapability": readonly [0, 1];
    readonly "security.counterIntel": readonly [0, 1];
    readonly "military.readiness": readonly [0, 1];
    readonly "military.doctrineQuality": readonly [0, 1];
    readonly "military.branchStrength.land": readonly [0, 1];
    readonly "military.branchStrength.air": readonly [0, 1];
    readonly "military.branchStrength.naval": readonly [0, 1];
    readonly "military.branchStrength.cyber": readonly [0, 1];
    readonly "military.airliftCapacity": readonly [0, 1];
    readonly "military.sealiftCapacity": readonly [0, 1];
};
export type BudgetStatPath = keyof typeof BUDGET_STAT_RANGES;
export type BudgetAccountSpec = {
    readonly name: string;
    readonly properNoun?: true;
    /** What the money is, in the words a budget line is written in. */
    readonly summary: string;
    /**
     * The capability the account's own headline reading is taken from — the one
     * figure a player watches to know whether the money is working, and the one
     * the sustainment line is priced against.
     */
    readonly headline: BudgetStatPath;
    readonly targets: readonly BudgetTarget[];
    /**
     * Capability bought per unit of net annual GDP share, before the responsible
     * minister's competence and before proration to the week.
     *
     * Institutions differ in what money does to them. Reserves and readiness
     * respond inside a budget cycle; a diplomatic service's standing and a navy's
     * hulls are a decade's work, and their figures move accordingly.
     */
    readonly gain: number;
    /**
     * The annual GDP share that holds a fully-built account of this kind steady,
     * prorated against what has actually been built. An account at half strength
     * costs half of this to keep.
     */
    readonly sustainAtFull: number;
};
export declare const BUDGET_ACCOUNT_SPECS: Readonly<Record<BudgetAccount, BudgetAccountSpec>>;
/** An account's name as it reads inside a sentence: lower case, unless it is the name of an institution. */
export declare const accountNameInSentence: (account: BudgetAccount) => string;
/**
 * Money into reserves, per unit of net annual GDP share.
 *
 * An appropriation to the fund is a transfer rather than a purchase, so it goes
 * in at par: a percent of GDP moved out of the treasury is a percent of GDP
 * added to reserves. What makes it a real choice is that the treasury is what
 * everything else — orders, enactments, the rest of the appropriation — is paid
 * out of, and reserves are not.
 */
export declare const RESERVE_TRANSFER_RATE = 1;
/**
 * What the accounts can actually spend: the appropriation less the share a
 * special message is holding back. The standing book is `selectBudget`; this
 * is the figure the outlook and the weekly spend are drawn from, so money
 * withheld under the Impoundment Control Act stops building the account the
 * week it is held and resumes the week it is released.
 */
export declare function selectSpendableBudget(campaign: Campaign): BudgetAllocation;
export declare function selectBudget(campaign: Campaign): BudgetAllocation;
export declare function budgetStatValue(stats: NationRuntime["stats"], path: BudgetStatPath): number;
/**
 * How much of an account has actually been built, 0..1 — the figure its
 * sustainment is priced against.
 *
 * Weighted across the account's own targets rather than taken from the headline
 * alone, so a defense establishment that has poured everything into readiness
 * and nothing into lift is correctly read as half-built and costs half as much
 * to hold.
 */
export declare function accountLevel(runtime: NationRuntime, account: BudgetAccount, branchAdequacy?: number): number;
/**
 * What the minister responsible delivers, on the same band policy execution
 * runs on: an appropriation is carried out by a ministry, and a ministry is
 * only as good as whoever is sitting in the chair.
 *
 * Statecraft accounts are instruments, so the chair is the one `stewardship.ts`
 * already matches an instrument to — including the charters that fold
 * intelligence into the interior portfolio rather than seating a director of
 * its own. The domestic line's chair is matched there too, against the
 * secretaries who actually run it; where the ownership table splits a line,
 * each secretary prices only the share their department spends.
 */
export declare function appropriationQuality(campaign: Campaign, account: BudgetAccount): number;
export type BudgetLine = {
    readonly account: BudgetAccount;
    readonly spec: BudgetAccountSpec;
    /** The standing appropriation, as an annual share of GDP. */
    readonly share: number;
    /** The share that would hold this account exactly where it is. */
    readonly sustainShare: number;
    /** Appropriation less sustainment: positive builds, negative draws down. */
    readonly netShare: number;
    /**
     * What this line costs the treasury this turn — the appropriation above the
     * sustainment line, never the establishment itself. Negative on a drawdown,
     * which is money the state stops spending.
     */
    readonly turnCost: number;
    /** How much of the account exists, 0..1. */
    readonly level: number;
    readonly headlineValue: number;
    readonly quality: number;
    readonly minister?: string;
    /** Per-turn movement of the headline figure at this appropriation. */
    readonly headlineDelta: number;
    readonly direction: "building" | "holding" | "drawing down";
};
export type BudgetOutlook = {
    readonly lines: readonly BudgetLine[];
    /** Every account's appropriation, summed, as an annual share of GDP. */
    readonly totalShare: number;
    /** What the whole appropriation costs the authority this turn, net of savings. */
    readonly turnCost: number;
    readonly gdp: number;
};
/**
 * A movement is delivered by a ministry and paid for by a government, so
 * competence scales what is built and never what a drawdown costs — the same
 * asymmetry policy execution applies. A weak defense minister buys fewer ships
 * and scraps exactly as many.
 */
export declare function movement(netShare: number, gain: number, quality: number): number;
/** One line of the appropriation, priced and projected against live stats. */
export declare function budgetLine(campaign: Campaign, account: BudgetAccount, allocation: BudgetAllocation, runtime: NationRuntime, gdp: number): BudgetLine;
/**
 * The standing appropriation, account by account, with what each is worth per
 * turn — computed once here so the budget screen previews exactly the figures
 * the turn phase then applies, rather than a second calculation that could
 * disagree with it.
 */
export declare function selectBudgetOutlook(campaign: Campaign, allocation?: BudgetAllocation): BudgetOutlook;
/**
 * How much of a stability point an unfunded week of budget costs, per unit
 * of the shortfall as a share of GDP.
 *
 * A government that cannot pay its own establishment is not merely poorer; it
 * is a government whose soldiers and stations find out. This is the only place
 * insolvency reaches the player as something other than a number that stopped
 * moving.
 */
export declare const ARREARS_STABILITY_COST = 1.2;
/**
 * One week of the standing appropriation.
 *
 * Runs after the policy phase, because a program and an appropriation both
 * touch the treasury and the order has to be fixed: the country is governed
 * first, and what is left over is what the budget is actually drawn on.
 */
export declare const budgetPhase: TurnPhase;
