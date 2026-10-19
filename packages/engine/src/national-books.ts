import { debtToGdp, type NationId } from "@admin/world";
import type { Effect } from "./effect-types.js";
import { backstopRelief } from "./backstop.js";
import { extendTrail, type BooksTrail } from "./books-trail.js";
import { NO_CYCLE } from "./business-cycle.js";
import { activeCommitments } from "./commitments.js";
import { lawShift, lawShiftOverTenYears } from "./law-offsets.js";
import { discretionaryCharge, discretionaryShare, lapseDelayedShare } from "./discretionary-line.js";
import { selectCustomsReceipts } from "./trade.js";
import { pendingOffshoreLeaseBonus } from "./offshore-leasing.js";
export { pendingOffshoreLeaseBonus } from "./offshore-leasing.js";
import { macroBaseline } from "./macro-baseline.js";
import { openingMacro, type MacroState } from "./macro-state.js";
import { TURNS_PER_YEAR } from "./pace.js";
import {
  governmentShift,
  mixOfShift,
  programBalance,
  programShift,
  unrestOutlayShare,
  weekOfImpulse,
  warOutlayShare,
  type StructuralMix,
} from "./fiscal-impulse.js";
import {
  interestBurden,
  NO_CRISIS,
  ratioInTenYears,
  type CrisisReading,
  foreignMarketRate,
  fundamentalScore,
  letterOfScore,
  foreignRollover,
  nonErodibleShareOf,
  openingRate,
  openingScore,
  ratingSpread,
  reviewDue,
  reviewRating,
  rollBills,
  rollCoupons,
  rollForeign,
  usCouponMarketRate,
  usDecadeEffectiveRate,
  usEffectiveRate,
  US_BILL_RATE_OPEN,
  US_COUPON_MARKET_OPEN,
  US_COUPON_RATE_OPEN,
  US_EFFECTIVE_RATE_OPEN,
  type RatingAction,
  type RatingFundamentals,
  type RatingState,
  type SovereignRating,
} from "./sovereign.js";
import { selectNation, type Campaign, type NationRuntime, type OutlayFunction, type RevenueSource } from "./state.js";

// Every government's books, kept rather than derived: the rates its debt is
// carried at, what the agencies make of it, the fiscal stress it has lived
// through, and the fiscal push its budget is giving its economy. The part of a
// country's public finance that has a history, which a pure reading of this
// week's stats cannot give back.
//
// A foreign government's books are kept in ratio space. Its debt is a share of
// its output that moves with the rate it pays, its growth, its inflation and its
// primary balance, and the stored stock is only that share times its nominal
// output, so no price index, however wild, can make the ratio drift for a
// reason nobody named.

/** Where each reading stood when the books were opened: what every later move is measured from. */
export type BooksAnchor = {
  readonly openedTurn: number;
  /** The notch the rating opened at. */
  readonly score: number;
  /** Real interest as a share of revenue. */
  readonly burden: number;
  /** The debt ratio ten years out on the structural balance. */
  readonly projected: number;
  /** What the stock cost a year, as a fraction. */
  readonly rate: number;
  /** What new borrowing cost: the ten-year yield for the United States, the blended market rate elsewhere. */
  readonly market: number;
  readonly policyRate: number;
  readonly expectedInflation: number;
  /** The structural primary balance, as a share of output: at rest abroad, on the program the President inherited at home. */
  readonly primaryBalance: number;
  /** The United States only: what the inherited program took less what it spent, as a share of output. */
  readonly programBalance?: number;
};

export type NationBooks = {
  /**
   * Annual rates as fractions. `bills` and `coupons` are the United States' two
   * tranches; `effective` is what the stock costs; `market` is what new
   * borrowing costs today.
   */
  readonly rates: { readonly bills?: number; readonly coupons?: number; readonly effective: number; readonly market?: number };
  readonly rating: RatingState;
  /** How much fiscal stress the government has lived through lately; 0 is none. */
  readonly stress: number;
  /** The fiscal push on demand, as a fraction of output. */
  readonly impulse: number;
  /** Last week's structural primary balance, as a fraction of output. */
  readonly lastStructuralBalance: number;
  /** Last week's structural budget by kind, which the week's change in it is weighed against for the impulse. */
  readonly structural?: StructuralMix;
  /** The public investment authorized that has been spent, a share of output a year: what the impulse counts of it. */
  readonly investmentSpent?: number;
  /** The aid given abroad that the books have already paid for, USD millions a year. */
  readonly aidSeen: number;
  /**
   * The United States only: the stock the President's own program and laws
   * added since the oath, USD millions. Negative when the President has been
   * paying debt down.
   */
  readonly choiceDebt?: number;
  /** Absent only on a record kept before the books were anchored, which the next week reopens. */
  readonly anchor?: BooksAnchor;
  /** The United States only: the books' recent weeks; absent until the first week that keeps one. */
  readonly trail?: BooksTrail;
  /** The United States only: pay and purchases a lapse has delayed, USD millions, owed the week it ends. */
  readonly lapseArrears?: number;
  /** One-time offshore lease bonuses already included in a weekly fiscal statement. */
  readonly leaseBonusReceiptIds?: readonly string[];
};

