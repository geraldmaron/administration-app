import type { Campaign, FundingLapse } from "./state.js";
import type { BudgetAccount } from "./budget.js";

// Whether the money is there, as arithmetic on the appropriation and nothing
// else.
//
// Split from shutdown.ts, which owns the week — the record, the feed, what a
// lapse costs the country — for the reason record-effects.ts was split from
// effects.ts, plus one this file cannot avoid: the executive branch's own turn
// has to know whether it has been funded, and `opinion.ts` reads the branch's
// delivery every week. Anything institutions.ts imports is therefore inside
// opinion's own initialization, and a module reaching turn-loop.js from in
// there closes a cycle that leaves `OPINION_DRIVERS` undefined at import time.
// So the readings live here, where nothing is imported at runtime at all, and
// the phase that needs the calendar lives next door.
//
// The account ceilings and the domestic line's own arithmetic live here for the
// same reason and one more: the executive branch's week has to know what the
// domestic appropriation settles its agencies at, and budget.ts reaches
// institutions.ts transitively. A module graph that let institutions.ts import
// budget.ts would close that cycle. Reading the ceiling and the domestic line
// from here closes nothing, because this file still imports no value.
//
// The budget authority itself — how much of the appropriation the President is
// holding, and whether one more obligation fits inside it — lives here for the
// third instance of the same reason. `opening-position.ts` has to found the
// stock, `fiscal.ts` has to apportion it, and every act that obligates money
// has to ask whether it is there; a constant any of them owned would have to be
// imported by the other two.

/**
 * The share of national income the federal discretionary budget runs at, per
 * year, before a fiscal program moves it.
 *
 * Non-defense and defense discretionary together are a little over five percent
 * of American output. This is the line an administration's own decisions are
 * written inside: everything above it — pensions, interest — is owed rather than
 * decided, which is why the President's authority is a share of *this* and not
 * of the budget.
 */
export const DISCRETIONARY_BASE = 0.052;

/**
 * How much of the year's discretionary appropriation an administration is
 * holding on the day it takes office.
 *
 * A quarter, because that is roughly what an apportionment carries: OMB releases
 * the year's money quarter by quarter, and a president walking in mid-cycle has
 * the current quarter's release and no more. It is deliberately *not* the year:
 * an administration that could obligate a full year of discretionary spending in
 * week one would be back to the wallet this figure replaced.
 */
export const AUTHORITY_CARRY_SHARE = 0.25;

/**
 * The budget authority a campaign founds on, from the appropriation rather than
 * from the size of the economy.
 *
 * Takes GDP rather than a campaign because a founding has no campaign yet — the
 * fiscal stance that could move the discretionary line is the inherited one, and
 * the inherited one moves it by nothing.
 */
export function openingBudgetAuthority(gdp: number): number {
  return Math.round(gdp * DISCRETIONARY_BASE * AUTHORITY_CARRY_SHARE);
}

export type ObligationAvailability = { readonly ok: true } | { readonly ok: false; readonly missing: string };

/** Whether an act is excepted work that continues through a lapse. */
export type ObligationTerms = { readonly excepted?: boolean };

/**
 * Whether the administration may obligate this much money right now.
 *
 * The one gate every unilateral spending path asks, in the President's own
 * words. Two refusals, both statutory and neither a difficulty dial:
 *
 *   - **The appropriation has lapsed.** No officer may obligate money Congress
 *     has not appropriated, so non-excepted work stops. `excepted` is the narrow
 *     exception the Antideficiency Act itself carries — work necessary for the
 *     safety of human life or the protection of property continues, unpaid.
 *   - **The authority is not there.** An obligation in excess of the available
 *     appropriation is void, and the officer who made it is reportable. So the
 *     act is refused rather than the account being overdrawn.
 *
 * `amount` is what the act would obligate, as a positive figure. A refund, a
 * receipt or a saving is not an obligation and is never passed here.
 */
export function obligationAvailability(
  campaign: Campaign,
  amount: number,
  terms: ObligationTerms = {},
): ObligationAvailability {
  if (inShutdown(campaign) && !terms.excepted) {
    return {
      ok: false,
      missing: "an appropriation — they have lapsed, and no officer may obligate money Congress has not appropriated",
    };
  }
  const held = campaign.player.metrics.treasury;
  if (amount > held) {
    return {
      ok: false,
      missing: `budget authority for it: this obligates ${Math.round(amount).toLocaleString("en-US")} against ${Math.round(held).toLocaleString("en-US")} still apportioned`,
    };
  }
  return { ok: true };
}

/**
 * The most any one account may take, as a share of GDP per year.
 *
 * 4% is already a wartime figure for any single instrument — a state at 4% on
 * all five instruments is spending 16% of national income on statecraft alone,
 * which the treasury will not survive for long. The cap exists so the ceiling
 * is a budgetary fact rather than an arbitrary rule: a player who wants to
 * climb faster than this has to raise GDP, which is a different program.
 */
export const ACCOUNT_CAP = 0.04;

/**
 * The ceiling on one account this week: the standing cap, plus whatever an
 * authorizing act has lifted it by while that act runs. Widening the room the
 * appropriators may work in is the whole of what an authorization does — the
 * money still has to be voted inside it.
 */
