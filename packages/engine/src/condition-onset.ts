import { debtToGdp, US_HAZARD_RATE_SERIES, US_SIGNIFICANT_HAZARDS_PER_YEAR, type DisasterKind, type NationId, type NationStats } from "@admin/world";
import { isHomeEventCondition, isIncidentKind, STANDING_CONDITIONS, type StandingCondition } from "./condition-kinds.js";
import { detentionCaptor, HOME_EVENT_SCOPE, homeEventCandidates, homeEventDescription } from "./condition-home-events.js";
import { hazardNoun } from "./condition-impacts.js";
import { selectConflictsInvolving } from "./conflicts.js";
import { NO_CYCLE } from "./business-cycle.js";
import { macroBaseline, restingRuntime } from "./macro-baseline.js";
import {
  selectActiveConditions,
  selectNation,
  type Campaign,
  type ConditionKind,
  type ConditionScope,
  type NationCondition,
  type NationRuntime,
} from "./state.js";
import type { RngStreams } from "./rng.js";
import { seasonWeight } from "./condition-seasons.js";
// The week's own first day. It lives beside the feed cap, which is the other rule
// that has to agree with itself whichever day of the week it is asked on; it
// belongs in clock.ts beside `dayOfWeekInOffice`, and that file has no W4 owner.
import { weekOpenDate } from "./feed-cap.js";
import { placeCaption, placeUsOnset } from "./us-placement.js";
import { nationName, sentenceCase } from "./naming.js";
import { governmentShift } from "./fiscal-impulse.js";
import { legislableDomains, selectPolicyStance, type PolicyDomain } from "./policy.js";
import { booksFor, stationaryPrimaryBalance, trendGrowth, usPosition, usStructuralBalance } from "./national-books.js";
import { nonErodibleShareOf } from "./sovereign.js";
import { weakestCohort } from "./demos.js";
import { stampOf, weigh, type DecisionStamp, type Term } from "./willingness.js";

// Whether a country opens a condition this week, and how prone it is to each.
//
// Split out of conditions.ts, which owns the weekly tick, the attention a
// government pays to a file and the bill a condition charges. This half reads
// the country and decides what opens; that half decides what a running
// condition costs. conditions.ts re-exports what was public here, so an
// importer of the condition system keeps one path.

/** The flag authored content gates on: `condition:<kind>:<nation>`. */
export function conditionFlag(kind: ConditionKind, nation: NationId): string {
  return `condition:${kind}:${nation}`;
}

/**
 * The flag for one city or state: `condition:<kind>:<nation>:<placeId>`.
 *
 * Set beside the nation flag. Ending that place clears this one only.
 */
export function conditionPlaceFlag(kind: ConditionKind, nation: NationId, placeId: string): string {
  return `condition:${kind}:${nation}:${placeId}`;
}

/** City when the draw names one, otherwise the state. A nation-wide condition has none. */
export function conditionPlaceId(place: {
  readonly city?: NationCondition["city"];
  readonly state?: NationCondition["state"];
}): string | undefined {
  return place.city ?? place.state;
}

/** Nation flag, plus the place flag when the condition landed in a city or a state. */
export function conditionFlagsToSet(condition: Pick<NationCondition, "kind" | "nation" | "city" | "state">): readonly string[] {
  const nation = conditionFlag(condition.kind, condition.nation);
  const placeId = conditionPlaceId(condition);
  return placeId ? [nation, conditionPlaceFlag(condition.kind, condition.nation, placeId)] : [nation];
}

/**
 * Place flag always. The nation flag only when no other condition of this
 * kind is still active, so one fire ending does not release a second place.
 */
export function conditionFlagsToClear(campaign: Campaign, condition: NationCondition): readonly string[] {
  const placeId = conditionPlaceId(condition);
  const place = placeId ? [conditionPlaceFlag(condition.kind, condition.nation, placeId)] : [];
  const another = selectActiveConditions(campaign).some(
    (other) => other.id !== condition.id && other.nation === condition.nation && other.kind === condition.kind,
  );
  return another ? place : [...place, conditionFlag(condition.kind, condition.nation)];
}

/**
 * The stored id. With a place in it, two of one kind can be open in one country
 * in the same week; without one it is exactly the id every save already carries,
 * so nothing written before places existed is re-keyed.
 */
export function conditionId(kind: ConditionKind, nation: NationId, turn: number, place?: string): string {
  const base = `condition:${kind}:${nation}:${turn}`;
  return place ? `${base}:${place}` : base;
}

// --- Onset ---

