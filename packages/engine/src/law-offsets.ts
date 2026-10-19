import { TURNS_PER_YEAR } from "./pace.js";
import { NO_RESTING_OFFSET, RESTING_POINT_PATHS, type ProgramRestingOffset, type RestingPointPath } from "./policy-stats.js";
import { selectCurrentLaws, selectLaws, type Bill, type BillEnactment, type Campaign } from "./state.js";
import { constructionAuthorityAvailable } from "./military-construction.js";

// What an enacted law does to the national books each year it runs, keyed by
// the act that carries it. A law's price is paid over its span through the
// statement, not in one lump the week it is signed: a tax cut that forgoes a
// year of revenue forgoes it every year it is law, and a cap on outlays saves
// only while it binds.

/**
 * Shares of output a year, over `years` from enactment: revenue raised
 * (positive), outlays added (positive), the part of those outlays on the
 * discretionary line, which the President's own authority is a share of, and
 * the part paid to households as transfers. A law with no span runs until it is
 * repealed.
 *
 * `rest` is what the law does to the economy's supply side over the same span,
 * as a move in each rate's resting point: the capital or the workers it adds.
 * Its push on demand is not here; that reaches the economy through the outlays,
 * by way of the fiscal impulse, and counting it twice would be the same dollar
 * spent twice.
 */
export type LawOffset = {
  readonly revenue?: number;
  readonly outlays?: number;
  readonly discretionary?: number;
  readonly transfers?: number;
  /** The part of the outlays that builds something, which reaches demand only as it is spent out. */
  readonly investment?: number;
  readonly years?: number;
  readonly rest?: Partial<Record<RestingPointPath, number>>;
};

export const LAW_OFFSETS: Readonly<Record<string, LawOffset>> = {
  // Fictional domestic packages: simulation parameters, not scored real bills.
  // Money is annual and charged here only; no up-front authority debit.
  "act-military-facilities-appropriation": { outlays: 0.00015, discretionary: 0.00015, investment: 0.00015, years: 1 },

  "act-health-coverage": { outlays: 0.003, transfers: 0.0025, years: 4 },
  "act-rural-care": { outlays: 0.0005, discretionary: 0.0005, years: 4 },
  "act-equal-protection": { outlays: 0.0001, discretionary: 0.0001 },
  "act-voting-access": { outlays: 0.00015, discretionary: 0.00015 },
  "act-police-accountability": { outlays: 0.00015, discretionary: 0.00015 },
  "act-sentencing-reentry": { outlays: 0.0001, discretionary: 0.0001 },
  "act-housing-supply": { outlays: 0.0015, discretionary: 0.0015, investment: 0.001, years: 4, rest: { "economy.growth": 0.0001 } },
  "act-apprenticeships": { outlays: 0.0007, discretionary: 0.0007, years: 4, rest: { "economy.unemployment": -0.001 } },
  "act-paid-leave": { outlays: 0.003, transfers: 0.0028, revenue: 0.002 },
  "act-small-business-credit": { outlays: 0.0003, revenue: -0.0007, years: 2 },
  "act-clean-grid": { outlays: 0.002, discretionary: 0.002, investment: 0.0018, years: 5, rest: { "economy.growth": 0.0001 } },
  "act-energy-permitting": { outlays: 0.00008, discretionary: 0.00008 },
  "act-data-privacy": { outlays: 0.00008, discretionary: 0.00008 },
  "act-public-integrity": { outlays: 0.0001, discretionary: 0.0001 },
  "act-disaster-recovery": { outlays: 0.002, discretionary: 0.002, investment: 0.0015, years: 2 },
  "act-unemployment-extension": { outlays: 0.002, transfers: 0.0019, years: 1 },
  "act-veterans-transition": { outlays: 0.0008, discretionary: 0.0008, years: 4 },
  "act-border-adjudication": { outlays: 0.0004, discretionary: 0.0004, years: 4 },
  // Caps on the discretionary line for the two years they bind: about half a
  // point of output a year held back from what the appropriators would have
  // written. The caps come out of the President's appropriation too.
  "act-fiscal-responsibility": { outlays: -0.005, discretionary: -0.005, years: 2 },
  // The cap the other side charged for the ceiling. Two years, on the same line
  // and at the same order as the Fiscal Responsibility Act's: the same
  // instrument, attached to a lift instead of standing alone.
  "act-debt-limit-deal": { outlays: -0.005, discretionary: -0.005, years: 2 },
  // About $220 billion a year of receipts forgone, for the term the cut is
  // written for; a second bill renews it rather than doubling it.
  "act-tax-relief-and-growth": { revenue: -0.008, years: 4 },
  // About $180 billion a year of receipts found, on the same terms.
  "act-tax-fairness-and-revenue": { revenue: 0.0065, years: 4 },
  // About $110 billion a year of new money for roads, grid and rail, the new
  // spending of a five-year bill the size of the 2021 law, spent through the
  // states on the discretionary line. What the capital adds to supply: federal
  // physical investment returns about 5% a year (CBO, The Macroeconomic and
  // Budgetary Effects of Federal Investment, 2016), so 0.4% of output invested
  // each year raises output growth by about two hundredths of a point while it
  // is being built.
  "act-infrastructure-investment": {
    outlays: 0.004,
    discretionary: 0.004,
    investment: 0.004,
    years: 5,
    rest: { "economy.growth": 0.0002 },
  },
  // Legal status and a larger working-age population: real output 3.3% above
  // the baseline after ten years (CBO, The Economic Impact of S. 744, June
  // 2013), about a third of a point of growth a year for the decade.
  "act-immigration-reform": { years: 10, rest: { "economy.growth": 0.003 } },
};

