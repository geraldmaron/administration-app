import {
  OPINION_CAUSE_LABELS,
  OPINION_DRIVERS,
  SALIENCE_REASONS,
  heaviestCause,
  opinionCausesFor,
  salientWeights,
  selectOpinionCauses,
  type Campaign,
  type OpinionCause,
  type OpinionDriver,
  type OpinionDriverCauses,
} from "@admin/engine";
import { OPINION_DRIVER_LABELS } from "../format/figures";
import { readingBand, type Stance } from "../reading";

/**
 * One of the six judgments approval is made of, with what moved it. The
 * approval file draws all six so a player can see the world moving the number
 * as well as their own decisions.
 */
export type DriverBar = {
  readonly driver: OpinionDriver;
  readonly label: string;
  /** The judgment's level, 0..1. */
  readonly value: number;
  /** Where the country's own board is taking it, 0..1. */
  readonly target: number;
  /** This judgment's share of approval this week, after the week has had its say. */
  readonly weight: number;
  readonly word: string;
  readonly stance: Stance;
  /** What weighed most on it this week, in words, when anything did. */
  readonly leadingCause?: string;
  /** The figure behind the leading cause, in the model's own sentence. */
  readonly leadingDetail?: string;
  /**
   * Every reason the week made this judgment louder than it rests; empty when
   * none did. All of them, because two can fire on one judgment at once (a
   * pump shock and prices biting both raise prosperity), and naming only the
   * first hid the one a new shock had just added.
   */
  readonly louder: readonly string[];
};

/** How far a judgment must still have to travel before the bar draws an arrow for it. */
const HEADING_FLOOR = 0.005;

/** How many closed weeks the Desk looks back over to see which judgment is falling. */
const RECENT_WEEKS = 4;

/** A tenth of a point of approval over the window: less than that is not a fall anyone would notice. */
const MATERIAL_FALL = 0.001;

function barFor(reading: OpinionDriverCauses, weight: number, cause: OpinionCause | undefined): DriverBar {
  const band = readingBand("standing", reading.level);
  const named = cause && cause.key !== "base" && cause.key !== "bounded";
  return {
    driver: reading.driver,
    label: OPINION_DRIVER_LABELS[reading.driver],
    value: reading.level,
    target: Math.abs(reading.distance) < HEADING_FLOOR ? reading.level : reading.target,
    weight,
    word: band?.word ?? "",
    stance: band?.stance ?? "neutral",
    ...(named ? { leadingCause: OPINION_CAUSE_LABELS[cause.key], leadingDetail: cause.detail } : {}),
    louder: reading.salience.map((key) => SALIENCE_REASONS[key]),
  };
}

/** The campaign with the economy's own readings as they stood in a kept week. */
function economyAsOf(campaign: Campaign, turn: number): Campaign | undefined {
  const sample = [...(campaign.economyHistory ?? [])].reverse().find((entry) => entry.turn <= turn);
  const nation = campaign.founding.nation;
  const runtime = campaign.nations[nation];
  if (!sample || !runtime) return undefined;
  const economy = { ...runtime.stats.economy, growth: sample.growth, inflation: sample.inflation, unemployment: sample.unemployment };
  return { ...campaign, nations: { ...campaign.nations, [nation]: { ...runtime, stats: { ...runtime.stats, economy } } } };
}

/**
 * The cause inside a fallen judgment that fell furthest over the window.
 *
 * The heaviest standing cause is the wrong answer to "what pulled it down": an
 * inflation shock doubles what prices cost prosperity while unemployment sits
 * where it has sat all term, and the heavier standing term would take the blame
 * for a fall it had no part in. Prosperity's terms are the economy, which the
 * campaign keeps week by week, so they are read again against the economy as it
 * stood when the window opened, by the engine's own terms. The other judgments'
 * inputs are not kept, so they name their heaviest standing cause.
 */
function movedCause(campaign: Campaign, reading: OpinionDriverCauses, since: number): OpinionCause | undefined {
  if (reading.driver !== "prosperity") return undefined;
  const then = economyAsOf(campaign, since);
  if (!then) return undefined;
  const before = new Map(opinionCausesFor(then, "prosperity").map((cause) => [cause.key, cause.contribution]));
  let moved: { readonly cause: OpinionCause; readonly fall: number } | undefined;
  for (const cause of reading.causes) {
    if (cause.key === "base" || cause.key === "bounded") continue;
    const fall = cause.contribution - (before.get(cause.key) ?? cause.contribution);
    if (fall < (moved?.fall ?? 0)) moved = { cause, fall };
  }
  return moved?.cause;
}

/** How far each judgment moved over the window, read off the mood every packet leaves on the ledger. */
function recentFalls(campaign: Campaign, since: number, weights?: Readonly<Record<OpinionDriver, number>>): Record<OpinionDriver, number> {
  const fell = Object.fromEntries(OPINION_DRIVERS.map((driver) => [driver, 0])) as Record<OpinionDriver, number>;
  for (const entry of campaign.ledger) {
    if (entry.turn <= since || !entry.mood) continue;
    for (const driver of OPINION_DRIVERS) fell[driver] += (entry.mood[driver] ?? 0) * (weights?.[driver] ?? 1);
  }
  return fell;
}

/**
 * The six judgments behind approval, each with its level, heading and leading
 * cause: the term that moved where the judgment has fallen over the Desk's
 * window, so the file and the Desk tile name the same thing, and otherwise the
 * heaviest standing term.
 */
export function approvalDrivers(campaign: Campaign): readonly DriverBar[] {
  const weights = salientWeights(campaign);
  const since = campaign.turn - RECENT_WEEKS;
  const fell = recentFalls(campaign, since);
  return selectOpinionCauses(campaign).map((reading) => {
    const moved = fell[reading.driver] <= -MATERIAL_FALL ? movedCause(campaign, reading, since) : undefined;
    return barFor(reading, weights[reading.driver], moved ?? heaviestCause(reading));
  });
}

/** The one cause pulling approval down hardest, and the judgment it pulls on. */
export type ApprovalDrag = { readonly cause: string; readonly driver: string };

/**
 * What is pulling approval down: the judgment that fell furthest over the last
 * few weeks, priced at the weight the week gives it, named by the term
 * behind it that moved. Read off the mood every packet already leaves on the ledger.
 *
 * A fall rather than a standing drag, because the largest standing drag is
 * almost always the same structural one (a divided country's unity), and a
 * Desk that named it every week would be telling the player nothing. Nothing
 * when no judgment has fallen by a noticeable amount.
 */
export function approvalDrag(campaign: Campaign): ApprovalDrag | undefined {
  const weights = salientWeights(campaign);
  const since = campaign.turn - RECENT_WEEKS;
  const fell = recentFalls(campaign, since, weights);
  const worst = OPINION_DRIVERS.reduce((a, b) => (fell[b] < fell[a] ? b : a));
  if (fell[worst] > -MATERIAL_FALL) return undefined;
  const reading = selectOpinionCauses(campaign).find((entry) => entry.driver === worst);
  const cause = reading ? (movedCause(campaign, reading, since) ?? heaviestCause(reading)) : undefined;
  if (!cause) return undefined;
  return { cause: OPINION_CAUSE_LABELS[cause.key], driver: OPINION_DRIVER_LABELS[worst] };
}
