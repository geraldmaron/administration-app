import type { PersonId, RoleId } from "@admin/world";
import { selectCabinet, selectPerson, type Campaign } from "./state.js";
import { INSTITUTION_CATALOG, selectExecutiveCapacity } from "./institutions.js";
import { selectLiveMeasures } from "./trade.js";
import { treasuryHealth } from "./metrics.js";
import { selectSecretaryPairs, tieReading } from "./cabinet-alignment.js";

// Endogenous fragility: why a mistake made by a deteriorating administration
// costs more than the same mistake made by a healthy one.
//
// The balance harness has said for a long time that a reckless presidency
// cannot be lost. The reason is not that the punishments are too small; it is
// that **nothing compounds**. A bad administration was only ever charged the
// flat per-act price of each act, so twenty bad decisions cost twenty times
// one bad decision and never more. Real governments do not fail that way. They
// fail because the second crisis arrives at a government the first one already
// hollowed out.
//
// The hard constraint on how this is built comes from the mission itself:
// **no hidden dynamic difficulty, and no unexplained global multiplier.**
// So every term below is a reading of state the player can see and move, the
// composite names which terms are carrying it, and recovery is symmetric with
// decline. A player who asks "why did that hurt so much" always has an answer
// with a subject in it.

export type FragilityTermKey =
  | "institutionalTrust"
  | "politicalCapital"
  | "agencyCapacity"
  | "cabinetCohesion"
  | "crisisLoad"
  | "fiscalSpace"
  | "marketCredibility"
  | "allianceConfidence"
  | "bureaucraticMorale"
  | "congressionalSupport";

/**
 * Each term is read as *health*, 0..1, where 1 is healthy. Fragility is what
 * is left over. Reading them all the same way round is deliberate: a mixed
 * convention is how a sign error becomes a difficulty setting nobody can find.
 */
export type FragilityReading = {
  readonly terms: Readonly<Record<FragilityTermKey, number>>;
  /** 0..1. How much worse than a healthy government this one absorbs a shock. */
  readonly fragility: number;
  /**
   * What a mistake actually costs, as a multiple of its flat price. Always at
   * least 1: fragility can make a mistake worse and can never make one free.
   */
  readonly amplification: number;
  /** The terms actually carrying the fragility, worst first. Never empty when fragility is nonzero. */
  readonly drivers: readonly FragilityDriver[];
};

export type FragilityDriver = {
  readonly term: FragilityTermKey;
  /** 0..1 health. */
  readonly reading: number;
  /** How much of the composite this term is responsible for. */
  readonly contribution: number;
  /** What the player would do about it. */
  readonly remedy: string;
};

// Weights sum to 1. The three largest are the three that a president actually
// governs through — the executive branch's capacity to act, the Hill's
// willingness to let them, and the public standing that buys both.
export const FRAGILITY_WEIGHTS: Readonly<Record<FragilityTermKey, number>> = {
  agencyCapacity: 0.16,
  congressionalSupport: 0.14,
  politicalCapital: 0.13,
  institutionalTrust: 0.11,
  cabinetCohesion: 0.1,
  fiscalSpace: 0.1,
  crisisLoad: 0.09,
  marketCredibility: 0.07,
  bureaucraticMorale: 0.06,
  allianceConfidence: 0.04,
};

const REMEDIES: Readonly<Record<FragilityTermKey, string>> = {
  agencyCapacity: "Fill the empty chairs and fund the agencies that execute.",
  congressionalSupport: "Spend time on the Hill rather than around it.",
  politicalCapital: "Win something the public can see.",
  institutionalTrust: "Stop bending institutions to the administration's politics.",
  cabinetCohesion: "Win back the Secretaries who have stopped being loyal, or replace one side of a feud.",
  fiscalSpace: "Rebuild the reserve before the next thing that needs paying for.",
  crisisLoad: "Close out a running crisis before opening another.",
  marketCredibility: "Give markets a reason to believe the next commitment.",
  bureaucraticMorale: "Give the career service a leadership that takes it seriously.",
  allianceConfidence: "Repair the relationships that were spent.",
};

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * A cabinet that has stopped backing the President cannot execute a hard
 * decision, whoever signs it: the mean loyalty of the living secretaries in
 * the President's own chairs.
 *
 * The cabinet and nobody else. Reading every seated person averaged in the
 * governors, the Hill's leaders, the committee chairs, the agency heads and the
 * Court, about a hundred people who do not sit at the table, so a Secretary
 * walking out moved it by a rounding error. The President's own chair is not
 * counted: they cannot be disloyal to themselves. With no secretary seated
 * there is nobody left to disagree, and the empty chairs are agency capacity's
 * to price, so the term reads whole rather than naming a revolt that is not there.
 */
