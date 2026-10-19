import { debtToGdp, type PlankId } from "@admin/world";
import type { Campaign, NationRuntime } from "./state.js";
import type { LegislativeAct } from "./legislative-acts.js";
import { TURNS_PER_YEAR } from "./pace.js";

// The money half of the catalogue: the stopgaps, the caps, the ceiling and the
// two revenue bills.
//
// Here rather than beside the rest because legislative-acts.ts had reached the
// size a logic file is allowed and the fiscal family is the one clean seam in
// it: these six measures are the only entries whose subject is the books, the
// only ones that read the appropriation clock or the debt, and the only ones a
// change to the fiscal model has any reason to touch. The catalogue still owns
// the order they are offered in — `LEGISLATIVE_ACTS` splices them back into
// their own places — so nothing about what Congress takes up moved with them.
//
// The type comes back the other way as a type-only import, which is erased, so
// the dependency at runtime runs one way: the catalogue reads this file.

/**
 * How long a government has to have been living on stopgaps before the floor
 * gives up on a real budget and writes the year off.
 *
 * Half a year. A full-year continuing resolution is what Congress passes when
 * the appropriations process has failed rather than when a deadline is close,
 * so this is counted from the last budget actually enacted and not from the
 * next date the money runs out — which is also what keeps it off the same
 * week's agenda as the six-week stopgap, whose whole subject is that deadline.
 */
const YEAR_WRITTEN_OFF_TURNS = Math.round(TURNS_PER_YEAR / 2);

/**
 * How many more weeks of government one stopgap buys.
 *
 * Six, because that is the length a real continuing resolution is written at
 * when the point of it is to get past a deadline rather than to fund a year:
 * long enough that passing one is a genuine reprieve, short enough that it
 * comes back around inside a term and the same fight has to be had again.
 */
export const CONTINUING_RESOLUTION_TURNS = 6;

/**
 * How close the money has to be to running out before the floor will look at a
 * stopgap. Congress does not pass a continuing resolution in March for a
 * deadline in September, and a CR permanently on the agenda would crowd out
 * every other measure through `billsOnTheAgenda`.
 */
const STOPGAP_LEAD_TURNS = 2;

/**
 * Whether the government is about to run out of money, or already has.
 *
 * Read off the date alone. A book enacted for the coming year moves
 * `throughTurn` past the window, so a book this close to its end has nothing
 * behind it, whether it is a full year's appropriation or a stopgap. Congress
 * offers the continuing resolution before September 30, not after the
 * government has closed.
 */
function fundingRunningOut(campaign: Campaign): boolean {
  return campaign.turn + STOPGAP_LEAD_TURNS >= campaign.congress.appropriation.throughTurn;
}

/**
 * The country the President governs, for the acts that arise out of its
 * condition.
 *
 * Exported because it moved here with the two revenue bills that read it and
 * the catalogue's own immigration bill reads the same country: one accessor for
 * every predicate that asks what shape the United States is in, rather than two
 * spellings of the same lookup.
 */
export function playerStats(campaign: Campaign): NationRuntime["stats"] | undefined {
  return campaign.nations[campaign.founding.nation]?.stats;
}

/**
 * What Congress will pay for a fiscal bill beyond what it thinks of the
 * President.
 *
 * The money was the one subject the Hill had no opinion of its own about: the
 * deficit could double, the agencies could put the country on negative outlook
 * and the Treasury could be three weeks from the ceiling, and the floor counted
 * a fiscal bill at exactly the appeal the catalogue wrote for it. So a deficit
 * was only ever the President's problem, which is the opposite of how a
 * legislature behaves about money.
 *
 * Three readings, each one a fact a member could be asked about on television:
 * how far the deficit runs past what this country tolerates, whether the rating
 * agencies have moved against it, and how close the Treasury is to the limit.
 * Nothing here is about the administration — a hostile Congress and a friendly
 * one both get more interested in the books as the books get worse.
 */
