import { type Campaign, type OutlayFunction, type RevenueSource } from "./state.js";
import { type BudgetAllocation } from "./budget.js";
import type { PolicySet } from "./policy.js";
import { type FiscalCost } from "./national-books.js";
import { type SovereignRating } from "./sovereign.js";
import { type Effect } from "./effects.js";
import type { TurnPhase } from "./turn-loop.js";
/** Annualized money, in the nominal USD millions every figure in the dataset is. */
export type FiscalStatement = {
    readonly revenue: Readonly<Record<RevenueSource, number>>;
    readonly outlay: Readonly<Record<OutlayFunction, number>>;
    readonly revenueTotal: number;
    readonly outlayTotal: number;
    /** Revenue less outlay. Negative is a deficit, which is the usual case. */
    readonly balance: number;
    readonly debt: number;
    readonly debtToGdp: number;
    /** Nominal output: what every share of it on the statement is taken against. */
    readonly gdp: number;
    /**
     * What the commitments the administration is carrying cost, already counted
     * inside `outlay`. Reported separately because it is the part a decision can
     * end, and a deficit nobody can attribute is a deficit nobody can close.
     */
    readonly commitmentCost: number;
    /** Payments recorded on clean-power contracts since tracking began; a separate time basis covered by ordinary discretionary budgets. */
    readonly cleanPowerPaymentsRecorded: number;
    /** Payments withheld at the debt limit, a year's rate; nothing unless the Treasury has run out of room. */
    readonly unpaid: number;
};
/**
 * What the government takes in this year, source by source. Read off the
 * standing program rather than stored, so a player who changes the fiscal
 * stance sees the revenue line move on the same screen that made the change.
 */
export declare function selectRevenue(campaign: Campaign): Readonly<Record<RevenueSource, number>>;
/**
 * What the government spends this year, function by function. Defense is the
 * authored military budget at today's prices; the rest are shares of what the
 * economy could produce, moved by the program that governs them. Commitments
 * are added on their own line, which is what makes an aid package something the
 * deficit feels rather than a sentence in a scenario.
 */
export declare function selectOutlay(campaign: Campaign): Readonly<Record<OutlayFunction, number>>;
export declare function selectFiscalStatement(campaign: Campaign): FiscalStatement;
/**
 * The letter one year's figures alone would read at: the stock against output
 * and whether this year adds to it, the deficit weighted five to one because
 * agencies move on the trajectory before the ratio arrives. A snapshot, not the
 * rating: the rating is the agencies' notch in the books, reviewed on what
 * changed since they last looked (`reviewRating`).
 */
export declare function sovereignRatingFor(debtToGdpRatio: number, balanceShareOfGdp: number): SovereignRating;
/** How much the Treasury is permitted to owe, in the same USD millions the debt is stated in. */
export declare function borrowingCeiling(campaign: Campaign): number;
export type DebtPoint = {
    /** Years from now; a fraction for a path read week by week. */
    readonly year: number;
    readonly debt: number;
    /** Nominal output. */
    readonly gdp: number;
    readonly debtToGdp: number;
    /** The yearly interest bill at that point, USD millions; absent where the path does not price it. */
    readonly interest?: number;
};
/**
 * Where the debt goes if nothing changes — a first-class series, not a number.
 *
 * The single ratio cannot answer the only question a president actually has
 * about the debt, which is whether it is on a path that ends somewhere
 * survivable. Two governments at the same ratio with opposite balances are in
 * completely different situations, and a screen showing one figure shows them
 * as identical.
 */
export type DebtTrajectoryOptions = {
    /** How far the path runs, in years. */
    readonly years?: number;
    /** How often it is read: every 52 weeks by default, every week at 1. */
    readonly everyWeeks?: number;
    /** Stances drafted but not yet adopted, read as if they held from this week. */
    readonly draft?: Partial<PolicySet>;
};
export declare function selectDebtTrajectory(campaign: Campaign, options?: number | DebtTrajectoryOptions): readonly DebtPoint[];
/**
 * What a set of effects would add to the deficit, the debt and the interest
 * bill, a year of each: the week booked through the same step the settlement
 * uses, then the rest of the year at the deficit it added, and a year's
 * interest on all of it at what new borrowing costs today.
 */
export declare function projectFiscalCost(campaign: Campaign, effects: readonly Effect[]): FiscalCost;
/**
 * The discretionary appropriation the President's authority is released from,
 * per year, in constant dollars.
 *
 * Not the discretionary outlay line: a fiscal program's added spending is
 * earmarked for the program and reaches the deficit, never the President's own
 * wallet, while a program's cut shrinks the base the authority is a share of.
 * And the interest on the stock the President's own program added comes out of
 * it, so a President's borrowing is paid for in the one currency a President
 * spends. Held on potential output in constant dollars, so a recession does not
 * shrink an appropriation and a year of inflation does not rescale every price
 * in the game.
 */