// Authored exposure is a standing likelihood, not a weekly one: a delta state
// with flood exposure 0.3 should flood every few years, not every few weeks.
const DISASTER_ONSET_RATE = 0.012;

/**
 * Which share of the country's billion-dollar disasters is a President's
 * condition.
 *
 * The world's rate is a rate for news: fifty capitals share two slots a week and
 * a foreign disaster is a line in the feed. Home is the subject of the game, so
 * the home queue reads the country's own record instead
 * (`US_SIGNIFICANT_HAZARDS_PER_YEAR`): NOAA's billion-dollar series is about
 * fourteen events a year, each typically several states' declarations. A
 * condition is a higher bar than a billion-dollar event, and this share keeps
 * the costliest four in ten, which with the earthquake and outbreak rates (both
 * already declaration-level, so taken whole) is about six a year. The share is
 * a design value; the mix between kinds is the record's.
 *
 * It scales the home queue only, so what a president has to govern through
 * cannot move what the other fifty countries are living through.
 */
export const HOME_SIGNIFICANT_SHARE = 0.4;

/** The hazards the home queue draws, in kind order. */
const US_HAZARD_KINDS = (Object.keys(US_SIGNIFICANT_HAZARDS_PER_YEAR) as DisasterKind[]).sort();

/**
 * The weekly chance this kind opens at home before its season: the record's
 * annual rate, cut to the significant share where the record is a
 * billion-dollar series, read as a hazard over seven days.
 */
export function homeHazardChance(kind: DisasterKind): number {
  const share = US_HAZARD_RATE_SERIES[kind] === "noaa-billion-dollar" ? HOME_SIGNIFICANT_SHARE : 1;
  return 1 - Math.exp((-US_SIGNIFICANT_HAZARDS_PER_YEAR[kind] * share * 7) / 365);
}

// Unrest is generated by the country's own politics rather than its geography.
const UNREST_ONSET_RATE = 0.05;

// War is felt at home: a country in an active conflict is materially more
// likely to come apart behind the front.
const WAR_UNREST_TERM = 0.06;

// How many conditions may open in one week abroad. The limit is legibility,
// the same reason npc-turn.ts caps how many capitals move: a week in which six
// foreign countries are struck at once reads as noise in the feed.
export const MAX_NEW_CONDITIONS_PER_TURN = 2;

// The country the player governs is not world news and its weather is not the
// world's to ration. It draws separately, so a bad week at home is a fact
// about how the country is being governed rather than about how the other
// fifty capitals happened to roll. One, because a president can be handed a
// new emergency in any given week, but two opening at home in the same week is
// an unreadable week rather than a harder one.
export const MAX_NEW_HOME_CONDITIONS_PER_TURN = 1;


/**
 * How much named pressure an onset needs before it was more than the week's
 * draw.
 *
 * Carried as the stamp's noise bound, so a spell of unrest that opened on a
 * calm country reads `close` — the terms alone would not have settled it — and
 * one that opened on a group the administration has badly hurt does not. A
 * reason that claimed to explain every onset equally would be a reason a player
 * learns to stop reading.
 */
const UNREST_REASON_NOISE = 0.1;

/**
 * Who is angry and what this administration did that angered them, as the
 * reason of record on an unrest onset at home.
 *
 * Two terms and no more, because two are what the country can actually answer
 * for: the group this administration has hurt most relative to the rest of its
 * axis, and the heaviest harm it remembers. Both are read off the cohort layer,
 * which is the same reading the electorate screen prints, so the sentence a
 * player reads here names people the screen was already showing them.
 *
 * Public: a street is not an intelligence read.
 */
export function unrestOnsetReason(campaign: Campaign): DecisionStamp | undefined {
  const weakest = weakestCohort(campaign);
  if (!weakest) return undefined;
  const heaviest = (campaign.cohorts[weakest.cohort] ?? [])
    .filter((strain) => strain.valence === -1)
    .reduce<{ readonly reason: string; readonly weight: number } | undefined>(
      (worst, strain) => (worst === undefined || strain.weight > worst.weight ? strain : worst),
      undefined,
    );
  const terms: Term[] = [
    { key: "most-hurt-cohort", source: "situation", value: round4(Math.max(0, -weakest.displacement)) },
    { key: "driving-act", source: "situation", value: round4(Math.max(0, heaviest?.weight ?? 0)) },
  ];
  // Threshold zero, because the hazard has already fired: the terms explain the
  // onset rather than deciding it, and both are magnitudes of pressure, so the
  // score is never negative and the stamp never claims the street stayed home.
  const willingness = weigh("unrest-onset", terms, { threshold: 0, noiseBound: UNREST_REASON_NOISE, noise: 0 });
  return stampOf(willingness, weakest.name, heaviest?.reason, "public");
}