const TOLERATED_DEFICIT_SHARE = 0.04;
const DEFICIT_APPETITE = 0.8;
const RATING_MOVE_APPETITE = 0.03;
const HEADROOM_APPETITE = 0.05;
const APPETITE_CEILING = 0.12;

/** The weeks of room at which the limit is the only thing the Hill is talking about. */
const CRAMPED_HEADROOM_WEEKS = 13;

export function fiscalAppetite(campaign: Campaign): number {
  // Off the records the books keep rather than recomputed: the week's structural
  // balance and the agencies' outlook are both already written down, and the
  // catalogue is loaded before the modules that would recompute them.
  const books = campaign.books?.[campaign.founding.nation];
  const deficitShare = Math.max(0, -(books?.lastStructuralBalance ?? 0));
  const deficit = DEFICIT_APPETITE * Math.max(0, deficitShare - TOLERATED_DEFICIT_SHARE);
  const moved = books?.rating.outlook === "negative" ? RATING_MOVE_APPETITE : 0;
  const headroomWeeks = campaign.debtLimit?.headroomWeeks ?? TURNS_PER_YEAR;
  const cramped =
    headroomWeeks >= CRAMPED_HEADROOM_WEEKS
      ? 0
      : HEADROOM_APPETITE * (1 - headroomWeeks / CRAMPED_HEADROOM_WEEKS);
  return Math.round(Math.min(APPETITE_CEILING, deficit + moved + cramped) * 1000) / 1000 + 0;
}

/**
 * Whether restraint is what the other side is actually demanding, which is what
 * turns a bare lift into a deal.
 *
 * The same appetite, read as a gate: at half the ceiling the books are the
 * argument of the season and the votes for a clean lift are not there without a
 * cap attached.
 */
function restraintIsTheDemand(campaign: Campaign): boolean {
  return fiscalAppetite(campaign) >= APPETITE_CEILING / 2;
}

/**
 * The fiscal measures, by name rather than in a list, so the catalogue can
 * splice each one back into the place it has always occupied.
 */
