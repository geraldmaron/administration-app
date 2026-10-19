import { debtToGdp, type NationId } from "@admin/world";
import { selectNation, type Campaign, type OutlayFunction, type RevenueSource } from "./state.js";
import { selectConflictBetween } from "./conflicts.js";
import { commitmentWeeklyCost } from "./commitments.js";
import { selectBudgetOutlook, type BudgetAllocation } from "./budget.js";
import { TURNS_PER_YEAR } from "./pace.js";
import type { PolicySet } from "./policy.js";
import {
  AGING_PER_YEAR,
  bookUsDebt,
  booksEffect,
  pendingOffshoreLeaseBonus,
  booksFor,
  commitmentOutlay,
  foreignWeek,
  outputStep,
  trendGrowth,
  usBooksWeek,
  usCrowding,
  usDiscretionaryLine,
  usOutlays,
  usPosition,
  usRevenue,
  usStructuralBalance,
  usStructuralMix,
  WEEK_OF_YEAR,
  type BooksWeek,
  type FiscalCost,
  type UsPosition,
} from "./national-books.js";
import { programShift } from "./fiscal-impulse.js";
import {
  fiscalCrises,
  foreignDowngradeEntry,
  rollBills,
  rollCoupons,
  usEffectiveRate,
  usRatingEntry,
  type RecordEntry,
  type SovereignRating,
} from "./sovereign.js";
import {
  closeLimitWeek,
  governanceNotch,
  limitCeiling,
  limitEntry,
  limitRecord,
  mustWithhold,
  openLimitWeek,
  usUnprioritizedBalance,
  type DebtLimitState,
  type LimitEvent,
} from "./debt-limit.js";
import { AUTHORITY_CARRY_SHARE, DISCRETIONARY_BASE, inShutdown } from "./funding.js";
import { discretionaryCharge, lapseDelayedShare, nextLapseArrears } from "./discretionary-line.js";
import { sameBooks } from "./books-same.js";
import { apply, type Effect, type EffectPacket } from "./effects.js";
import type { TurnPhase } from "./turn-loop.js";

// The fiscal statement: what the state takes in, what it spends it on, and
// what the gap between the two does to the debt.
//
// A president reads a fiscal statement: revenue by source, outlay by function,
// the balance, and where the debt is going if nothing changes. The lines are
// written in `national-books.ts`, beside the rates they are priced at; this
// file rounds them into the statement every screen reads, books the week, and
// keeps the President's own book, the budget authority.

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

const round = (value: number) => Math.round(value);
const round3 = (value: number) => Math.round(value * 1000) / 1000 + 0;
const NO_OUTLAY: Readonly<Record<OutlayFunction, number>> = { defense: 0, entitlements: 0, discretionary: 0, foreignAffairs: 0, debtService: 0 };