const round4 = (value: number): number => Math.round(value * 10000) / 10000;

/** The departments a live program in either one answers a street already turning through. */
const UNREST_ANSWERED_BY: readonly PolicyDomain[] = ["civil", "security"];

/**
 * How much discount a fully governed civil-and-security brief buys against the
 * street, on top of whatever the country's own pressure and legitimacy already
 * read.
 *
 * Deliberately smaller than the recovery side's `UNTARGETED_ORDER_ATTENTION`
 * halving (conditions.ts): a prior bracket measurement showed the whole
 * condition channel moves the prudent-vs-passive gap by only 0.002 against a
 * gap of 0.028, so a term sized to match the recovery side would be tuning
 * dressed as a fix rather than the model fix this is.
 */
const UNREST_GOVERNING_DISCOUNT = 0.3;

/**
 * How much of the machinery that would answer a street's grievance is
 * actually running, between 0 and 1 — the onset twin of `programAttention`
 * (conditions.ts). Read directly rather than imported: conditions.ts already
 * imports this module, so the reverse import would cycle.
 *
 * Scoped to the player's own government, the same restriction
 * `conditionAttention` states: every other capital is presumed to be working
 * its own emergencies, so this question is only ever asked of the country the
 * player governs.
 */
function unrestGoverningAttention(campaign: Campaign): number {
  const domains = legislableDomains(campaign).filter((domain) => UNREST_ANSWERED_BY.includes(domain));
  if (domains.length === 0) return 1;
  const live = domains.filter((domain) => !selectPolicyStance(campaign, domain).inherited);
  return live.length / domains.length;
}

/**
 * Onset and recovery used to disagree about whether governing matters:
 * recovery's `conditionAttention` reads `programAttention` and pays a
 * governed department back in a faster recovery, but onset read only the
 * country's own protest pressure and legitimacy — two terms that, for a
 * governing administration, move in offsetting directions and can leave the
 * administration that governs reading a HIGHER onset chance than one that
 * governs passively. `unrestGoverningAttention` closes that: a civil and
 * security brief actually being run buys a discount against the street,
 * home only, on top of the reading everyone still shares.
 */
function unrestChance(campaign: Campaign, nation: NationId, runtime: NationRuntime, atWar: boolean): number {
  const politics = runtime.stats.politics;
  const pressure = politics.protestPressure * 0.6 + (1 - politics.legitimacy) * 0.4;
  const base = UNREST_ONSET_RATE * pressure + (atWar ? WAR_UNREST_TERM * pressure : 0);
  if (nation !== campaign.founding.nation) return base;
  return base * (1 - UNREST_GOVERNING_DISCOUNT * unrestGoverningAttention(campaign));
}

/** Clamped linear 0..1. Below `lo` reads nothing; at or above `hi` reads full. */
export function ramp(value: number, lo: number, hi: number): number {
  if (hi <= lo) return value >= hi ? 1 : 0;
  return clamp01((value - lo) / (hi - lo));
}

/** Where a country's economy sits when nothing is happening to it: its own authored rates. */
function restingEconomy(runtime: NationRuntime) {
  return macroBaseline(restingRuntime(runtime), NO_CYCLE);
}

/**
 * The three standing conditions a rate opens, each read as how far the rate
 * has come from the country's own rest: where the ramp starts reading, and
 * where it reads full.
 *
 * Measured from the country's rest rather than from zero because the rest is
 * now the country's published economy. Argentina rests at the 200% the model
 * reads and South Africa at a third of its workforce out of work; an absolute
 * threshold would hold both in a permanent crisis for being themselves, which
 * is the defect the rule below exists to forbid.
 *
 * The start of each ramp is also where a new condition opens and not where a
 * running one closes (`standingHold`), and the gap between the two is the
 * hysteresis: a price shock opens five points above normal and holds until the
 * country is back at its own normal, so a rate wobbling around the opening
 * line cannot open and close the same crisis week after week. In the United
 * States the openings sit where they always did: a recession half a point of
 * growth under trend, a price shock near 8% inflation, a jobs shock near 8%
 * unemployment.
 */