/** Books as every weekly step reads them: anchored, with a market rate. */
export type AnchoredBooks = NationBooks & {
  readonly rates: NationBooks["rates"] & { readonly market: number };
  readonly anchor: BooksAnchor;
};

function isAnchored(books: NationBooks | undefined): books is AnchoredBooks {
  return books?.anchor !== undefined && books.rates.market !== undefined;
}

// --- Shared readings ----------------------------------------------------------

export const WEEK_OF_YEAR = 1 / 52;

/** Where the economy's output grows when nothing is pulling it: its own trend, without the cycle. */
export function trendGrowth(runtime: NationRuntime): number {
  return macroBaseline(runtime, NO_CYCLE).growth;
}

/** Rich governments collect more of their output than poor ones; a labeled rule until the IMF's revenue figures are vendored. */
function revenueShareFor(wealthTier: number): number {
  return [0.14, 0.18, 0.22, 0.28, 0.35][Math.min(5, Math.max(1, wealthTier)) - 1]!;
}

/**
 * One week of a foreign government's debt ratio: what it owes compounds at the
 * rate it pays, the part it owes in foreign money is revalued by the gap
 * between its inflation and the dollar's, output growth dilutes it, and the
 * primary balance pays it down or adds to it. The deflation by its own prices is
 * already in `ratio`: the index moved before the books were kept this week.
 */
export function foreignRatioStep(inputs: {
  readonly ratio: number;
  readonly rate: number;
  readonly growth: number;
  readonly inflation: number;
  readonly usInflation: number;
  readonly nonErodible: number;
  readonly primaryBalance: number;
}): number {
  const interest = (1 + inputs.rate) ** WEEK_OF_YEAR;
  const revaluation = ((1 + inputs.inflation) / (1 + inputs.usInflation)) ** WEEK_OF_YEAR;
  const carried = (1 - inputs.nonErodible) * interest + inputs.nonErodible * interest * revaluation;
  return Math.max(0, (inputs.ratio * carried) / outputStep(inputs.growth) - inputs.primaryBalance * WEEK_OF_YEAR);
}

/**
 * One week of output growth, the step every economy's output and its potential
 * both compound by, so an economy growing at its trend holds its gap exactly
 * and a ratio is diluted by exactly the growth its output took.
 */
export function outputStep(growth: number): number {
  return 1 + growth * WEEK_OF_YEAR;
}

/**
 * The primary balance that holds a ratio where it stands at the country's own
 * rates: the fallback wherever no published path exists, so a government the
 * game has no figures for neither borrows its way up nor pays its way down.
 */
export function stationaryPrimaryBalance(inputs: Omit<Parameters<typeof foreignRatioStep>[0], "primaryBalance">): number {
  const held = foreignRatioStep({ ...inputs, primaryBalance: 0 }) / (1 + inputs.inflation) ** WEEK_OF_YEAR;
  return (held - inputs.ratio) / WEEK_OF_YEAR;
}

// --- The United States' statement ---------------------------------------------
//
// Revenue is collected on what the economy actually produces and outlays are
// written against what it could produce, which is why a slump widens the
// deficit on its own: receipts fall with output while the programs Congress
// wrote go on paying. Both are nominal, so a year of inflation raises the
// receipts and the bills together and the stock they are measured against.

/**
 * What the federal government takes, as a share of output, before the program
 * moves it: about what it collected in FY2025 and is on course for in FY2026,
 * which is also what puts interest at a fifth of revenue.
 */
const BASELINE_TAKE = 0.173;

/** Receipts fall faster than output in a slump: a point of gap moves revenue 1.3 points. */
const REVENUE_GAP_ELASTICITY = 0.3;

/**
 * Where the take comes from. The tariff share is what the duties in force at
 * the oath collect: $195 billion of $5,235 billion of receipts in FY2025
 * (Treasury, Monthly Treasury Statement, September 2025). `other` is not a
 * rounding bucket: excise, payroll surpluses, asset sales and central-bank
 * remittances are a real and unglamorous part of federal revenue.
 */
const REVENUE_MIX: Readonly<Record<RevenueSource, number>> = { income: 0.5, corporate: 0.18, tariff: 0.0372, other: 0.2828 };