function roundLines<K extends string>(lines: Readonly<Record<K, number>>): Record<K, number> {
  return Object.fromEntries(Object.entries(lines).map(([key, value]) => [key, round(value as number)])) as Record<K, number>;
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/**
 * What the government takes in this year, source by source. Read off the
 * standing program rather than stored, so a player who changes the fiscal
 * stance sees the revenue line move on the same screen that made the change.
 */
export function selectRevenue(campaign: Campaign): Readonly<Record<RevenueSource, number>> {
  const position = usPosition(campaign);
  if (!position) return { income: 0, corporate: 0, tariff: 0, other: 0 };
  return roundLines(usRevenue(campaign, position));
}

/**
 * Past the X-date the Treasury can borrow nothing: interest is paid in full,
 * and everything else is paid from the week's receipts as far as they go.
 * What it cannot pay is withheld across the other lines in proportion, and
 * owed when the limit is lifted.
 */
function withheldLines(outlay: Record<OutlayFunction, number>, revenueTotal: number): { readonly outlay: Record<OutlayFunction, number>; readonly unpaid: number } {
  const shortfall = Math.max(0, sum(Object.values(outlay)) - revenueTotal);
  const payable = sum(Object.values(outlay)) - outlay.debtService;
  if (shortfall === 0 || payable <= 0) return { outlay, unpaid: 0 };
  const factor = Math.max(0, (payable - shortfall) / payable);
  const cut: Record<OutlayFunction, number> = { ...outlay };
  for (const line of ["defense", "entitlements", "discretionary", "foreignAffairs"] as const) cut[line] = Math.floor(outlay[line] * factor);
  const over = sum(Object.values(cut)) - revenueTotal;
  if (over > 0) cut.entitlements = Math.max(0, cut.entitlements - over);
  return { outlay: cut, unpaid: sum(Object.values(outlay)) - sum(Object.values(cut)) };
}

function statementLines(campaign: Campaign, position: UsPosition, withhold: boolean) {
  const revenue = roundLines(usRevenue(campaign, position));
  const outlay = roundLines(usOutlays(campaign, position));
  if (!withhold) return { revenue, outlay, unpaid: 0 };
  return { revenue, ...withheldLines(outlay, sum(Object.values(revenue))) };
}

/** Whether the Treasury is withholding payments now: the limit binds and its room ran out. */
function withholdingNow(campaign: Campaign): boolean {
  const limit = campaign.debtLimit;
  return limit?.bindingSince !== undefined && limit.xDateTurn !== undefined;
}

/**
 * What the government spends this year, function by function. Defense is the
 * authored military budget at today's prices; the rest are shares of what the
 * economy could produce, moved by the program that governs them. Commitments
 * are added on their own line, which is what makes an aid package something the
 * deficit feels rather than a sentence in a scenario.
 */
export function selectOutlay(campaign: Campaign): Readonly<Record<OutlayFunction, number>> {
  const position = usPosition(campaign);
  if (!position) return NO_OUTLAY;
  return statementLines(campaign, position, withholdingNow(campaign)).outlay;
}

function statementFor(campaign: Campaign, position: UsPosition | undefined, withhold: boolean): FiscalStatement {
  if (!position) {
    return { revenue: { income: 0, corporate: 0, tariff: 0, other: 0 }, outlay: NO_OUTLAY,
      revenueTotal: 0, outlayTotal: 0, balance: 0, debt: 0, debtToGdp: 0, gdp: 0,
      commitmentCost: 0, cleanPowerPaymentsRecorded: 0, unpaid: 0 };
  }
  const { revenue, outlay, unpaid } = statementLines(campaign, position, withhold);
  const revenueTotal = sum(Object.values(revenue));
  const outlayTotal = sum(Object.values(outlay));
  return {
    revenue,
    outlay,
    revenueTotal,
    outlayTotal,
    balance: revenueTotal - outlayTotal,
    debt: round(position.debt),
    debtToGdp: round3(debtToGdp(position.runtime.stats)),
    gdp: round(position.output),
    commitmentCost: round(sum(Object.values(commitmentOutlay(campaign)))),
    cleanPowerPaymentsRecorded: round3((campaign.cleanPowerPurchases ?? []).reduce((total, purchase) =>
      total + (purchase.paidUsdMillions ?? 0), 0)),
    unpaid,
  };
}

export function selectFiscalStatement(campaign: Campaign): FiscalStatement {
  return statementFor(campaign, usPosition(campaign), withholdingNow(campaign));
}

/**
 * The letter one year's figures alone would read at: the stock against output
 * and whether this year adds to it, the deficit weighted five to one because
 * agencies move on the trajectory before the ratio arrives. A snapshot, not the
 * rating: the rating is the agencies' notch in the books, reviewed on what
 * changed since they last looked (`reviewRating`).
 */
export function sovereignRatingFor(debtToGdpRatio: number, balanceShareOfGdp: number): SovereignRating {
  const strain = Math.max(0, debtToGdpRatio - balanceShareOfGdp * 5);
  if (strain < 0.9) return "AAA";
  if (strain < 1.6) return "AA";
  if (strain < 2.1) return "A";
  if (strain < 2.6) return "BBB";
  if (strain < 3.2) return "BB";
  if (strain < 3.9) return "B";
  if (strain < 4.6) return "CCC";
  return "D";
}

/** How much the Treasury is permitted to owe, in the same USD millions the debt is stated in. */
export function borrowingCeiling(campaign: Campaign): number {
  const position = usPosition(campaign);
  if (!position) return 0;
  return round(limitCeiling(campaign, limitRecord(campaign), position.output));
}

// --- Where the debt is going ---------------------------------------------------

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

/**
 * The path, a week at a time through the same booking the settlement uses. The
 * first week is the week `fiscalPhase` is about to book; after it the economy
 * runs at its potential on today's program and today's market rates, with the
 * aging of the programs still adding its tenth of a point a year.
 */
function projectUsDebt(campaign: Campaign, position: UsPosition, weeks: number): readonly DebtPoint[] {
  const statement = statementFor(campaign, position, withholdingNow(campaign));
  const macro = campaign.macro?.[position.runtime.base.id];
  const nominalGrowth = outputStep(trendGrowth(position.runtime)) * (1 + (macro?.expectedInflation ?? 0)) ** WEEK_OF_YEAR;
  const primary = usStructuralBalance(campaign, position);
  const { rates } = position.books;
  let debt = bookUsDebt(position.debt, statement.balance);
  let potential = position.potential * nominalGrowth;
  let bills = rates.bills ?? rates.effective;
  let coupons = rates.coupons ?? rates.effective;
  const point = (week: number): DebtPoint => ({
    year: week * WEEK_OF_YEAR,
    debt,
    gdp: round(potential),
    debtToGdp: round3(debt / potential),
    interest: round(usEffectiveRate(bills, coupons) * debt),
  });
  const points: DebtPoint[] = [point(1)];
  for (let week = 2; week <= weeks; week += 1) {
    const aging = AGING_PER_YEAR * (week - 1) * WEEK_OF_YEAR;
    const effective = usEffectiveRate(bills, coupons);
    const balance = (primary - aging) * potential - effective * debt;
    const next = bookUsDebt(debt, balance);
    bills = rollBills(bills, macro?.policyRate ?? bills);
    coupons = rollCoupons(coupons, rates.market, Math.max(0, -balance) / Math.max(1, debt));
    debt = next;
    potential *= nominalGrowth;
    points.push(point(week));
  }
  return points;
}

/** The campaign with the drafted stances adopted, as the path reads it. */
function withDraft(campaign: Campaign, draft: Partial<PolicySet> | undefined): Campaign {
  if (!draft || Object.keys(draft).length === 0) return campaign;
  return { ...campaign, player: { ...campaign.player, policies: { ...campaign.player.policies, ...draft } } };
}

export function selectDebtTrajectory(campaign: Campaign, options: number | DebtTrajectoryOptions = {}): readonly DebtPoint[] {
  const settings = typeof options === "number" ? { years: options } : options;
  const years = settings.years ?? 10;
  const every = Math.max(1, Math.round(settings.everyWeeks ?? TURNS_PER_YEAR));
  const drafted = withDraft(campaign, settings.draft);
  const position = usPosition(drafted);
  if (!position) return [];
  return projectUsDebt(drafted, position, Math.round(years * TURNS_PER_YEAR)).filter((_, index) => (index + 1) % every === 0);
}

const NO_COST: FiscalCost = { deficit: 0, debt: 0, interest: 0 };

/**
 * What a set of effects would add to the deficit, the debt and the interest
 * bill, a year of each: the week booked through the same step the settlement
 * uses, then the rest of the year at the deficit it added, and a year's
 * interest on all of it at what new borrowing costs today.
 */
export function projectFiscalCost(campaign: Campaign, effects: readonly Effect[]): FiscalCost {
  if (effects.length === 0) return NO_COST;
  const after = apply(campaign, { source: "simulate", actor: "player", turn: campaign.turn, narration: { summary: "What the books would look like." }, effects });
  const was = usPosition(campaign);
  const now = usPosition(after);
  if (!was || !now) return NO_COST;
  const before = statementFor(campaign, was, withholdingNow(campaign)).balance;
  const balance = statementFor(after, now, withholdingNow(after)).balance;
  const week = bookUsDebt(now.debt, balance) - bookUsDebt(was.debt, before);
  const debt = round(week + ((TURNS_PER_YEAR - 1) * (before - balance)) / TURNS_PER_YEAR);
  return { deficit: round(before - balance), debt, interest: round(debt * was.books.rates.market) };
}

// --- The apportionment: where the President's money actually comes from -----

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
export function discretionaryAppropriation(campaign: Campaign): number {
  const position = usPosition(campaign);
  if (!position) return 0;
  const shift = programShift(campaign);
  const cap = shift.cap ?? 0;
  const cut = Math.min(0, shift.discretionary + cap);
  const line = (position.potential / position.price) * Math.max(0.01, DISCRETIONARY_BASE + cut);
  return round(Math.max(0, line - discretionaryCharge(position.potential, cap, usCrowding(position)) / position.price));
}

/**
 * The rate the appropriation releases at, per week. No money is drawn from the
 * Treasury but in consequence of appropriations made by law, so the only thing
 * that credits the President's authority is the appropriation Congress has
 * already enacted, released a week at a time the way OMB apportions it.
 */
export function weeklyApportionment(campaign: Campaign): number {
  return round(discretionaryAppropriation(campaign) / TURNS_PER_YEAR);
}

/**
 * The most budget authority an administration may be holding at once: the
 * carry share the founding opens on. An unobligated balance is not banked, so
 * a president who spends nothing for a year does not arrive at the next one
 * holding a year's discretionary budget in hand.
 */
export function authorityCeiling(campaign: Campaign): number {
  return round(discretionaryAppropriation(campaign) * AUTHORITY_CARRY_SHARE);
}

/**
 * The week's release of the enacted appropriation, before the accounts draw
 * on it. Nothing is released during a lapse: that is what a lapse is, which is
 * what makes the guard in `obligationAvailability` a fact about the accounts.
 */
export const apportionmentPhase: TurnPhase = (state: Campaign) => {
  if (inShutdown(state)) return [];
  const room = authorityCeiling(state) - state.player.metrics.treasury;
  const credit = Math.min(weeklyApportionment(state), round(room));
  if (credit <= 0) return [];
  return [
    {
      source: "simulate",
      actor: "player",
      turn: state.turn + 1,
      background: true,
      narration: {
        summary: `This week, ${credit.toLocaleString("en-US")} million of the budget Congress passed becomes available to spend.`,
      },
      effects: [{ kind: "metric", deltas: { treasury: credit } }],
    },
  ] satisfies readonly EffectPacket[];
};

// --- The country's own books, a week at a time -------------------------------

/** What the United States' week came to, before it is written. */
type UsBooked = {
  readonly statement: FiscalStatement;
  readonly debt: number;
  readonly gdp: number;
  readonly gdpPerCapita: number;
  readonly limit: DebtLimitState;
  readonly events: readonly LimitEvent[];
  readonly books: BooksWeek;
};

function bookUsWeek(state: Campaign, position: UsPosition, crises: ReturnType<typeof fiscalCrises>): UsBooked {
  const limit = limitRecord(state);
  const need = Math.max(0, -usUnprioritizedBalance(state, position)) / TURNS_PER_YEAR;
  const opening = openLimitWeek(state, limit, position, need);
  const statement = statementFor(state, position, mustWithhold(opening.state, need));
  const lapse = nextLapseArrears(
    position.books.lapseArrears ?? 0,
    (usDiscretionaryLine(state, position) * lapseDelayedShare(state)) / TURNS_PER_YEAR,
    inShutdown(state),
  );
  const debt = bookUsDebt(position.debt, statement.balance, opening.arrearsPaid + lapse.paid);
  const closed = closeLimitWeek(state, opening, {
    debt,
    borrowing: Math.max(0, debt - position.debt),
    withheld: statement.unpaid / TURNS_PER_YEAR,
  });
  const economy = position.runtime.stats.economy;
  const compounding = outputStep(economy.growth);
  const gdp = round(economy.gdp * compounding);
  const books = usBooksWeek(state, position, {
    balance: statement.balance,
    debt,
    gdp,
    mix: usStructuralMix(state, position, statement.outlay),
    interestShare: statement.revenueTotal > 0 ? statement.outlay.debtService / statement.revenueTotal : 0,
    governance: governanceNotch(closed.state, state.turn),
    forceReview: closed.events.some((event) => event.kind === "x-date"),
    ...(crises.get(position.runtime.base.id) ? { crisis: crises.get(position.runtime.base.id)! } : {}),
  });
  const { lapseArrears: _settled, ...rest } = books.books;
  const kept = { ...books, books: lapse.owed > 0 ? { ...rest, lapseArrears: lapse.owed } : rest };
  return { statement, debt, gdp, gdpPerCapita: round(economy.gdpPerCapita * compounding), limit: closed.state, events: closed.events, books: kept };
}

/** A foreign downgrade is the President's news where the United States is fighting that government or has a measure on it. */
function usCaused(state: Campaign, nation: NationId): boolean {
  if (selectConflictBetween(state, state.founding.nation, nation)) return true;
  return Object.values(state.trade.measures).some(
    (measure) => measure.target === nation && measure.origin === "us" && measure.liftedTurn === undefined,
  );
}

type WorldBooked = { readonly effects: readonly Effect[]; readonly downgrades: readonly (BooksWeek & { readonly nation: NationId })[] };

/**
 * Every other government's week: its output grows at its own rate and its books
 * take the identity. Output is real and grows at real growth, as the
 * President's does; prices reach it through the index `debtToGdp` deflates by.
 */
function bookWorldWeek(state: Campaign, crises: ReturnType<typeof fiscalCrises>): WorldBooked {
  const us = selectNation(state, state.founding.nation);
  const dollar = {
    inflation: us?.stats.economy.inflation ?? 0.02,
    expectedInflation: state.macro?.[state.founding.nation]?.expectedInflation ?? us?.stats.economy.inflation ?? 0.02,
  };
  const effects: Effect[] = [];
  const downgrades: (BooksWeek & { readonly nation: NationId })[] = [];
  for (const id of (Object.keys(state.nations) as NationId[]).sort((a, b) => (a as string).localeCompare(b as string))) {
    const runtime = state.nations[id];
    if (id === state.founding.nation || !runtime) continue;
    const kept = state.books?.[id];
    const week = foreignWeek(state, runtime, booksFor(state, runtime), dollar, crises.get(id));
    effects.push({ kind: "nationStat", nation: id, setStats: { economy: { ...week.economy, ...(week.letter ? { sovereignRating: week.letter } : {}) } } });
    if (!sameBooks(kept, week.books)) effects.push(booksEffect(id, week.books));
    if (week.action?.kind === "downgrade" && usCaused(state, id)) downgrades.push({ ...week, nation: id });
  }
  return { effects, downgrades };
}

function fiscalWeekSummary(balance: number): string {
  const weekly = round(balance / TURNS_PER_YEAR);
  if (weekly === 0) return "The week adds nothing to the federal debt.";
  const week = Math.abs(weekly).toLocaleString("en-US");
  return weekly < 0 ? `The week adds ${week} million to the federal debt.` : `The week retires ${week} million of the federal debt.`;
}

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
export const fiscalPhase: TurnPhase = (state: Campaign) => {
  const position = usPosition(state);
  if (!position) return [];
  const crises = fiscalCrises(state);
  const booked = bookUsWeek(state, position, crises);
  const receiptIds = pendingOffshoreLeaseBonus(state).ids;
  const usBooks = receiptIds.length > 0 ? { ...booked.books.books,
    leaseBonusReceiptIds: [...(booked.books.books.leaseBonusReceiptIds ?? []), ...receiptIds] } : booked.books.books;
  const world = bookWorldWeek(state, crises);
  const nation = position.runtime.base.id;
  const accrual: Effect[] = [
    { kind: "nationStat", nation, setStats: { economy: { debt: booked.debt, gdp: booked.gdp, gdpPerCapita: booked.gdpPerCapita } } },
    ...world.effects,
    ...(sameBooks(state.books?.[nation], usBooks) ? [] : [booksEffect(nation, usBooks)]),
    { kind: "debtLimit", set: booked.limit },
  ];
  const turn = state.turn + 1;
  const entries = [
    usRatingEntry(state, position.books.anchor, booked.books, { crisisOpen: crises.has(nation), ownBorrowing: ownBorrowing(position) }),
    limitEntry(state, booked.events),
    foreignDowngradeEntry(state, world.downgrades.map((week) => ({ ...week, opening: week.books.anchor }))),
  ].filter((entry): entry is RecordEntry => entry !== undefined);
  return [
    { source: "simulate", actor: "world", turn, background: true, narration: { summary: fiscalWeekSummary(booked.statement.balance) }, effects: accrual },
    ...entries.map((entry) => ({ source: "simulate" as const, actor: "world" as const, turn, narration: { summary: entry.summary }, effects: entry.effects })),
  ] satisfies readonly EffectPacket[];
};

/** Whether the President's own program has added enough to the stock for the agencies to name it: a point of output. */
function ownBorrowing(position: UsPosition): boolean {
  return (position.books.choiceDebt ?? 0) >= 0.01 * position.output;
}

// --- Solvency: whether the administration can pay for what it has voted -----

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
export const SOLVENCY_HORIZON_TURNS = TURNS_PER_YEAR;

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
export function selectSolvency(campaign: Campaign, allocation?: BudgetAllocation): SolvencyReading {
  const appropriationCost = selectBudgetOutlook(campaign, allocation).turnCost;
  const commitmentCost = commitmentWeeklyCost(campaign);
  const weeklyDraw = appropriationCost + commitmentCost;
  // Net of the week's own release. A draft drawing less than the appropriation
  // apportions is funded forever, which is the honest reading of a government
  // living inside its own budget — measuring the stock against the gross draw
  // would have called every such government insolvent on a long enough horizon.
  const netDraw = weeklyDraw - weeklyApportionment(campaign);
  const turnsFunded = netDraw > 0 ? Math.floor(campaign.player.metrics.treasury / netDraw) : Infinity;
  const underfunded = netDraw > 0 && turnsFunded < SOLVENCY_HORIZON_TURNS;
  return {
    appropriationCost,
    commitmentCost,
    weeklyDraw,
    turnsFunded,
    underfunded,
    summary: underfunded
      ? `At this rate the money Congress set aside runs out in ${turnsFunded} week${turnsFunded === 1 ? "" : "s"}, before the budget year ends.`
      : "At this rate the money Congress set aside lasts the full budget year.",
  };
}

// --- The seam between the two books ----------------------------------------
//
// --- The seam between the two books ----------------------------------------
//
// The nation keeps one set of books and the administration keeps another, and
// they are not the same book by design.
//
// `selectFiscalStatement` above is the *government's* year: every dollar of
// federal revenue against every dollar of federal outlay, pensions and interest
// included. `player.metrics.treasury` is not a slice of that and never was, and
// it is not cash either. It is **budget authority**: the part of the enacted
// discretionary appropriation this administration is currently holding, founded
// at a quarter of the year's line (`openingBudgetAuthority`, funding.ts) and
// released a week at a time by `apportionmentPhase`. That is why an executive
// order charges it, an appropriation above the sustainment line draws it, and
// holding the establishment the country already funds costs it nothing.
//
// It keeps the key `treasury` and only the key. The scenario schema's
// commitment-cost field is `reply.commitment.cost.treasury` across two dozen
// content files and every shipped reply, so renaming the metric is a corpus
// migration rather than an engine change, and the migration is the owner's to
// call. Everything the name meant has moved: the label, the definition, the
// founding, the replenishment, the floor.
//
// Reconciling the two books by folding the weekly national balance into the
// authority was considered and rejected on the arithmetic, and the arithmetic
// is worth restating because the version recorded here for a long time was
// measured against a founding scale that had already been retired twice. On the
// shipped dataset: the federal balance is −1,964,384 a year against output of
// 27,498,847, which is 7.1% of output — not "roughly a tenth". A week of it is
// 37,777. Against the authority the President now founds on, 357,485, that is
// 10.6% of the opening stock a week and a runway of nine and a half weeks, so
// an administration really would be out of authority inside a quarter having
// decided nothing — and every price in the game would have to be rescaled
// against a number moving for reasons no player caused. That is not one book,
// it is the wrong book: it charges an administration for the pension system it
// inherited.
//
// So the seam is documented rather than closed, here and in SCHEMA.md, and what
// the budget desk gets instead is the reading the seam was hiding: what this
// administration's own claim comes to against the discretionary line it is
// written inside, and whether the year survives it. Two books, one statement.
// The deficit now moves the country's book every week (`fiscalPhase`), and the
// appropriation moves the administration's (`apportionmentPhase`); neither
// phase writes the other's.

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
export function selectFiscalOutlook(campaign: Campaign, allocation?: BudgetAllocation): FiscalOutlook {
  const solvency = selectSolvency(campaign, allocation);
  const statement = selectFiscalStatement(campaign);
  const annualDraw = round(solvency.weeklyDraw * TURNS_PER_YEAR);
  const discretionary = statement.outlay.discretionary;
  const survivesTheYear = !solvency.underfunded;
  return {
    weeklyDraw: solvency.weeklyDraw,
    annualDraw,
    discretionary,
    shareOfDiscretionary: discretionary > 0 ? round3(annualDraw / discretionary) : 0,
    balanceWithDraw: round(statement.balance - annualDraw),
    survivesTheYear,
    turnsFunded: solvency.turnsFunded,
    summary: survivesTheYear
      ? `A year of this draft is ${shareWords(annualDraw, discretionary)} of what the country spends on everything government does outside pensions, defense and interest, and the money Congress set aside covers it until the next budget.`
      : `A year of this draft is ${shareWords(annualDraw, discretionary)} of the discretionary budget, and the authority does not reach the next appropriation: it runs out in ${solvency.turnsFunded} week${solvency.turnsFunded === 1 ? "" : "s"}.`,
  };
}

function shareWords(draw: number, discretionary: number): string {
  if (discretionary <= 0 || draw <= 0) return "nothing";
  return `${Math.round((draw / discretionary) * 100)}%`;
}