/** The narrower text changes continuing fiscal flows as well as the policy readout. */
const TARGETED_OFFSETS: Readonly<Record<string, LawOffset>> = {
  "act-housing-supply": { outlays: 0.0008, discretionary: 0.0008, investment: 0.0005, years: 4, rest: { "economy.growth": 0.00005 } },
  "act-health-coverage": { outlays: 0.0015, transfers: 0.0012, years: 4 },
  "act-clean-grid": { outlays: 0.0011, discretionary: 0.0011, investment: 0.0009, years: 5, rest: { "economy.growth": 0.00005 } },
};

/** The enrolled provision controls every continuing flow; an old bill without text keeps the original. */
export function lawOffsetForBill(bill: Bill): LawOffset | undefined {
  if (bill.revises?.kind === "repeal") return undefined;
  if (bill.revises?.kind === "replacement") return TARGETED_OFFSETS["act-housing-supply"];
  if (bill.revises?.kind === "renewal") return bill.revises.provision === "targeted"
    ? TARGETED_OFFSETS["act-housing-supply"] : LAW_OFFSETS["act-housing-supply"];
  return bill.text?.enrolled === "targeted" ? TARGETED_OFFSETS[bill.act] : LAW_OFFSETS[bill.act];
}

/** Current books use cash paid; the ten-year view uses unpaid and still-authorized balances. */
function pricedOffset(campaign: Campaign, bill: Bill, projection = false): LawOffset | undefined {
  const offset = lawOffsetForBill(bill);
  if (offset && bill.act === "act-disaster-recovery" && bill.recoveryAuthority) {
    const gdp = campaign.nations[campaign.founding.nation]?.stats.economy.gdp ?? 0;
    const annual = bill.recoveryAuthority.appropriated / (offset.years ?? 2);
    const share = gdp > 0 ? annual / gdp : 0;
    // The enacted nominal ceiling pays over its original span. Later GDP growth
    // cannot enlarge either this week's books or a forward projection.
    return { ...offset, outlays: share, discretionary: share,
      investment: share * ((offset.investment ?? 0) / (offset.outlays ?? 1)) };
  }
  if (!offset || bill.act !== "act-military-facilities-appropriation") return offset;
  const stillAuthorized = selectCurrentLaws(campaign).some((entry) => entry.id === bill.id);
  const total = (campaign.militaryConstructionProjects ?? []).filter((project) => project.appropriationBill === bill.id)
    .reduce((sum, project) => {
      if (!projection) return sum + (project.lastWorkTurn !== undefined
        && campaign.turn - project.lastWorkTurn <= 1 ? project.lastCashOutlay ?? 0 : 0) * TURNS_PER_YEAR;
      const sourceRemaining = Math.max(0, (stillAuthorized && project.status === "active" ? project.appropriated : project.obligated)
        - (project.sourceSpent ?? 0));
      const redirectedDue = Math.max(0, (project.redirectedObligated ?? 0) - (project.redirectedSpent ?? 0));
      const order = campaign.orders.find((record) => record.subject?.kind === "construction"
        && record.subject.sourceId === project.id);
      const futureRedirect = stillAuthorized && order && constructionAuthorityAvailable(campaign, order)
        ? Math.max(0, (project.redirected ?? 0) - (project.redirectedObligated ?? 0)) : 0;
      return sum + sourceRemaining + redirectedDue + futureRedirect;
    }, 0);
  const gdp = campaign.nations[campaign.founding.nation]?.stats.economy.gdp ?? 0;
  const share = gdp > 0 ? total / gdp / (projection ? PROJECTION_YEARS : 1) : 0;
  // The project's cash is already a purchase; the generic investment field would spend it out again.
  return { ...offset, outlays: share, discretionary: share, investment: 0, years: undefined };
}

/** Price an offered provision before it has been enrolled. */
export function lawOffsetForText(actId: string, text: "base" | "targeted"): LawOffset | undefined {
  return text === "targeted" ? TARGETED_OFFSETS[actId] : LAW_OFFSETS[actId];
}