/**
 * A year of the customs the administration's own tariffs collect, at this
 * week's rate, from the trade register: the one path new duties reach revenue
 * by, every week a tariff stands and none after it is lifted.
 */
export function usCustomsReceipts(campaign: Campaign): number {
  return selectCustomsReceipts(campaign) * TURNS_PER_YEAR;
}

/**
 * The mandatory programs' share of potential output at the oath: set so the
 * inherited primary deficit is the one the budget office projects, with
 * defense and the discretionary line counted beside it.
 */
const ENTITLEMENT_BASE = 0.1205;

/** An aging country's pensions and health programs grow faster than its output, about a tenth of a point a year. */
export const AGING_PER_YEAR = 0.001;

/** Where the United States stands this week, in the units its statement is written in. */
export type UsPosition = {
  readonly runtime: NationRuntime;
  readonly books: AnchoredBooks;
  readonly price: number;
  /** Nominal output this year, and at potential, USD millions. */
  readonly output: number;
  readonly potential: number;
  /** How far output sits above its potential, as a log share. */
  readonly gap: number;
  /** Debt held by the public, USD millions. */
  readonly debt: number;
  /** Years since the books were opened. */
  readonly years: number;
  readonly nonErodible: number;
};

/** The macro record, or what it would open at, so a campaign read before its records exist is still read in one set of units. */
function macroOf(campaign: Campaign, runtime: NationRuntime): MacroState {
  const kept = campaign.macro?.[runtime.base.id];
  if (kept) return kept;
  return { potential: runtime.stats.economy.gdp, expectedInflation: runtime.base.stats.economy.inflation, policyRate: 0 };
}

export function usPosition(campaign: Campaign): UsPosition | undefined {
  const runtime = selectNation(campaign, campaign.founding.nation);
  if (!runtime) return undefined;
  const macro = macroOf(campaign, runtime);
  const kept = campaign.books?.[runtime.base.id];
  const books = isAnchored(kept) ? kept : provisionalUsBooks(runtime, macro, campaign.turn, programBalance(campaign));
  const economy = runtime.stats.economy;
  const price = economy.costOfLiving;
  const potential = Math.max(1, macro.potential);
  return {
    runtime,
    books,
    price,
    output: Math.max(1, economy.gdp * price),
    potential: potential * price,
    gap: Math.log(Math.max(1, economy.gdp) / potential),
    debt: economy.debt,
    years: Math.max(0, campaign.turn - books.anchor.openedTurn) / TURNS_PER_YEAR,
    nonErodible: nonErodibleShareOf(runtime),
  };
}

export function usRevenueTotal(campaign: Campaign, position: UsPosition, atPotential = false): number {
  const take = Math.max(0.05, BASELINE_TAKE + programShift(campaign).take);
  const customs = usCustomsReceipts(campaign);
  if (atPotential) return position.potential * take + customs;
  return position.output * take * Math.exp(REVENUE_GAP_ELASTICITY * position.gap) + customs
    + pendingOffshoreLeaseBonus(campaign).amountUsdMillions * TURNS_PER_YEAR;
}

/**
 * Revenue by source. The take is split by the mix; the duties on the
 * administration's own tariffs are added to the tariff line on top of it,
 * because a tariff collects money the take did not.
 */
export function usRevenue(campaign: Campaign, position: UsPosition): Record<RevenueSource, number> {
  const customs = usCustomsReceipts(campaign);
  const bonus = pendingOffshoreLeaseBonus(campaign).amountUsdMillions * TURNS_PER_YEAR;
  const taken = usRevenueTotal(campaign, position) - customs - bonus;
  return {
    income: taken * REVENUE_MIX.income,
    corporate: taken * REVENUE_MIX.corporate,
    tariff: taken * REVENUE_MIX.tariff + customs,
    other: taken * REVENUE_MIX.other + bonus,
  };
}

/** What the commitments the administration carries cost per year, by the line each draws on. */
export function commitmentOutlay(campaign: Campaign): Record<OutlayFunction, number> {
  const lines: Record<OutlayFunction, number> = { defense: 0, entitlements: 0, discretionary: 0, foreignAffairs: 0, debtService: 0 };
  for (const commitment of activeCommitments(campaign, campaign.founding.nation)) {
    if (commitment.resource.spec.kind !== "currency") continue;
    // A force commitment draws down the order of battle, and what it costs in
    // money is the sustainment of forces abroad: a defense line either way.
    const line = commitment.source.kind === "budgetLine" ? commitment.source.line : "defense";
    lines[line] += commitment.resource.amountPerTurn * TURNS_PER_YEAR;
  }
  return lines;
}

/**
 * The interest on the stock the President's own program added, which comes out
 * of the discretionary line rather than out of new borrowing: the price of a
 * President's borrowing, paid in the one currency the President spends.
 */