export const FISCAL_ACTS = {

  fiscalResponsibility: {
    id: "act-fiscal-responsibility",
    title: "The Fiscal Responsibility Act",
    summary: "Caps discretionary outlays for two years and raises the debt ceiling by exactly as much as that buys.",
    sponsor: "opposition",
    appeal: 0.12,
    // Discretionary caps are the bargain in this measure; the debt-limit
    // provision does not put the whole bargain on the expedited budget route.
    track: "ordinary",
    cost: { stability: -0.03 },
    // The saving is the country's: two years of capped discretionary outlays,
    // booked a week at a time as the caps bind (`LAW_OFFSETS`), and felt in
    // demand through the budget's impulse. It does not hand the President
    // money to spend, which a positive `treasuryOfGdp` here once did: the same
    // money booked twice, as less borrowing and as presidential cash.
    nationEffects: {},
    alignment: { economicLeftRight: 0.3 },
    // "Caps discretionary outlays for two years" — so two years is when the
    // question is open again.
    recurs: TURNS_PER_YEAR * 2,
    arises: (campaign) => {
      const stats = campaign.nations[campaign.founding.nation]?.stats;
      return stats ? debtToGdp(stats) > 0.9 : false;
    },
  },
  continuingResolution: {
    id: "act-continuing-resolution",
    title: "A Continuing Resolution",
    summary:
      "Continues appropriations at the prior year's rate for six weeks. It funds nothing new, decides nothing, and is the only thing standing between the government and a lapse.",
    // Nobody's bill and everybody's: a stopgap is the measure that passes when
    // the two sides have agreed on nothing except that the lights stay on.
    sponsor: "bipartisan",
    // The highest appeal in the catalogue. A member who will not vote for a
    // clean CR is voting to close the government, and most of them will not do
    // that — which is exactly why the ones who would are the story when the
    // count fails.
    appeal: 0.35,
    // A continuing resolution is an appropriation. It needs sixty.
    track: "ordinary",
    cost: {},
    funds: { turns: CONTINUING_RESOLUTION_TURNS },
    nationEffects: {},
    alignment: {},
    urgent: true,
    // A stopgap follows a stopgap. The agenda gate only has to stop the same
    // measure arriving twice in one week; the deadline decides the rest.
    recurs: 1,
    arises: fundingRunningOut,
  },
  fullYearContinuingResolution: {
    id: "act-full-year-continuing-resolution",
    title: "A Full-Year Continuing Resolution",
    summary:
      "Funds the whole year at the prior year's rate. Every agency plans against numbers written for a country that no longer exists, and the appropriations process is conceded for the year.",
    sponsor: "bipartisan",
    // Below the six-week stopgap's, and deliberately: a member who will vote to
    // keep the lights on for a month will not always vote to concede the year.
    appeal: 0.18,
    track: "ordinary",
    // A year of governing on numbers nobody chose. Not a treasury line — it
    // appropriates nothing new, exactly as the six-week stopgap does not.
    cost: { stability: -0.03 },
    funds: { throughFiscalYear: true },
    nationEffects: {},
    alignment: {},
    // Deliberately not urgent. The stopgap owns the deadline; this is what the
    // floor does when the deadline has already been met four times and there is
    // still no budget, so it waits for an ordinary session like everything else.
    recurs: TURNS_PER_YEAR,
    arises: (campaign) =>
      campaign.congress.appropriation.onPriorYear &&
      campaign.turn - campaign.congress.appropriation.enactedTurn >= YEAR_WRITTEN_OFF_TURNS,
  },
  debtLimitIncrease: {
    id: "act-debt-limit-increase",
    committee: "CMTE-FINANCE",
    title: "The Debt Limit Increase Act",
    summary:
      "Raises the ceiling on federal borrowing. The money it lets the Treasury raise is money the country then owes, and every member who votes for it owns the number.",
    // The administration's own bill, and the one it least wants to be seen
    // asking for. A president is the only actor with a reason to spend capital
    // on a vote that buys nothing anyone can point to.
    sponsor: "administration",
    // It reaches the floor only near a default, where it carries like the stopgap.
    appeal: 0.35,
    // The debt limit is named in the budget track's own subject matter.
    track: "reconciliation",
    cost: { standing: -0.03 },
    // It buys headroom, not money. Raising the ceiling appropriates nothing and
    // borrows nothing on the day it passes: it permits the Treasury to keep
    // paying obligations Congress already authorized, and the borrowing that
    // follows is the deficit accruing week by week in `fiscalPhase`. Ten points
    // of output is the order a real increase runs at: about a year and a half
    // of the deficit the President inherits.
    borrowingCeilingOfGdp: 0.1,
    nationEffects: {},
    alignment: {},
    // The ceiling is reached again and the fight is had again, as often as the
    // deficit brings it back. Congress takes it up a quarter before the Treasury
    // runs out of room, and moves it the week it would carry.
    recurs: TURNS_PER_YEAR,
    // The clean lift, and only while a clean lift is what the other side would
    // vote for: once the books themselves are the argument, the bill Congress
    // writes is the deal below and this one is not offered beside it.
    arises: (campaign) =>
      (campaign.debtLimit?.headroomWeeks ?? TURNS_PER_YEAR) <= 13 && !restraintIsTheDemand(campaign),
    urgent: true,
  },
  debtLimitDeal: {
    id: "act-debt-limit-deal",
    title: "The Debt Limit and Spending Restraint Act",
    summary:
      "Raises the ceiling and caps discretionary outlays for two years in the same bill. The other side's price for the votes, written into law beside the borrowing it permits.",
    // Nobody's bill and both sides': a deal is what the two ends of the Capitol
    // produce when neither will pass the other's version alone. The President
    // signs it because the alternative is a default they own.
    sponsor: "bipartisan",
    // Below the bare lift's, and deliberately: a member who will vote to pay the
    // country's bills will not always vote for somebody else's caps to do it.
    appeal: 0.28,
    track: "ordinary",
    // The cap is the price, and the President is the one who paid it: an
    // administration that had to buy its own borrowing with two years of its own
    // appropriations has been beaten in public.
    cost: { standing: -0.05 },
    borrowingCeilingOfGdp: 0.1,
    nationEffects: {},
    alignment: { economicLeftRight: 0.2 },
    recurs: TURNS_PER_YEAR,
    // A deal, not a reflex: it is on the floor when the Treasury is close to the
    // ceiling *and* the country's fiscal position is what the other side is
    // running on — a deficit the agencies have noticed. Where the bare lift
    // would carry on its own, this is the bill Congress writes instead.
    arises: (campaign) => (campaign.debtLimit?.headroomWeeks ?? TURNS_PER_YEAR) <= 13 && restraintIsTheDemand(campaign),
    urgent: true,
  },
  taxReliefAndGrowth: {
    id: "act-tax-relief-and-growth",
    committee: "CMTE-FINANCE",
    title: "The Tax Relief and Growth Act",
    summary:
      "Cuts rates on households and business investment. It is written to grow the economy out of a slump and it is paid for by borrowing until it does.",
    sponsor: "administration",
    appeal: 0.16,
    // Revenue is the budget track's own subject.
    track: "reconciliation",
    cost: {},
    // ~$220B a year of forgone revenue — the country's receipts, not the
    // President's authority. A rate cut does not reduce anyone's power to
    // obligate; it is borrowed, which the summary above says out loud and the
    // books take a year at a time (`LAW_OFFSETS`), its push on demand included.
    nationEffects: {},
    alignment: { economicLeftRight: 0.3 },
    domestic: {
      values: { economicLeftRight: 0.6 },
      magnitude: "moderate",
      signature: "act:tax-relief",
      reason: "A rate cut reads as a statement about who the government is for.",
    },
    // Once a term. A second tax bill inside four years is a rewrite of the
    // first, not another bill.
    recurs: TURNS_PER_YEAR * 4,
    arises: (campaign) => {
      const stats = playerStats(campaign);
      return stats ? stats.economy.growth < 0.015 || stats.economy.unemployment > 0.06 : false;
    },
  },
  taxFairnessAndRevenue: {
    id: "act-tax-fairness-and-revenue",
    committee: "CMTE-FINANCE",
    title: "The Tax Fairness and Revenue Act",
    summary:
      "Closes the deductions and deferrals that let the highest earners and the largest corporations set their own effective rate, and puts the receipts against the deficit.",
    sponsor: "administration",
    appeal: 0.14,
    // Revenue is the budget track's own subject, the same ground the rate cut
    // above stands on.
    track: "reconciliation",
    // The bill a president who ran on making the highest earners pay a share
    // sends up to keep that promise. Without the plank it is somebody else's
    // program, and the administration has no standing to have written it.
    plank: "plank-fair-share" as PlankId,
    cost: {},
    // ~$180B a year of found revenue — the country's receipts, the same book
    // the rate cut above is charged against, moving the opposite direction.
    nationEffects: { "politics.protestPressure": -0.02 },
    alignment: { economicLeftRight: -0.25 },
    domestic: {
      values: { economicLeftRight: -0.6 },
      magnitude: "moderate",
      signature: "act:tax-fairness",
      reason: "Closing a loophole reads as a statement about who the tax code answers to.",
    },
    // Once a term, for the reason its counterpart is: a second revenue bill
    // inside four years rewrites the first rather than standing beside it.
    recurs: TURNS_PER_YEAR * 4,
    // Reachable out of a healthy economy on purpose: the coalition behind
    // closing a loophole is a rising debt line, not a slump — the opposite of
    // the condition the rate cut above needs, so the two bills cannot both be
    // permanently out of reach at once.
    arises: (campaign) => {
      const stats = playerStats(campaign);
      return stats ? debtToGdp(stats) > 0.5 : false;
    },
  },
} satisfies Readonly<Record<string, LegislativeAct>>;

/** Every act in this family, by id, for the readings that are about the money. */
export const FISCAL_ACT_IDS: ReadonlySet<string> = new Set(
  Object.values(FISCAL_ACTS).map((act) => act.id),
);