export const RATE_CONDITIONS = {
  recession: { excess: (n: NationRuntime) => restingEconomy(n).growth - n.stats.economy.growth, opens: 0.005, full: 0.05 },
  "inflation-shock": { excess: (n: NationRuntime) => n.stats.economy.inflation - restingEconomy(n).inflation, opens: 0.05, full: 0.2 },
  "unemployment-shock": {
    excess: (n: NationRuntime) => n.stats.economy.unemployment - restingEconomy(n).unemployment,
    opens: 0.04,
    full: 0.15,
  },
} as const satisfies Partial<
  Record<StandingCondition, { excess: (runtime: NationRuntime) => number; opens: number; full: number }>
>;

type RateCondition = keyof typeof RATE_CONDITIONS;

function isRateCondition(kind: StandingCondition): kind is RateCondition {
  return kind in RATE_CONDITIONS;
}

function rateOnset(kind: RateCondition): (runtime: NationRuntime) => number {
  const row = RATE_CONDITIONS[kind];
  return (n) => ramp(row.excess(n), row.opens, row.full);
}

/**
 * How badly a country is set up for each standing condition, on 0..1.
 *
 * The rule these express, and the reason they are a table of readings rather
 * than a die roll with a country-flavored name: a condition's likelihood is a
 * reading of the country. A healthy economy essentially never opens a
 * recession; one already well under its trend opens one often.
 * `unrestChance` was always written this way — this is that shape generalized
 * to the other six.
 *
 * **Every row has to read zero for a country at rest.** The three rate rows
 * read the distance from the country's own resting economy (`RATE_CONDITIONS`),
 * and housing reads its inflation the same way: a country that rests at high
 * prices is not in a housing crunch for being itself.
 *
 * **Law 8 lives here.** Whatever figure a row reads is a figure that kind's
 * `IMPACTS` row may not write, or the condition becomes a function of itself
 * and can never close. `standingOnsetReads` below states each row's reading in
 * data so a test can enforce the pairing rather than a reviewer remembering it.
 */
export const STANDING_PRESSURE: Readonly<
  Record<Exclude<StandingCondition, "unrest">, (runtime: NationRuntime) => number>
> = {
  // Against the country's own trend, taken at its authored order rather than
  // its live one: a recession lowers `regimeStability`, and reading a trend
  // that moves with it would make the condition a function of itself.
  recession: rateOnset("recession"),
  "inflation-shock": rateOnset("inflation-shock"),
  "unemployment-shock": rateOnset("unemployment-shock"),
  // Market access, read off the country alone: how fragile its letter is and
  // how much of its debt inflation cannot erode, at the structural balance it
  // was found at. The debt level is not a multiplier: Japan at 2.5 of output
  // in its own currency is not more crisis-prone than Argentina at 0.85 in
  // dollars. `fiscalCrisisPressure` adds what only the books know.
  "fiscal-crisis": (n) => fiscalProneness(n, 0),
  // What it imports against what it burns. A country that produces its own
  // energy does not have this condition however much it uses.
  "energy-shortage": (n) =>
    ramp(n.stats.energy.importDependence, 0.35, 0.9) *
    ramp(n.stats.energy.consumption / Math.max(1, n.stats.energy.production), 0.9, 1.4),
  // Shelter is not a dataset field, so this reads the two that stand in for it
  // honestly: how crowded the country is, and how far its prices have run past
  // their own normal.
  "housing-crunch": (n) =>
    ramp(n.stats.demography.urbanization, 0.6, 0.95) *
    ramp(n.stats.economy.inflation - restingEconomy(n).inflation, 0.03, 0.15),
};

/**
 * The stat path each standing row reads, as data.
 *
 * Only here so Law 8 can be enforced by a test instead of by a review habit:
 * the pairing between "what opens this" and "what it may not move" is the one
 * invariant in this file that is invisible at the call site and fatal when
 * broken. See `conditions.test.ts`.
 */
export const STANDING_ONSET_READS: Readonly<Record<StandingCondition, readonly string[]>> = {
  unrest: ["politics.protestPressure", "politics.legitimacy"],
  recession: ["economy.growth"],
  "inflation-shock": ["economy.inflation"],
  "unemployment-shock": ["economy.unemployment"],
  "fiscal-crisis": ["economy.debt", "economy.gdp", "economy.costOfLiving", "economy.sovereignRating"],
  "energy-shortage": ["energy.importDependence", "energy.consumption", "energy.production"],
  "housing-crunch": ["demography.urbanization", "economy.inflation"],
};

/** How much a rating multiplies a debt load's danger. */
const RATING_FRAGILITY: Readonly<Record<NationStats["economy"]["sovereignRating"], number>> = {
  AAA: 0.1,
  AA: 0.2,
  A: 0.35,
  BBB: 0.55,
  BB: 0.75,
  B: 0.9,
  CCC: 1,
  D: 1,
};