export function usCrowding(position: UsPosition): number {
  return position.books.rates.effective * (position.books.choiceDebt ?? 0);
}

/** The discretionary line as enacted, nominal, before a lapse leaves any of it unpaid: capped or crowded, at the larger of the two. */
export function usDiscretionaryLine(campaign: Campaign, position: UsPosition): number {
  const shift = programShift(campaign);
  const charge = discretionaryCharge(position.potential, shift.cap ?? 0, usCrowding(position));
  return Math.max(0, position.potential * discretionaryShare(shift) - charge);
}

/** A point of unemployment above the country's rest costs about a tenth of a point of potential output in benefits. */
const UNEMPLOYMENT_LINE = 0.1;

/** What the week forces onto the statement that no budget chose: benefits for the jobless, a war, a street in revolt. Nominal, a year's rate. */
export type ForcedOutlays = { readonly unemployment: number; readonly war: number; readonly unrest: number };

export function usForcedOutlays(campaign: Campaign, position: UsPosition): ForcedOutlays {
  const nation = position.runtime.base.id;
  const rest = macroBaseline(position.runtime, NO_CYCLE).unemployment;
  const jobless = Math.max(0, position.runtime.stats.economy.unemployment - rest);
  return {
    unemployment: UNEMPLOYMENT_LINE * jobless * position.potential,
    war: warOutlayShare(campaign, nation) * position.potential,
    unrest: unrestOutlayShare(campaign, nation) * position.potential,
  };
}

/**
 * Outlays by function, before any are withheld at the debt limit. Defense is
 * the authored budget at today's prices; the programs are shares of potential
 * output moved by the program and the laws that govern them; foreign affairs is
 * the standing aid program at today's prices; interest is the stock at what it
 * was issued at. A commitment is paid out of the President's authority, which
 * is already inside the discretionary line, so it is not counted a second time;
 * the same holds for aid the President's rungs send.
 */
export function usOutlays(campaign: Campaign, position: UsPosition): Record<OutlayFunction, number> {
  const shift = programShift(campaign);
  const forced = usForcedOutlays(campaign, position);
  const { runtime, potential, price } = position;
  const entitlementShare = Math.max(0.02, ENTITLEMENT_BASE + shift.transfers + AGING_PER_YEAR * position.years);
  const discretionary = usDiscretionaryLine(campaign, position) * (1 - lapseDelayedShare(campaign));
  const otherPurchases = (shift.outlays - shift.discretionary - shift.transfers) * potential;
  return {
    defense: Math.max(0, runtime.stats.military.budget * price + otherPurchases) + forced.war,
    entitlements: potential * entitlementShare + forced.unemployment,
    discretionary: discretionary + forced.unrest,
    foreignAffairs: runtime.base.stats.softPower.aidGiven * price,
    debtService: position.debt * position.books.rates.effective,
  };
}

/** The budget by kind at potential output, as shares of it, with what the week forced out of it. */
export function usStructuralMix(campaign: Campaign, position: UsPosition, outlays = usOutlays(campaign, position)): StructuralMix {
  const forced = usForcedOutlays(campaign, position);
  // A lapse delays pay and purchases rather than cutting them, so the structure
  // the agencies project and the impulse weighs is the line as enacted.
  const delayed = usDiscretionaryLine(campaign, position) * lapseDelayedShare(campaign);
  const purchases = outlays.defense - forced.war + outlays.discretionary + delayed - forced.unrest + outlays.foreignAffairs;
  return {
    taxes: usRevenueTotal(campaign, position, true) / position.potential,
    purchases: purchases / position.potential,
    transfers: (outlays.entitlements - forced.unemployment) / position.potential,
  };
}

/**
 * The primary balance the country would run at potential output, as a share of
 * it: what the program, the laws and the inherited lines add up to once the
 * cycle, a war and the street are taken out. What the agencies project the
 * debt on.
 */
export function usStructuralBalance(campaign: Campaign, position: UsPosition): number {
  const mix = usStructuralMix(campaign, position);
  return mix.taxes - mix.purchases - mix.transfers;
}

/**
 * The one place the United States' debt is booked: a week of the year's
 * balance, plus whatever payments withheld at the debt limit are made good that
 * week. The settlement, the ten-year path and every preview book through it, so
 * none of them can disagree with the others about a week.
 */
export function bookUsDebt(debt: number, balance: number, arrearsPaid = 0): number {
  return Math.round(Math.max(0, debt - balance / TURNS_PER_YEAR + arrearsPaid));
}

/**
 * The stock the President's own choices added, a week further on: whatever the
 * program took less than the inherited program did, borrowed. Its interest is
 * paid out of the discretionary line, so it adds nothing more to the stock.
 */