export function accountCap(campaign: Campaign, account: BudgetAccount): number {
  return round4(
    campaign.capRaises.reduce(
      (cap, raise) => (raise.account === account && campaign.turn < raise.throughTurn ? cap + raise.share : cap),
      ACCOUNT_CAP,
    ),
  );
}

/**
 * The annual GDP share that holds a fully adequate domestic establishment.
 *
 * Non-defense discretionary spending is around three percent of American
 * output, and this is that figure: what it costs to keep the departments that
 * deliver things to people delivering them at the level the branch opens at.
 * Prorated against how adequately the branch is actually funded, so a
 * government that has already let delivery decay is not billed for the
 * establishment it no longer has.
 */
export const DOMESTIC_SUSTAIN_AT_FULL = 0.03;

/**
 * How far a point of GDP appropriated above or below the domestic sustainment
 * line moves the level the executive branch's agencies settle at.
 *
 * This is the whole of the carrier-against-the-safety-net trade. It is a
 * feedback loop rather than a dial — a cheaper establishment is cheaper to
 * hold, so the sustainment line falls with it — and the loop converges, because
 * `DOMESTIC_SUSTAIN_AT_FULL * DOMESTIC_ADEQUACY_GAIN` is well under one. What
 * it converges to is legible: appropriating nothing to the domestic line
 * settles the branch at 0.5, holding it settles at the 0.8 it opens on, and
 * taking it to the account cap settles at 1.
 */
export const DOMESTIC_ADEQUACY_GAIN = 20;

/**
 * How adequately the executive branch is funded right now, as the mean of what
 * its bodies are actually working with.
 *
 * The figure the domestic account is priced against, and the account's own
 * headline reading. There is no nation stat for the delivery side of the
 * state — `institutions` is where it lives — so this is where the domestic
 * line's `accountLevel` honestly comes from.
 */
export function branchBudgetAdequacy(campaign: Campaign): number {
  // Circuit seats have no agency appropriation. They are stored as light
  // institution runtimes only to share the Senate nomination pipeline.
  const bodies = Object.values(campaign.institutions).filter((body) => !body.lowerBenchSeat);
  if (bodies.length === 0) return FUNDED_BUDGET_ADEQUACY;
  return round3(bodies.reduce((total, body) => total + body.budgetAdequacy, 0) / bodies.length);
}

/**
 * The domestic appropriation above or below what holds the branch where it is.
 *
 * Positive builds delivery, negative starves it, and zero is the position a
 * founding opens on — which is what makes doing nothing to this line cost
 * nothing, the same property every other account has.
 */
export function domesticNetShare(campaign: Campaign): number {
  const voted = campaign.player.budget["domestic"] ?? 0;
  const share = Number.isFinite(voted) ? Math.max(0, Math.min(accountCap(campaign, "domestic"), voted)) : 0;
  return round4(share - DOMESTIC_SUSTAIN_AT_FULL * branchBudgetAdequacy(campaign));
}

/** The body that apportions what Congress appropriates. */
export const APPORTIONING_INSTITUTION = "INST-OMB";

/**
 * How much of a domestic RAISE is lost to a badly run apportionment.
 *
 * Half, at an OMB delivering nothing. Money Congress votes does not become
 * capacity at an agency by being voted: it is apportioned, quarter by quarter,
 * by the one executive-office body whose whole mandate is that job. A president
 * who wins a domestic increase and leaves the Director's chair empty gets most
 * of what they asked for and not all of it.
 *
 * Deliberately asymmetric — this scales an increase and never a cut. An
 * appropriation that no longer pays for the establishment starves it whatever
 * OMB does, because a well-run budget office cannot apportion money that was
 * not voted, and letting it soften a cut would have made starving the domestic
 * line free for any administration with a good Director.
 */
export const OMB_APPORTIONMENT_WEIGHT = 0.5;

/**
 * What share of a domestic increase actually reaches an agency's account.
 *
 * Reads the delivery figure already stored on OMB's runtime rather than
 * re-deriving it, and that is a constraint rather than a shortcut: this module
 * imports no value from anywhere, because `institutions.ts` imports it and
 * `opinion.ts` reads the branch every week — a reach from here into
 * institutions.ts closes the cycle this file was split out to avoid. The stored
 * figure is written by the one writer that may write it, on the same turn.
 */
export function apportionmentShare(campaign: Campaign): number {
  const omb = campaign.institutions[APPORTIONING_INSTITUTION];
  if (!omb) return 1;
  return round3(1 - OMB_APPORTIONMENT_WEIGHT * (1 - Math.max(0, Math.min(1, omb.implementationQuality))));
}

/**
 * What an executive body settles at under a domestic line appropriated this far
 * above or below its own sustainment. Taken as a net share rather than off the
 * campaign so the budget room can read the draft under the player's hand.
 *
 * `apportionment` defaults to 1 — a full pass-through — so a caller holding a
 * net share and no campaign reads the arithmetic of the appropriation itself.
 */