/**
 * A standing condition opens at a rate proportional to how badly the country
 * is set up for it, and eases only when that reading eases.
 */
const STANDING_ONSET_RATE = 0.06;

export function standingPressure(runtime: NationRuntime, kind: StandingCondition, atWar: boolean, campaign?: Campaign): number {
  if (kind === "fiscal-crisis" && campaign) return clamp01(fiscalCrisisPressure(campaign, runtime, true));
  if (kind === "unrest") {
    const politics = runtime.stats.politics;
    return clamp01(politics.protestPressure * 0.6 + (1 - politics.legitimacy) * 0.4 + (atWar ? 0.1 : 0));
  }
  return clamp01(STANDING_PRESSURE[kind](runtime));
}

/**
 * How far this country is from its own resting state, on the axis this kind
 * reads — and therefore how much of the condition its own cause still holds up.
 *
 * The distinction between this and `standingPressure` is the difference between
 * how PRONE a country is and whether it is currently IN it, and collapsing the
 * two is what made a standing condition permanent. The floor `severityNext`
 * applies is `pressure × 0.7` against a resolution threshold of 0.08, so any
 * reading that sits at or above 0.114 in the ordinary course of things holds
 * its condition open forever. The median country reads 0.35 on the unrest axis
 * while it is doing nothing at all, so unrest closed for nobody: measured over
 * six disjoint blocks of eight seeds, 0 of 49 spells ever ended, and unrest ran
 * in three quarters of all nation-weeks. That is the weather with a crisis
 * label on it.
 *
 * Measuring the gap instead says the true thing in both directions. A country
 * whose streets are always warm is not in unrest for being itself, and it does
 * not have to become calm to recover — it has to come back to its own normal.
 * A chronically restive state is still likelier to open one, because that is
 * what `standingPressure` is for.
 *
 * A rate condition holds from the country's rest rather than from where it
 * opened (`RATE_CONDITIONS`): it is open until the economy is back to normal.
 */
export function standingHold(runtime: NationRuntime, kind: StandingCondition, atWar: boolean, campaign?: Campaign): number {
  if (kind === "fiscal-crisis") return campaign ? clamp01(fiscalCrisisPressure(campaign, runtime, false) - fiscalProneness(runtime, 0)) : 0;
  if (isRateCondition(kind)) {
    const row = RATE_CONDITIONS[kind];
    return ramp(row.excess(runtime), 0, row.full);
  }
  const live = standingPressure(runtime, kind, atWar);
  const resting = standingPressure(restingRuntime(runtime), kind, false);
  return clamp01(live - resting);
}

// --- Fiscal crisis: market access ------------------------------------------------

/** How far a structural balance can sit below the one that holds its ratio before a market reads it as full danger: four points of output. */
const STABILIZING_GAP_FULL = 0.04;
/** What a history of fiscal stress adds, however sound the books look now. */
const STRESS_WEIGHT = 0.3;

/**
 * How prone a government is to losing market access: the fragility its letter
 * carries, heavier where its debt is written in someone else's money, scaled by
 * how far its structural balance sits below the one that would hold its ratio
 * at the rates it was found paying.
 */
function fiscalProneness(runtime: NationRuntime, stabilizingGap: number): number {
  const nonErodible = nonErodibleShareOf(runtime);
  return (
    RATING_FRAGILITY[runtime.stats.economy.sovereignRating] *
    (0.6 + 0.4 * nonErodible) *
    (0.15 + 0.85 * ramp(stabilizingGap, 0, STABILIZING_GAP_FULL))
  );
}

/**
 * The full reading, books and all. The balance that would hold the ratio is
 * taken at the rate the government was paying when its books opened and at its
 * trend growth, so neither a crisis premium nor the crisis's own slump can hold
 * the crisis open. The hold (`standingHold`) leaves out the stress history,
 * which only raises the odds of a new one, and reads only what the structural
 * gap adds over the letter's own fragility, so a government back at a balance
 * that holds its ratio can come out of the crisis whatever its letter.
 */