/** Compatibility reader for the established housing comparison. */
export function housingLawOffset(text: "base" | "targeted"): LawOffset {
  return lawOffsetForText("act-housing-supply", text)!;
}

/**
 * `cap` is the part of `discretionary` that is a cap rather than a program: the
 * cut the caps in force hold the line to, as a positive share. It is inside
 * `discretionary` too, so a reader that only adds the lines up needs nothing new.
 */
export type LawShift = {
  readonly take: number;
  readonly outlays: number;
  readonly discretionary: number;
  readonly transfers: number;
  readonly investment: number;
  readonly cap: number;
};

/** How a law became law; a law with no record of it is read as the President's signature. */
export function billEnactment(bill: Bill): BillEnactment {
  return bill.enactedBy ?? "signed";
}

/** Each law in force, weighed by the share of its offset that still counts; a weight of 0 leaves it out. */
function sumOffsets(
  campaign: Campaign,
  weigh: (offset: LawOffset, yearsIn: number) => number,
  counts: (bill: Bill) => boolean = () => true,
  projection = false,
): LawShift {
  let take = 0;
  let outlays = 0;
  let discretionary = 0;
  let transfers = 0;
  let investment = 0;
  let cap = 0;
  const current = selectCurrentLaws(campaign);
  const construction = selectLaws(campaign).filter((bill) => bill.act === "act-military-facilities-appropriation"
    && !current.some((entry) => entry.id === bill.id));
  for (const bill of [...current, ...construction]) {
    const offset = pricedOffset(campaign, bill, projection);
    if (!offset || !counts(bill)) continue;
    const share = weigh(offset, (campaign.turn - (bill.resolvedTurn ?? bill.introducedTurn)) / TURNS_PER_YEAR);
    if (share === 0) continue;
    take += (offset.revenue ?? 0) * share;
    outlays += (offset.outlays ?? 0) * share;
    discretionary += (offset.discretionary ?? 0) * share;
    transfers += (offset.transfers ?? 0) * share;
    investment += (offset.investment ?? 0) * share;
    cap += Math.max(0, -(offset.discretionary ?? 0)) * share;
  }
  return { take, outlays, discretionary, transfers, investment, cap };
}

const inForce = (offset: LawOffset, yearsIn: number) => offset.years === undefined || yearsIn < offset.years;

/** What the laws in force this week add to the take and the outlays, as shares of output a year. */
export function lawShift(campaign: Campaign): LawShift {
  return sumOffsets(campaign, (offset, yearsIn) => (inForce(offset, yearsIn) ? 1 : 0));
}

/** The same shift, split by whose act the law was: the ones the President signed, or the rest. */
export function lawShiftBySigning(campaign: Campaign): { readonly signed: LawShift; readonly unsigned: LawShift } {
  const weigh = (offset: LawOffset, yearsIn: number) => (inForce(offset, yearsIn) ? 1 : 0);
  const signed = (bill: Bill) => billEnactment(bill) === "signed";
  return { signed: sumOffsets(campaign, weigh, signed), unsigned: sumOffsets(campaign, weigh, (bill) => !signed(bill)) };
}

/** The ten years a projection of the debt looks across. */
const PROJECTION_YEARS = 10;

/**
 * What the laws in force add to the take and the outlays on average over the
 * next ten years, as the law stands: a law written for four years is counted
 * for the years it has left and no longer, the way a current-law projection
 * scores a provision that expires. A law with no span runs the whole ten.
 */
export function lawShiftOverTenYears(campaign: Campaign): LawShift {
  return sumOffsets(campaign, (offset, yearsIn) => {
    const left = offset.years === undefined ? PROJECTION_YEARS : offset.years - yearsIn;
    return Math.min(PROJECTION_YEARS, Math.max(0, left)) / PROJECTION_YEARS;
  }, () => true, true);
}

/**
 * What the laws in force move each rate's resting point by, on top of the
 * standing program, for as long as each is written for.
 *
 * The program is what an administration says it stands for; a law is what it
 * got through, and the two are different facts about the same economy. A law
 * delivered as a one-week push on a rate `macro.ts` reverts faded within a
 * season whatever its span said, so a decade of capital read as a quarter of
 * stimulus. As a resting offset it holds for the span and stops with it, and
 * `macro.ts` stays the one writer of the rate.
 */
export function lawRestingOffset(campaign: Campaign): ProgramRestingOffset {
  const offset: { -readonly [K in RestingPointPath]: number } = { ...NO_RESTING_OFFSET };
  for (const bill of selectCurrentLaws(campaign)) {
    const law = lawOffsetForBill(bill);
    if (!law?.rest || !inForce(law, (campaign.turn - (bill.resolvedTurn ?? bill.introducedTurn)) / TURNS_PER_YEAR)) continue;
    for (const path of RESTING_POINT_PATHS) offset[path] += law.rest[path] ?? 0;
  }
  return offset;
}