export function accrueChoiceDebt(choiceDebt: number, programBalanceChange: number, potential: number): number {
  return choiceDebt - (programBalanceChange * potential) / TURNS_PER_YEAR;
}

// --- Opening ------------------------------------------------------------------

/** A government in a D or CCC tier has already lived through stress by the time anyone counts it. */
function openingStress(runtime: NationRuntime): number {
  const letter = runtime.base.stats.economy.sovereignRating;
  return letter === "D" || letter === "CCC" ? 1 : 0;
}

function openingForeignBooks(campaign: Campaign, runtime: NationRuntime, macro: MacroState, usInflation: number): AnchoredBooks {
  const economy = runtime.stats.economy;
  const program = governmentShift(campaign, runtime.base.id);
  const letter = economy.sovereignRating;
  const rate = openingRate(runtime.base.id, letter);
  const nonErodible = nonErodibleShareOf(runtime);
  const ratio = debtToGdp(runtime.stats);
  const growth = trendGrowth(runtime);
  const inflation = macro.expectedInflation;
  const primaryBalance = stationaryPrimaryBalance({ ratio, rate, growth, inflation, usInflation, nonErodible });
  const score = openingScore(runtime.base.id, letter);
  const shared = { rate, ratio, expectedInflation: inflation, usInflation, nonErodible };
  return {
    rates: { effective: rate, market: rate },
    rating: { score, outlook: "stable" },
    stress: openingStress(runtime),
    impulse: 0,
    lastStructuralBalance: primaryBalance,
    structural: mixOfShift(program),
    investmentSpent: program.investment ?? 0,
    aidSeen: runtime.stats.softPower.aidGiven,
    anchor: {
      openedTurn: campaign.turn,
      score,
      burden: interestBurden({ ...shared, revenueShare: revenueShareFor(runtime.base.bands.wealthTier) }),
      projected: ratioInTenYears({ ratio, rate, growth, inflation, usInflation, nonErodible, primaryBalance }),
      rate,
      market: rate,
      policyRate: macro.policyRate,
      expectedInflation: inflation,
      primaryBalance,
      programBalance: program.take - program.outlays,
    },
  };
}

/**
 * The United States' books before the anchors that need its statement are read
 * off them. The Treasury's own rates are what a top-rated issuer pays; a save
 * that holds a lower letter opens with that letter's spread on every tranche.
 */
function provisionalUsBooks(runtime: NationRuntime, macro: MacroState, turn: number, programAtOath: number): AnchoredBooks {
  const letter = runtime.stats.economy.sovereignRating;
  const score = openingScore(runtime.base.id, letter);
  const spread = ratingSpread(score);
  return {
    rates: {
      bills: US_BILL_RATE_OPEN + spread,
      coupons: US_COUPON_RATE_OPEN + spread,
      effective: US_EFFECTIVE_RATE_OPEN + spread,
      market: US_COUPON_MARKET_OPEN + spread,
    },
    rating: { score, outlook: "stable" },
    stress: openingStress(runtime),
    impulse: 0,
    lastStructuralBalance: 0,
    aidSeen: runtime.stats.softPower.aidGiven,
    choiceDebt: 0,
    anchor: {
      openedTurn: turn,
      score,
      burden: 0,
      projected: 0,
      rate: US_EFFECTIVE_RATE_OPEN + spread,
      market: US_COUPON_MARKET_OPEN + spread,
      policyRate: macro.policyRate,
      expectedInflation: macro.expectedInflation,
      primaryBalance: 0,
      programBalance: programAtOath,
    },
  };
}

function openingUsBooks(campaign: Campaign, runtime: NationRuntime, macro: MacroState): AnchoredBooks {
  const provisional = provisionalUsBooks(runtime, macro, campaign.turn, programBalance(campaign));
  const withBooks: Campaign = { ...campaign, books: { ...campaign.books, [runtime.base.id]: provisional } };
  const position = usPosition(withBooks);
  if (!position) return provisional;
  const structuralBalance = usStructuralBalance(withBooks, position);
  const ratio = debtToGdp(runtime.stats);
  const shared = { rate: provisional.rates.effective, ratio, usInflation: macro.expectedInflation, nonErodible: position.nonErodible };
  return {
    ...provisional,
    lastStructuralBalance: structuralBalance,
    structural: usStructuralMix(withBooks, position),
    investmentSpent: programShift(withBooks).investment ?? 0,
    anchor: {
      ...provisional.anchor,
      burden: interestBurden({ ...shared, expectedInflation: macro.expectedInflation, revenueShare: usRevenueTotal(withBooks, position) / position.output }),
      projected: usProjectedRatio(withBooks, position, { debt: position.debt, structural: structuralBalance }),
      primaryBalance: structuralBalance,
    },
  };
}