export function fiscalCrisisPressure(campaign: Campaign, runtime: NationRuntime, withStress: boolean): number {
  const nation = runtime.base.id;
  const books = booksFor(campaign, runtime);
  const us = campaign.founding.nation;
  const dollar = campaign.macro?.[us]?.expectedInflation ?? runtime.base.stats.economy.inflation;
  const holding = stationaryPrimaryBalance({
    ratio: debtToGdp(runtime.stats),
    rate: books.anchor.rate,
    growth: trendGrowth(runtime),
    inflation: campaign.macro?.[nation]?.expectedInflation ?? runtime.base.stats.economy.inflation,
    usInflation: dollar,
    nonErodible: nonErodibleShareOf(runtime),
  });
  const structural = structuralBalanceOf(campaign, nation, books);
  const proneness = fiscalProneness(runtime, Math.max(0, holding - structural));
  return withStress ? proneness + STRESS_WEIGHT * Math.min(1, books.stress) : proneness;
}

function structuralBalanceOf(campaign: Campaign, nation: NationId, books: ReturnType<typeof booksFor>): number {
  if (nation === campaign.founding.nation) {
    const position = usPosition(campaign);
    return position ? usStructuralBalance(campaign, position) : books.lastStructuralBalance;
  }
  const program = governmentShift(campaign, nation);
  return books.anchor.primaryBalance + (program.take - program.outlays) - (books.anchor.programBalance ?? 0);
}

export type OnsetCandidate = { readonly nation: NationId; readonly kind: ConditionKind; readonly chance: number };

/**
 * Which of the week's fired candidates take its open slots, in the order they
 * open.
 *
 * A candidate fires when its roll falls under its chance. Once it has, its roll
 * over its chance is an even draw on 0..1 whatever that chance was, so taking
 * the lowest of those shares the slots out evenly among everything that fired.
 * A country prone to a condition still opens more of it, because it fires more
 * often; its place in the list buys it nothing. Walking the list in nation
 * order and stopping at the budget gave the slots to the start of the alphabet:
 * with a hundred and ninety-five governments firing against two slots a week,
 * debt crises opened in Andorra, Denmark and Switzerland and never in Lebanon
 * or Venezuela, and the last quarter of the roster was struck by almost
 * nothing at all. Ties are settled by `tiebreak`, which is its own seeded draw
 * keyed on the turn: list order gave every one of them to whichever kind sorts
 * first in the alphabet, which is how a newly added kind can lose a tie it never
 * once wins. A caller that supplies no tie-break keeps list order.
 */
export function claimOnsetSlots<T extends OnsetCandidate>(
  rolled: readonly { readonly candidate: T; readonly roll: number }[],
  budget: number,
  tiebreak?: (candidate: T) => number,
): readonly T[] {
  return rolled
    .map((entry, order) => ({
      ...entry,
      order,
      draw: entry.roll / entry.candidate.chance,
      tie: tiebreak ? tiebreak(entry.candidate) : order,
    }))
    .filter((entry) => entry.roll < entry.candidate.chance)
    .sort((a, b) => a.draw - b.draw || a.tie - b.tie || a.order - b.order)
    .slice(0, Math.max(0, budget))
    .map((entry) => entry.candidate);
}

function standingCandidates(campaign: Campaign, id: NationId, active: ReadonlySet<string>): readonly OnsetCandidate[] {
  const runtime = campaign.nations[id]!;
  const candidates: OnsetCandidate[] = [];
  const atWar = selectConflictsInvolving(campaign, id).length > 0;
  const inSlump = inCycleSlump(campaign, id);
  for (const kind of STANDING_CONDITIONS) {
    // A standing condition is the country's, not a place's: one of a kind is the whole file.
    if (active.has(`${id}:${kind}`)) continue;
    // A recession names the slump the cycle is in; growth under trend
    // outside one is a disaster's or a war's, and already has its own name.
    if (kind === "recession" && !inSlump) continue;
    if (kind === "fiscal-crisis" && id === campaign.founding.nation && !usMarketStrained(campaign, runtime)) continue;
    // Unrest keeps its own rate: it was calibrated against a different
    // question — how likely a street is to turn — and folding it into the
    // economic rate would silently re-tune the one standing condition the
    // game already shipped.
    const chance =
      kind === "unrest"
        ? unrestChance(campaign, id, runtime, atWar)
        : STANDING_ONSET_RATE * standingPressure(runtime, kind, atWar, campaign);
    if (chance <= 0) continue;
    candidates.push({ nation: id, kind, chance });
  }
  return candidates;
}