export function settledFromNetShare(netShare: number, apportionment = 1): number {
  const gain = netShare * DOMESTIC_ADEQUACY_GAIN * (netShare > 0 ? apportionment : 1);
  return round3(Math.max(LAPSE_BUDGET_FLOOR, Math.min(1, FUNDED_BUDGET_ADEQUACY + gain)));
}

/**
 * What an executive body's budget adequacy settles at under the standing
 * domestic appropriation, before its own insulation is taken into account.
 */
export function settledBudgetAdequacy(campaign: Campaign): number {
  return settledFromNetShare(domesticNetShare(campaign), apportionmentShare(campaign));
}

/**
 * How many weeks past the deadline before the lapse begins.
 *
 * Not zero. The money running out and the government closing are days apart in
 * practice: agencies carry obligated balances, a weekend intervenes, and the
 * floor almost always moves something in the last hours. Two weeks is the room
 * Congress has to pass a stopgap after the deadline has already passed, and it
 * is what makes the shutdown the consequence of a failed vote rather than of a
 * calendar the player never saw.
 */
export const SHUTDOWN_GRACE_TURNS = 2;

/**
 * How far a week of the lapse drives an agency's budget adequacy down, and how
 * fast it comes back once the money does.
 *
 * This is the whole of the delivery collapse, and it runs through the dial the
 * institutions already carry rather than through a multiplier bolted onto
 * `deriveImplementationQuality`: a body whose money did not arrive is a body
 * with an inadequate budget, which is a sentence the office dossier could
 * already say and had never had a reason to.
 */
export const LAPSE_BUDGET_DROP = 0.12;
export const LAPSE_BUDGET_FLOOR = 0.2;
export const LAPSE_BUDGET_RECOVERY = 0.06;

/** What a funded agency's budget adequacy settles back to. */
export const FUNDED_BUDGET_ADEQUACY = 0.8;

/**
 * How much of the lapse an insulated body actually feels.
 *
 * The same halving `deriveImplementationQuality` gives independence in both
 * directions, and for the same reason: a body with its own funding stream, its
 * own board and a fixed term is the kind of body that keeps working through a
 * shutdown. It is not immune — the appropriated half of it stops like
 * everything else.
 */
export const INSULATED_SHARE = 0.5;

/** Weeks the government has been past its own deadline, funded by nothing. */
export function unfundedTurns(campaign: Campaign): number {
  return Math.max(0, campaign.turn - campaign.congress.appropriation.throughTurn);
}

/**
 * Whether the government is closed right now.
 *
 * Derived, never stored. The stopgap moves `throughTurn` and this goes false
 * the same instant, which is what "ends the hour a continuing resolution
 * passes" has to mean if it is to be true on every surface at once.
 */
export function inShutdown(campaign: Campaign): boolean {
  return unfundedTurns(campaign) > SHUTDOWN_GRACE_TURNS;
}

/** The lapse still running, if there is one. */
export function openLapse(campaign: Campaign): FundingLapse | undefined {
  return campaign.lapses.find((lapse) => lapse.endedTurn === undefined);
}

/**
 * What one week of the lapse does to an agency's money, and what one week of
 * being funded gives back.
 *
 * Exported so `institutionTick` can apply it and the tests can assert on it
 * without going through a turn: the institutions own the dial, this file owns
 * the rule for moving it.
 *
 * `settled` is where the standing domestic appropriation puts this body, and
 * defaults to the level the branch opens on so a caller that has no
 * appropriation to hand — a fixture, a projection of a single body — reads the
 * founding behavior unchanged.
 *
 * Money arriving on time never lowers a body: an agency sitting above a settled
 * level that is at or above the funded default is left where it is. What does
 * lower it is an appropriation that no longer pays for it, and that is the only
 * case this walks downward.
 */
export function lapsedBudgetAdequacy(
  current: number,
  insulated: boolean,
  lapsed: boolean,
  settled: number = FUNDED_BUDGET_ADEQUACY,
): number {
  if (!lapsed) {
    // An insulated body rides a starved appropriation at half, the same share
    // of the pain it takes from a lapse and for the same reason.
    const target =
      settled < FUNDED_BUDGET_ADEQUACY
        ? FUNDED_BUDGET_ADEQUACY + (settled - FUNDED_BUDGET_ADEQUACY) * (insulated ? INSULATED_SHARE : 1)
        : settled;
    if (current > target) {
      return target < FUNDED_BUDGET_ADEQUACY ? round3(Math.max(target, current - LAPSE_BUDGET_RECOVERY)) : current;
    }
    return round3(Math.min(target, current + LAPSE_BUDGET_RECOVERY));
  }
  const drop = LAPSE_BUDGET_DROP * (insulated ? INSULATED_SHARE : 1);
  const floor = LAPSE_BUDGET_FLOOR + (FUNDED_BUDGET_ADEQUACY - LAPSE_BUDGET_FLOOR) * (insulated ? INSULATED_SHARE : 0);
  return round3(Math.max(floor, current - drop));
}

const round3 = (value: number) => Math.round(value * 1000) / 1000 + 0;
const round4 = (value: number) => Math.round(value * 10_000) / 10_000 + 0;