/**
 * Every government's books, opened on the country as it stands. The rating
 * reads the letter it holds now, so a save that predates the books opens on its
 * own credit rather than the founding's; the President's own added stock opens
 * at nothing, because a past path is not recoverable from where it ended.
 */
export function openingBooks(campaign: Campaign): Readonly<Record<NationId, NationBooks>> {
  const macro = campaign.macro ?? openingMacro(campaign);
  const player = campaign.founding.nation;
  const usInflation = macro[player]?.expectedInflation ?? 0.02;
  const opened = { ...campaign, macro };
  const books: Record<NationId, NationBooks> = {};
  for (const id of (Object.keys(campaign.nations) as NationId[]).sort((a, b) => (a as string).localeCompare(b as string))) {
    const runtime = selectNation(campaign, id);
    const state = macro[id];
    if (!runtime || !state) continue;
    books[id] =
      id === player ? openingUsBooks(opened, runtime, state) : openingForeignBooks(opened, runtime, state, usInflation);
  }
  return books;
}

export function selectNationalBooks(campaign: Campaign, nation: NationId): NationBooks | undefined {
  return campaign.books?.[nation];
}

/**
 * A government's books as the week reads them. A record kept before the books
 * were anchored is read as though opened today, the same forgiveness a save
 * that predates the books gets.
 */
export function booksFor(campaign: Campaign, runtime: NationRuntime): AnchoredBooks {
  const kept = campaign.books?.[runtime.base.id];
  if (isAnchored(kept)) return kept;
  const macro = macroOf(campaign, runtime);
  if (runtime.base.id === campaign.founding.nation) return openingUsBooks(campaign, runtime, macro);
  const us = selectNation(campaign, campaign.founding.nation);
  const usInflation = us ? macroOf(campaign, us).expectedInflation : macro.expectedInflation;
  return openingForeignBooks(campaign, runtime, macro, usInflation);
}

/** What a set of effects would add to the deficit, the debt and the interest bill, in USD millions a year. */
export type FiscalCost = {
  readonly deficit: number;
  readonly debt: number;
  readonly interest: number;
};

/** A books record as an effect, the only way `fiscalPhase` writes one. */
export function booksEffect(nation: NationId, set: NationBooks): Effect {
  return { kind: "books", nation, set };
}

// --- The week -------------------------------------------------------------------

/** Rates are kept to a thousandth of a basis point, so a government at rest keeps the same books week to week. */
const roundRate = (value: number) => Math.round(value * 1e7) / 1e7 + 0;
const roundStock = (value: number) => Math.round(value * 1000) / 1000;
const roundCents = (value: number) => Math.round(value * 100) / 100;

/** What a week did to one government's books and figures. */
export type BooksWeek = {
  readonly books: AnchoredBooks;
  readonly action?: RatingAction;
  /** What the agencies weighed, where they acted. */
  readonly fundamentals?: RatingFundamentals;
  /** The letter, where the week moved the rating across one. */
  readonly letter?: SovereignRating;
};

/** A review, if one is due this week, and the letter it leaves the government with. */
function reviewed(books: AnchoredBooks, readings: () => RatingFundamentals, turn: number, due: boolean): BooksWeek {
  if (!due) return { books };
  const fundamentals = readings();
  const { state, action } = reviewRating(books.rating, fundamentalScore(books.anchor, fundamentals), turn);
  if (!action) return { books };
  const was = letterOfScore(books.rating.score);
  const now = letterOfScore(state.score);
  return { books: { ...books, rating: state }, action, fundamentals, ...(now === was ? {} : { letter: now }) };
}

export type ForeignWeek = BooksWeek & {
  readonly economy: { readonly gdp: number; readonly gdpPerCapita: number; readonly debt: number };
};

/** The dollar's own rates, which every foreign government's dollar debt is revalued against. */
export type DollarReading = { readonly inflation: number; readonly expectedInflation: number };

/**
 * A foreign government's week: its output grows, its ratio takes the identity,
 * its rate rolls toward what the market charges, and the agencies look at it if
 * this is its week.
 */