// Candidates in a fixed order — by nation id, then by kind — so which
// conditions open is a function of the seed and the turn, never of object
// iteration order.
export function onsetCandidates(campaign: Campaign): readonly OnsetCandidate[] {
  const active = new Set(selectActiveConditions(campaign).map((condition) => `${condition.nation}:${condition.kind}`));
  const month = weekOpenDate(campaign).month;
  const candidates: OnsetCandidate[] = [];
  for (const id of (Object.keys(campaign.nations) as NationId[]).sort((a, b) => (a as string).localeCompare(b as string))) {
    const runtime = campaign.nations[id]!;
    const exposure = runtime.base.geo.disasterExposure;
    const home = id === campaign.founding.nation;
    for (const kind of home ? US_HAZARD_KINDS : (Object.keys(exposure) as DisasterKind[]).sort()) {
      // Season scales this weight only. It adds no draw, and the onset streams
      // stay keyed on queue, nation, kind and turn.
      //
      // The month is the WEEK's, not today's. An onset rate is a weekly rate, and
      // this phase runs in the middle of the week when the week is laid out
      // across office days and at its close when it is not — so reading the
      // calendar as it stands puts the two layouts in different months twelve
      // times a year, and the same seed reaches two different campaigns. Reading
      // the week's own first day gives both the same answer, because both are
      // inside the same week.
      const season = seasonWeight(kind, month, runtime.base.geo.lat);
      const chance = home ? homeHazardChance(kind) * season : (exposure[kind] ?? 0) * season * DISASTER_ONSET_RATE;
      // Acute conditions are local. Another of this kind may already be open
      // in a different city or state; the place is drawn later, in
      // openCondition, so this list cannot tell a second event from a duplicate.
      if (chance <= 0) continue;
      candidates.push({ nation: id, kind, chance });
    }
    candidates.push(...standingCandidates(campaign, id, active));
    if (home) candidates.push(...homeEventCandidates(campaign));
  }
  return candidates;
}

/** The United States' notch for AA, the letter under which its market access is a question. */
const US_AA_NOTCH = 19;
/** How far the ten-year has to rise over where the term opened before the auctions read as disorderly. */
const US_MARKET_STRESS_RISE = 0.01;

/**
 * Whether the market has turned on the United States. A reserve-currency issuer
 * rated AA or better, with its auctions clearing where the term opened, does
 * not lose market access from carrying a deficit: its crisis needs the market
 * to move first, through a letter below AA, a stress it has already lived
 * through, the Treasury past its X-date, or a ten-year a point over the oath's.
 */
function usMarketStrained(campaign: Campaign, runtime: NationRuntime): boolean {
  const books = booksFor(campaign, runtime);
  return (
    books.rating.score < US_AA_NOTCH ||
    books.stress > 0 ||
    campaign.debtLimit?.xDateTurn !== undefined ||
    books.rates.market - books.anchor.market >= US_MARKET_STRESS_RISE
  );
}

/** Whether a nation's business cycle stands in a contraction or at its trough this week. */
function inCycleSlump(campaign: Campaign, nation: NationId): boolean {
  const phase = (campaign.cycles[nation] ?? NO_CYCLE).phase;
  return phase === "contraction" || phase === "trough";
}

/**
 * How much country an event covers, from one draw.
 *
 * Two distributions, because the home queue draws many more events than the
 * world's and every one of them bills national approval. Abroad keeps the shape
 * it was calibrated at. At home the mass moves to the city: the honest reading
 * of the declaration record — most of what a president signs is a county or two
 * — and the control that lets the country be struck ten times as often without
 * the cumulative bill rising by the same factor, since `SCOPE_WEIGHT` prices a
 * city at a third of a nation.
 */
const SCOPE_CUTS = {
  abroad: { city: 0.5, region: 0.85 },
  home: { city: 0.78, region: 0.95 },
} as const;

function scopeFor(draw: number, home: boolean): ConditionScope {
  const cuts = home ? SCOPE_CUTS.home : SCOPE_CUTS.abroad;
  if (draw < cuts.city) return "city";
  if (draw < cuts.region) return "region";
  return "nation";
}

/**
 * An active condition of this kind already in the drawn place.
 *
 * The place key is the city, or the state when the draw names no city, or
 * the whole nation when it names neither. No further draw: the place roll
 * already happened.
 */
function conditionAlreadyAt(
  campaign: Campaign,
  candidate: OnsetCandidate,
  place: { readonly city?: NationCondition["city"]; readonly state?: NationCondition["state"] },
): NationCondition | undefined {
  const placeId = conditionPlaceId(place);
  return selectActiveConditions(campaign).find(
    (condition) =>
      condition.nation === candidate.nation &&
      condition.kind === candidate.kind &&
      conditionPlaceId(condition) === placeId,
  );
}

/**
 * Which kinds refuse a scope, whatever the draw says.
 *
 * A debt crisis is a sovereign's and never a city's. An epidemic at home is
 * never a city's either: a disease does not stop at a municipal boundary, and a
 * city-scoped outbreak priced at a third of a national one would be the game
 * saying an epidemic is a local story.
 */