function cabinetLoyalty(campaign: Campaign): number {
  const holders = (Object.entries(selectCabinet(campaign)) as [RoleId, PersonId][])
    .filter(([role]) => role !== campaign.founding.leadRole)
    .flatMap(([, id]) => {
      const person = selectPerson(campaign, id);
      return person && person.alive ? [person] : [];
    });
  if (holders.length === 0) return 1;
  return clamp01(holders.reduce((sum, person) => sum + person.base.loyalty, 0) / holders.length);
}

/** How split the room is: the seated Secretaries' pairs, and how many of them are opposed. */
export type CabinetSplit = {
  readonly pairs: number;
  readonly opposedPairs: number;
  /** 0..1, or the typical founded cabinet's share where there is no pair to read. */
  readonly opposedShare: number;
};

/**
 * The share of Secretary pairs a typical founded cabinet opens with opposed:
 * the median over the balance seeds for all three parties, rounded to four
 * places. A party President's cabinet founds a little under it (about 0.05),
 * an independent's cross-party cabinet well over it (about 0.26), so a party
 * cabinet reads close to its loyalty and an independent's starts a few points
 * less united, which is what seating both parties at one table costs. Pinned
 * by a test that recomputes it, so a change to how ties read moves it in the
 * open.
 */
// Measured over the 35 of 36 balance boards with actual Secretary pairs.
// An empty cabinet uses this fallback and must not estimate its own center.
// The wider tie normalization and actual confirmed membership move the median.
export const OPPOSED_SHARE_CENTER = 0.0708;

/**
 * How much a split room costs the cohesion reading, per unit of opposed share
 * off the typical cabinet's. A room where every pair is opposed reads a
 * quarter lower than its loyalty alone would say.
 */
const SPLIT_WEIGHT = 0.25;

export function selectCabinetSplit(campaign: Campaign): CabinetSplit {
  const ties = selectSecretaryPairs(campaign);
  const opposedPairs = ties.filter((tie) => tieReading(tie.standing) === "opposed").length;
  const opposedShare = ties.length === 0 ? OPPOSED_SHARE_CENTER : opposedPairs / ties.length;
  return { pairs: ties.length, opposedPairs, opposedShare };
}

/**
 * Loyalty to the President, less what the room's feuds cost it. Secretaries
 * who cannot sit in a room together carry out a hard decision worse than the
 * same people who can, however loyal each of them is to the President.
 */
function cabinetLoyaltyAndSplit(campaign: Campaign): number {
  const split = selectCabinetSplit(campaign);
  return clamp01(cabinetLoyalty(campaign) - SPLIT_WEIGHT * (split.opposedShare - OPPOSED_SHARE_CENTER));
}

/**
 * Every term, read off live state.
 *
 * Nothing here is stored, and nothing is a dial. If a reading is low there is
 * a fact behind it that the player can go and look at, which is the whole
 * difference between this and a difficulty curve.
 */
export function fragilityTerms(campaign: Campaign): Readonly<Record<FragilityTermKey, number>> {
  const metrics = campaign.player.metrics;

  // The executive branch's own ability to carry out what it is told to do.
  const agencyCapacity = clamp01(selectExecutiveCapacity(campaign));

  // How far the administration has bent bodies toward its politics rather than
  // their mandate, weighted by how much of the branch it has bent.
  let politicized = 0;
  let integrity = 0;
  let morale = 0;
  let counted = 0;
  for (const def of INSTITUTION_CATALOG) {
    const runtime = campaign.institutions[def.id];
    if (!runtime) continue;
    politicized += runtime.politicization * def.staffScale;
    integrity += runtime.integrity * def.staffScale;
    morale += runtime.morale * def.staffScale;
    counted += def.staffScale;
  }
  const institutionalTrust =
    counted === 0 ? 0.7 : clamp01((integrity / counted) * (1 - politicized / counted));
  const bureaucraticMorale = counted === 0 ? 0.6 : clamp01(morale / counted);

  // What the president can still spend. Standing is the stock; approval is
  // whether it is being replenished.
  const politicalCapital = clamp01(metrics.standing * 0.6 + metrics.approval * 0.4);

  const cabinetCohesion = cabinetLoyaltyAndSplit(campaign);

  // How much is already running. A government handling three emergencies has
  // no bench for the fourth, and that is a fact about the government rather
  // than a penalty on the player.
  const running =
    Object.values(campaign.conditions).filter(
      (condition) => condition.status === "active" && condition.nation === campaign.founding.nation,
    ).length +
    Object.values(campaign.conflicts).filter((conflict) => conflict.status === "active").length +
    Object.keys(campaign.emergencies).length;
  const crisisLoad = clamp01(1 - running / 8);

  // Whether there is anything left to pay for the next thing with, on the same
  // scale every other reader of the treasury uses. It read the treasury over a
  // thousand, which saturated at one for any solvent government and so said
  // nothing until the money was all but gone.
  const fiscalSpace = treasuryHealth(metrics.treasury);

  // Whether a commitment this government makes is believed. Debt service and a
  // record of measures nobody expected both read against it.
  const measures = selectLiveMeasures(campaign).length;
  const marketCredibility = clamp01(fiscalSpace * 0.5 + metrics.stability * 0.5 - measures * 0.01);

  const congressionalSupport = clamp01(campaign.congress.disposition);

  const alliances = Object.values(campaign.relationships).filter(
    (relationship) => relationship.from === campaign.founding.nation,
  );
  const allianceConfidence =
    alliances.length === 0
      ? 0.5
      : clamp01(
          alliances.reduce((sum, relationship) => sum + (relationship.trust + 1) / 2, 0) / alliances.length,
        );

  return {
    agencyCapacity: round3(agencyCapacity),
    congressionalSupport: round3(congressionalSupport),
    politicalCapital: round3(politicalCapital),
    institutionalTrust: round3(institutionalTrust),
    cabinetCohesion: round3(cabinetCohesion),
    fiscalSpace: round3(fiscalSpace),
    crisisLoad: round3(crisisLoad),
    marketCredibility: round3(marketCredibility),
    bureaucraticMorale: round3(bureaucraticMorale),
    allianceConfidence: round3(allianceConfidence),
  };
}