export declare function discretionaryAppropriation(campaign: Campaign): number;
/**
 * The rate the appropriation releases at, per week. No money is drawn from the
 * Treasury but in consequence of appropriations made by law, so the only thing
 * that credits the President's authority is the appropriation Congress has
 * already enacted, released a week at a time the way OMB apportions it.
 */
export declare function weeklyApportionment(campaign: Campaign): number;
/**
 * The most budget authority an administration may be holding at once: the
 * carry share the founding opens on. An unobligated balance is not banked, so
 * a president who spends nothing for a year does not arrive at the next one
 * holding a year's discretionary budget in hand.
 */
export declare function authorityCeiling(campaign: Campaign): number;
/**
 * The week's release of the enacted appropriation, before the accounts draw
 * on it. Nothing is released during a lapse: that is what a lapse is, which is
 * what makes the guard in `obligationAvailability` a fact about the accounts.
 */
export declare const apportionmentPhase: TurnPhase;
/**
 * The week the country's own books have, and every other country's.
 *
 * Runs after `commitmentPhase`, which is where the week's obligations are
 * finally known. It writes the levels (the debt the deficit accumulates into,
 * the output growth compounds, the rates the debt reprices at) and never a
 * rate of the economy: `macroDriftPhase` owns the law of growth, inflation and
 * unemployment. It is the one writer of output for every nation.
 *
 * The accrual is background: a week of arithmetic the Record does not need to
 * list. What the week decided (a rating action, the limit binding, the X-date,
 * a week of withheld payments) is written as its own packet naming its cause.
 */
export declare const fiscalPhase: TurnPhase;
/**
 * The horizon an appropriation has to survive: the year it is voted for.
 *
 * The appropriation alone is not the standing bill, so the budget screen's
 * warning cannot be read against it. Two consequences of doing so, both
 * measured: maxing every buildable account to its cap from a fresh founding
 * still leaves thirty-seven weeks of funding, so no slider position a
 * first-term player can reach ever trips the warning; and a commitment, the
 * sustainment of a war, a basing arrangement, a standing program, costs
 * nothing at all as far as the warning is concerned, which is exactly the
 * spending a president is least able to see and most likely to accumulate.
 *
 * Counted against a year rather than half of one because a year is what the
 * appropriation is *for*: the honest statement is "this draft does not reach
 * the next appropriation", not "this draft runs out eventually".
 */
export declare const SOLVENCY_HORIZON_TURNS: number;
export type SolvencyReading = {
    /** What the capability accounts draw this week, above the sustainment line. */
    readonly appropriationCost: number;
    /** What the standing commitments draw this week. */
    readonly commitmentCost: number;
    /** The two together — everything the draft obliges the treasury to pay weekly. */
    readonly weeklyDraw: number;
    /**
     * Weeks the standing authority carries that draw, counting the week's own
     * apportionment against it. `Infinity` when the appropriation covers the draw,
     * which is what a government holding the line inside its own budget is.
     */
    readonly turnsFunded: number;
    /** True when the draft does not reach the next appropriation. */
    readonly underfunded: boolean;
    readonly summary: string;
};
/**
 * Whether the administration can pay for what it has voted itself, this week
 * and for the year the appropriation covers.
 *
 * Takes an optional allocation so the budget room can read the draft under the
 * player's hand rather than the one currently in force — the same argument
 * `selectBudgetOutlook` takes, and for the same reason.
 */
export declare function selectSolvency(campaign: Campaign, allocation?: BudgetAllocation): SolvencyReading;
export type FiscalOutlook = {
    /** Everything the standing draft obliges the treasury to pay, per week. */
    readonly weeklyDraw: number;
    /** The same claim as a year, which is the term the national accounts are in. */
    readonly annualDraw: number;
    /** The outlay line that claim is written inside. */
    readonly discretionary: number;
    /** The claim as a share of that line, 0..1 and uncapped above it. */
    readonly shareOfDiscretionary: number;
    /** The federal balance, with this administration's own claim added to it. */
    readonly balanceWithDraw: number;
    /** Whether the treasury carries the draw to the next appropriation. */
    readonly survivesTheYear: boolean;
    readonly turnsFunded: number;
    readonly summary: string;
};
/**
 * Whether what this administration has voted itself survives the year, said in
 * both books at once.
 *
 * The budget room could already read the treasury running out. What it could
 * not read is the fact that makes that number mean something: the same claim
 * as a share of the discretionary spending the country actually does, and what
 * it does to a balance that was already negative before this presidency voted
 * anything.
 */
export declare function selectFiscalOutlook(campaign: Campaign, allocation?: BudgetAllocation): FiscalOutlook;