export function foreignWeek(campaign: Campaign, runtime: NationRuntime, books: AnchoredBooks, dollar: DollarReading, crisis = NO_CRISIS): ForeignWeek {
  const economy = runtime.stats.economy;
  const nonErodible = nonErodibleShareOf(runtime);
  const macro = macroOf(campaign, runtime);
  const rate = books.rates.effective;
  const balance = foreignPrimaryBalance(campaign, runtime, books, macro);
  const compounding = outputStep(economy.growth);
  const gdp = roundStock(economy.gdp * compounding);
  const aid = Math.max(0, runtime.stats.softPower.aidGiven - books.aidSeen);
  const ratio =
    foreignRatioStep({ ratio: debtToGdp(runtime.stats), rate, growth: economy.growth, inflation: economy.inflation, usInflation: dollar.inflation, nonErodible, primaryBalance: balance.total }) +
    aid / Math.max(1, gdp * economy.costOfLiving);
  const shared = { rate, ratio, usInflation: dollar.expectedInflation, nonErodible };
  const projected = ratioInTenYears({ ...shared, growth: trendGrowth(runtime), inflation: macro.expectedInflation, primaryBalance: balance.structural });
  const market = foreignMarketRate(books.anchor.market, marketMoves(books, macro, projected, crisis), nonErodible);
  const newBorrowing = Math.max(0, rate * ratio - balance.total) / Math.max(0.01, ratio);
  const rolled: AnchoredBooks = {
    ...books,
    ...weekOfHistory(books, crisis, balance.structural, balance.mix, balance.investment, backstopRelief(campaign, runtime.base.id).stress),
    rates: { effective: roundRate(rollForeign(rate, market, newBorrowing, foreignRollover(runtime.base.id))), market: roundRate(market) },
    aidSeen: runtime.stats.softPower.aidGiven,
  };
  const readings = (): RatingFundamentals => ({
    burden: interestBurden({ ...shared, expectedInflation: macro.expectedInflation, revenueShare: revenueShareFor(runtime.base.bands.wealthTier) }),
    projected,
    governance: 0,
    crisis: crisis.notch,
  });
  const week = reviewed(rolled, readings, campaign.turn, reviewDue(runtime.base.id, campaign.turn));
  return {
    ...week,
    economy: { gdp, gdpPerCapita: roundCents(economy.gdpPerCapita * compounding), debt: ratio * gdp * economy.costOfLiving },
  };
}

/** Taxes and spending move a rich government's balance with its cycle more than a poor one's. */
function stabilizerFor(wealthTier: number): number {
  return wealthTier >= 4 ? 0.4 : 0.25;
}

/**
 * A foreign government's primary balance this week, as a share of its output:
 * what holds its ratio at rest, moved by any change in its program since, by
 * its cycle, and by what a war or unrest forces on it. Only the first two are
 * structural.
 */
function foreignPrimaryBalance(campaign: Campaign, runtime: NationRuntime, books: AnchoredBooks, macro: MacroState) {
  const nation = runtime.base.id;
  const program = governmentShift(campaign, nation);
  const structural = books.anchor.primaryBalance + (program.take - program.outlays) - (books.anchor.programBalance ?? 0);
  const gap = Math.log(Math.max(1, runtime.stats.economy.gdp) / Math.max(1, macro.potential));
  const forced = warOutlayShare(campaign, nation) + unrestOutlayShare(campaign, nation);
  const total = structural + stabilizerFor(runtime.base.bands.wealthTier) * gap - forced;
  return { structural, total, mix: mixOfShift(program), investment: program.investment ?? 0 };
}

/** Fiscal stress builds a point a year while a crisis is open and fades a tenth a year after (the IMF's sovereign-risk framework). */
function nextStress(stress: number, crisisOpen: boolean): number {
  const next = crisisOpen ? stress + WEEK_OF_YEAR : stress * 0.9 ** WEEK_OF_YEAR;
  return Math.round(next * 1000) / 1000;
}

/**
 * What a week adds to a government's fiscal history: its stress, the push its
 * budget gives, and where its structural budget now stands. A currency backstop
 * takes some of the week's stress off, the way it takes premium off the rate.
 */
function weekOfHistory(books: AnchoredBooks, crisis: CrisisReading, structural: number, mix: StructuralMix, investment: number, stressRelief = 0) {
  return {
    stress: Math.round(Math.max(0, nextStress(books.stress, crisis.notch > 0) - stressRelief) * 1000) / 1000,
    ...weekOfImpulse(books, mix, investment),
    lastStructuralBalance: Math.round(structural * 1e7) / 1e7 + 0,
  };
}

function marketMoves(books: AnchoredBooks, macro: MacroState, projected: number, crisis: CrisisReading) {
  const { anchor } = books;
  return {
    policyRate: macro.policyRate - anchor.policyRate,
    expectedInflation: macro.expectedInflation - anchor.expectedInflation,
    projected: projected - anchor.projected,
    spread: ratingSpread(books.rating.score) - ratingSpread(anchor.score),
    crisis: crisis.premium,
  };
}

/**
 * Where the market and the agencies put the United States' ratio ten years
 * out. The cycle is taken out of both ends: the stock is read against the
 * output the economy returns to, since a slump's dent in output is gone within
 * the ten years and the borrowing it forced is not; and a law is counted for
 * the years it still has to run, not as if it ran for ever.
 */
