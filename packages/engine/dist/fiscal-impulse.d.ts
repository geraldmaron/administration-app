import type { NationId } from "@admin/world";
import { type PolicySet } from "./policy.js";
import { type Campaign } from "./state.js";
/**
 * What one program does to the national books, as shares of output a year: the
 * take it adds, the outlays it adds, and which lines those outlays sit on. The
 * part on the discretionary line is what the President's own authority is a
 * share of; transfers sit on the mandatory programs; the rest is purchases on
 * other lines, defense above all.
 */
export type FiscalProgramShift = {
    readonly take?: number;
    readonly outlays?: number;
    readonly discretionary?: number;
    readonly transfers?: number;
    /** The part of the outlays that builds something, which reaches demand only as it is spent out. */
    readonly investment?: number;
};
/**
 * Consolidation closes reliefs and cuts both lines; investment borrows to
 * build; redistribution raises the take hardest and spends it on transfers,
 * because it is the one program that says out loud who is paying. Extraction
 * banks its royalties and nationalization its dividends in the general fund,
 * and a drawdown is a smaller defense line: about eight tenths and four tenths
 * of a point of output a year, what the programs used to write straight onto
 * the debt every week.
 */
export declare const FISCAL_PROGRAM_SHIFTS: Readonly<Record<string, FiscalProgramShift>>;
/**
 * `cap` is the cut a statutory cap holds the discretionary line to, as a
 * positive share, already counted inside `discretionary`. Kept apart because a
 * cap and the crowding of the President's own borrowing are the same squeeze
 * on the same line, charged once at the larger of the two.
 */
export type ProgramShift = {
    readonly take: number;
    readonly outlays: number;
    readonly discretionary: number;
    readonly transfers: number;
    readonly investment?: number;
    readonly cap?: number;
};
/** A whole program, summed across its domains. */
export declare function programShiftOf(program: Readonly<Record<string, string>> | undefined): ProgramShift;
/** The President's program and the laws on the books, together: everything a President's choices do to the take and the lines. */
export declare function programShift(campaign: Campaign): ProgramShift;
/** What the President's program and laws take less what they spend: their part of the primary balance. */
export declare function programBalance(campaign: Campaign): number;
/** Another government's program, which is what it legislates with. */
export declare function governmentShift(campaign: Campaign, nation: NationId): ProgramShift;
export declare function warOutlayShare(campaign: Campaign, nation: NationId): number;
export declare function unrestOutlayShare(campaign: Campaign, nation: NationId): number;
/** The structural budget by kind, as shares of potential output: what it takes, and what it spends on purchases and on transfers. */
export type StructuralMix = {
    readonly taxes: number;
    readonly purchases: number;
    readonly transfers: number;
};
/** The week's change in the structural budget, weighted by how much of each kind reaches demand. */
export declare function impulseOf(from: StructuralMix, to: StructuralMix): number;
/** Last week's push, faded by a week, plus whatever the budget changed this week. */
export declare function nextImpulse(impulse: number, last: StructuralMix | undefined, now: StructuralMix): number;
/** The kinds a program's shift falls on, relative to the program a government had when its books opened. */
export declare function mixOfShift(shift: ProgramShift): StructuralMix;
/**
 * The week's share of public investment not yet spent that gets spent.
 *
 * Money to build is authorized in a year and spent over several, as contracts
 * are let and work is billed, and it pushes demand as it is spent. The budget
 * office's figure: the Federal-Aid Highway program "typically spends about 25
 * percent of its budgetary resources in the year funds are first made
 * available for obligation; the rest is spent over the next several years"
 * (CBO, The Highway Trust Fund and the Treatment of Surface Transportation
 * Programs in the Federal Budget, June 2014, publication 45416, read
 * 2026-09-28 from its archived copy). New programs spend slower still: CBO's
 * estimate of the 2021 infrastructure law put the first year's outlays at
 * about 5% of each year's new highway and transit authority (Senate Amendment
 * 2137 to H.R. 3684, August 2021, publication 57406). The established
 * program's quarter a year is the rate here, drawn weekly on what is left:
 * 25% of a step spent in the first year, 44% by the second, 58% by the third.
 */
export declare const INVESTMENT_SPENDOUT: number;
/** What of the investment authorized has been spent by this week, moved a week toward what is authorized now. */
export declare function spentInvestment(spent: number, authority: number): number;
/** The budget as it reaches demand: purchases count the investment spent, not the investment authorized. */
export declare function spendingMix(mix: StructuralMix, authority: number, spent: number): StructuralMix;
type ImpulseHistory = {
    readonly impulse: number;
    readonly structural?: StructuralMix;
    readonly investmentSpent?: number;
};
/**
 * A week of the budget's push on demand: last week's faded, plus the week's
 * change in what is spent. A record kept before investment spent out reads as
 * all of it spent, so opening such a record pushes nothing.
 */
export declare function weekOfImpulse(last: ImpulseHistory, mix: StructuralMix, investment: number): Required<ImpulseHistory>;
/** The push a government's budget is giving its economy this week, as last week's books left it. */
export declare function fiscalImpulse(campaign: Campaign, nation: NationId): number;
/**
 * The push a program the President has not adopted would give in the week it
 * was adopted, for the preview beside it: what it changes in the take and the
 * lines, weighted by kind, with only the first week's spending of any
 * investment it authorizes.
 */
export declare function projectFiscalImpulse(campaign: Campaign, draft: Partial<PolicySet>): number;
export {};