function scopeOverride(kind: ConditionKind): ConditionScope | undefined {
  if (kind === "fiscal-crisis") return "nation";
  if (isHomeEventCondition(kind)) return HOME_EVENT_SCOPE[kind];
  return undefined;
}

/**
 * How bad an onset is, off one draw: a mean of one half like the even draw it
 * replaced, but with the tail a record of disasters has. Half of all onsets
 * read under 0.46 and one in ten over 0.87. NOAA's billion-dollar series has
 * the same shape and a longer tail (the costliest tenth of severe storms cost
 * 2.3 times the median, of hurricanes 16 times), and the rest of that tail is
 * the footprint's, not the severity's: a regional hurricane reaches far more
 * people than a city's tornado.
 */
const SEVERITY_FLOOR = 0.2;
const SEVERITY_TAIL = 5 / 3;

export function onsetSeverity(draw: number): number {
  return clamp01(SEVERITY_FLOOR + (1 - SEVERITY_FLOOR) * Math.pow(clamp01(draw), SEVERITY_TAIL));
}

/** The narrowest scope a kind may hold. A pandemic starts at a region. */
function scopeFloor(kind: ConditionKind, drawn: ConditionScope): ConditionScope {
  if (kind === "pandemic" && drawn === "city") return "region";
  return drawn;
}

export function openCondition(campaign: Campaign, candidate: OnsetCandidate, stream: ReturnType<RngStreams["stream"]>): NationCondition {
  const home = candidate.nation === campaign.founding.nation;
  // The draw is taken whatever the kind, so every other kind's stream stays
  // where it was when a kind stopped honoring it.
  const drawn = scopeFor(stream.next(), home);
  const scope = scopeOverride(candidate.kind) ?? scopeFloor(candidate.kind, drawn);
  const severity = onsetSeverity(stream.next());
  const runtime = selectNation(campaign, candidate.nation);
  const identity = runtime?.base.identity;
  const name = identity ? sentenceCase(nationName(identity)) : (candidate.nation as string);
  const place = placeUsOnset(campaign, candidate.nation, candidate.kind, scope, stream.next());
  // Same three draws either way. A place that already has this kind is the
  // event already running; the caller must not apply a packet for an id that
  // is already active, or the week would bill it twice.
  const occupied = conditionAlreadyAt(campaign, candidate, place);
  if (occupied) return occupied;
  const placeId = conditionPlaceId(place);
  const caption = placeCaption(campaign, place, scope, runtime?.stats.demography.population);
  // The captor is a fourth draw, taken only by the one kind that has one, so
  // every other kind's three draws stay where they were.
  const captor = candidate.kind === "wrongful-detention" ? detentionCaptor(campaign, stream.next()) : undefined;
  return {
    id: conditionId(candidate.kind, candidate.nation, campaign.turn, placeId),
    nation: candidate.nation,
    kind: candidate.kind,
    scope,
    severity,
    startedTurn: campaign.turn,
    status: "active",
    beats: [
      {
        turn: campaign.turn,
        description: isHomeEventCondition(candidate.kind)
          ? homeEventDescription(campaign, candidate.kind, caption, captor)
          : onsetDescription(name, candidate.kind, caption, runtime?.base.geo),
      },
    ],
    // Marked at onset, because the lifetime is what the Desk's own builder reads
    // to decide whether this is a file or an afternoon.
    ...(isIncidentKind(candidate.kind) ? { lifetime: "incident" as const } : {}),
    ...(placeId ? { place: placeId } : {}),
    ...place,
  };
}

// A recession and a run of prices are a national economy's, whatever the
// scope draw: a recession "in one city" is not a thing a country has. The scope
// still prices them (`SCOPE_WEIGHT`), so a narrow one is written as where it
// bites hardest rather than as a recession with a city limit.
const NATIONAL_BY_NATURE: ReadonlySet<ConditionKind> = new Set(["recession", "inflation-shock"]);

function onsetDescription(
  name: string,
  kind: ConditionKind,
  scopePhrase: string,
  geo: { readonly lat: number; readonly lon: number } | undefined,
): string {
  const narrow = NATIONAL_BY_NATURE.has(kind) && /^in /.test(scopePhrase);
  return narrow
    ? `${name} is struck by ${hazardNoun(kind, geo)}, felt hardest ${scopePhrase}.`
    : `${name} is struck by ${hazardNoun(kind, geo)} ${scopePhrase}.`;
}


function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