// A fully deteriorated government pays half again for a mistake. The ceiling
// is deliberately modest and was tuned down from higher: at 0.9 the reckless
// proxy was removed in five campaigns of six, which is not a punishment
// working, it is the arc becoming the only ending. Fragility is meant to be
// why a failing administration cannot recover easily, not a second health bar
// that ends the game on its own.
const MAX_AMPLIFICATION = 0.5;
// Only a term meaningfully below healthy is named as a driver. Listing ten
// terms every week would be the same as naming none.
const DRIVER_FLOOR = 0.55;

export function selectFragility(campaign: Campaign): FragilityReading {
  const terms = fragilityTerms(campaign);
  const keys = Object.keys(FRAGILITY_WEIGHTS) as FragilityTermKey[];
  const health = keys.reduce((sum, key) => sum + terms[key] * FRAGILITY_WEIGHTS[key], 0);
  const fragility = round3(clamp01(1 - health));

  const drivers: FragilityDriver[] = keys
    .filter((key) => terms[key] < DRIVER_FLOOR)
    .map((key) => ({
      term: key,
      reading: terms[key],
      contribution: round3((1 - terms[key]) * FRAGILITY_WEIGHTS[key]),
      remedy: REMEDIES[key],
    }))
    .sort((a, b) => b.contribution - a.contribution);

  return {
    terms,
    fragility,
    amplification: round3(1 + fragility * MAX_AMPLIFICATION),
    drivers,
  };
}

/**
 * What a cost actually comes to, given how well the government is holding up.
 *
 * Applied to *costs only*, never to gains: a fragile administration does not
 * get more out of a success, it gets less out of everything and more out of
 * nothing. Amplifying both directions would be a difficulty curve wearing a
 * mechanic's clothes.
 */
export function amplifiedCost(reading: FragilityReading, cost: number): number {
  if (cost >= 0) return cost;
  return round3(cost * reading.amplification);
}

/**
 * One sentence naming why a cost was heavier than its sticker price, for a
 * surface that has just charged one. Returns undefined when the administration
 * is healthy enough that nothing was amplified, so a screen never claims a
 * penalty that was not applied.
 */
export function explainAmplification(reading: FragilityReading): string | undefined {
  if (reading.drivers.length === 0) return undefined;
  const worst = reading.drivers.slice(0, 2).map((driver) => TERM_WORDS[driver.term]);
  const list = worst.length === 1 ? worst[0] : `${worst[0]} and ${worst[1]}`;
  return `This administration absorbs a shock ${Math.round((reading.amplification - 1) * 100)}% worse than a healthy one would, because of ${list}.`;
}

const TERM_WORDS: Readonly<Record<FragilityTermKey, string>> = {
  agencyCapacity: "agencies that cannot execute",
  congressionalSupport: "a Congress that will not move",
  politicalCapital: "spent political capital",
  institutionalTrust: "institutions bent out of shape",
  cabinetCohesion: "a cabinet that is disloyal or feuding",
  fiscalSpace: "no fiscal room left",
  crisisLoad: "too much running at once",
  marketCredibility: "markets that have stopped believing it",
  bureaucraticMorale: "a demoralized career service",
  allianceConfidence: "allies that have started hedging",
};