function usProjectedRatio(campaign: Campaign, position: UsPosition, week: { readonly debt: number; readonly structural: number }): number {
  const macro = macroOf(campaign, position.runtime);
  const { stats } = position.runtime;
  const potential = Math.max(1, macro.potential) * outputStep(trendGrowth(position.runtime));
  const ratio = debtToGdp({ ...stats, economy: { ...stats.economy, debt: week.debt, gdp: potential } });
  const now = lawShift(campaign);
  const ahead = lawShiftOverTenYears(campaign);
  const laws = ahead.take - ahead.outlays - (now.take - now.outlays);
  const { rates } = position.books;
  return ratioInTenYears({
    ratio,
    rate: usDecadeEffectiveRate(rates.coupons ?? rates.effective, rates.market ?? rates.effective, macro.policyRate),
    growth: trendGrowth(position.runtime),
    inflation: macro.expectedInflation,
    usInflation: macro.expectedInflation,
    nonErodible: position.nonErodible,
    primaryBalance: week.structural + laws,
  });
}

/** What the week the United States just booked leaves its rates, its own added stock and its rating at. */
export type UsWeekInputs = {
  /** The year's balance the week was booked on, nominal. */
  readonly balance: number;
  /** Debt held by the public and real output after the week. */
  readonly debt: number;
  readonly gdp: number;
  /** A notch for a brush with default at the debt limit. */
  readonly governance: number;
  /** An X-date calls the agencies in whatever week it falls. */
  readonly forceReview: boolean;
  readonly crisis?: CrisisReading;
  /** The budget by kind as it was actually paid this week, withheld payments and all. */
  readonly mix: StructuralMix;
  /** Interest's share of revenue on the statement the week was booked on. */
  readonly interestShare: number;
};

export function usBooksWeek(campaign: Campaign, position: UsPosition, week: UsWeekInputs): BooksWeek {
  const macro = macroOf(campaign, position.runtime);
  const { books } = position;
  const crisis = week.crisis ?? NO_CRISIS;
  const { stats } = position.runtime;
  const ratio = debtToGdp({ ...stats, economy: { ...stats.economy, debt: week.debt, gdp: week.gdp } });
  const structural = usStructuralBalance(campaign, position);
  const shared = { ratio, usInflation: macro.expectedInflation, nonErodible: position.nonErodible };
  const projected = usProjectedRatio(campaign, position, { debt: week.debt, structural });
  const market = usCouponMarketRate(books.anchor.market, marketMoves(books, macro, projected, crisis));
  const bills = rollBills(books.rates.bills ?? books.rates.effective, macro.policyRate);
  const coupons = rollCoupons(books.rates.coupons ?? books.rates.effective, market, Math.max(0, -week.balance) / Math.max(1, position.debt));
  const effective = usEffectiveRate(bills, coupons);
  const rolled: AnchoredBooks = {
    ...books,
    ...weekOfHistory(books, crisis, structural, week.mix, programShift(campaign).investment ?? 0, backstopRelief(campaign, position.runtime.base.id).stress),
    rates: { bills: roundRate(bills), coupons: roundRate(coupons), effective: roundRate(effective), market: roundRate(market) },
    choiceDebt: accrueChoiceDebt(books.choiceDebt ?? 0, programBalance(campaign) - (books.anchor.programBalance ?? 0), position.potential),
    aidSeen: position.runtime.stats.softPower.aidGiven,
    trail: weekOfTrail(campaign, position.books, { market, ratio, interestShare: week.interestShare }),
  };
  const revenueShare = usRevenueTotal(campaign, position) / position.output;
  const readings = (): RatingFundamentals => ({
    burden: interestBurden({ ...shared, rate: effective, expectedInflation: macro.expectedInflation, revenueShare }),
    projected,
    governance: week.governance,
    crisis: crisis.notch,
  });
  const due = week.forceReview || reviewDue(position.runtime.base.id, campaign.turn);
  return reviewed(rolled, readings, campaign.turn, due);
}

/**
 * The week's reading added to the trail, and on the week the books were opened
 * the share of revenue interest took then, which every later crossing is
 * measured from.
 */
function weekOfTrail(campaign: Campaign, books: AnchoredBooks, week: { readonly market: number; readonly ratio: number; readonly interestShare: number }): BooksTrail {
  const opening = campaign.turn === books.anchor.openedTurn ? Math.round(week.interestShare * 1e6) / 1e6 : undefined;
  const reading = { turn: campaign.turn + 1, market: roundRate(week.market), debtToGdp: Math.round(week.ratio * 1e6) / 1e6 };
  return extendTrail(books.trail, reading, opening);
}
