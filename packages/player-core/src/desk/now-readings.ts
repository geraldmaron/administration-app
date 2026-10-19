import {
  BEAT_THRESHOLDS,
  INABILITY_OWN_LINE,
  INABILITY_RETRY_DAYS,
  INABILITY_SUSTAIN_DAYS,
  caucusBreakShare,
  ownIdentifierApproval,
  pressureCompositionTotal,
  removalSeverity,
  selectPressureComposition,
  selectRemoval,
  turnsFor,
  type Campaign,
  type MetricSet,
  type PressureTermKey,
  type RemovalArc,
} from "@admin/engine";
import { charterOf } from "../campaign/founding-options";
import { METRIC_LABELS, formatRatio, formatSignedPoints, metricFraction, stanceForRatio, type MetricStance } from "../format/figures";
import { formatMoney } from "../format/money";
import { place } from "../navigation/places";
import { isInheritedRow } from "../record/inheritance";

/** The Brief's readings, in the order the strip draws them. */
export const NOW_KEYS: readonly (keyof MetricSet)[] = ["approval", "treasury", "stability", "militaryReadiness", "standing"];

export type NowReading = {
  readonly key: keyof MetricSet;
  readonly label: string;
  readonly value: number;
  /** Where it sits in its own range, 0..1: what the gauge draws. */
  readonly fraction: number;
  readonly figure: string;
  readonly stance: MetricStance;
  /** The move since the last closed week, or nothing while no week of this term has closed. */
  readonly week?: { readonly delta: number; readonly text: string; readonly direction: "up" | "down" | "flat" };
  /** Weekly values, oldest first, ending with now: the line a trend draws. */
  readonly trail: readonly number[];
  /** How many of the trail's first values came before this administration. */
  readonly inherited: number;
  readonly href: string;
};

function weekText(key: keyof MetricSet, delta: number): string {
  return key === "treasury" ? `${delta >= 0 ? "+" : "−"}${formatMoney(Math.abs(delta))}` : `${formatSignedPoints(delta)} pts`;
}

/** Readings smaller than a twentieth of a point print as unchanged. */
const FLAT = 0.0005;

/** The five readings now, each with its gauge position and its move since the last closed week of this term. */
export function nowReadings(campaign: Campaign): readonly NowReading[] {
  const history = campaign.player.metricHistory;
  const lastIndex = history.length - 1;
  const lastWeek = lastIndex >= 0 && !isInheritedRow(campaign, lastIndex) ? history[lastIndex] : undefined;
  const inherited = history.filter((_, i) => isInheritedRow(campaign, i)).length;
  return NOW_KEYS.map((key) => {
    const value = campaign.player.metrics[key];
    const fraction = metricFraction(key, value);
    const delta = lastWeek ? value - lastWeek[key] : undefined;
    const flat = delta !== undefined && Math.abs(delta) < (key === "treasury" ? 0.5 : FLAT);
    return {
      key,
      label: METRIC_LABELS[key],
      value,
      fraction,
      figure: key === "treasury" ? formatMoney(value) : formatRatio(value),
      stance: stanceForRatio(fraction),
      ...(delta === undefined ? {} : { week: { delta, text: flat ? "No change" : weekText(key, delta), direction: flat ? ("flat" as const) : delta > 0 ? ("up" as const) : ("down" as const) } }),
      trail: [...history.map((row) => row[key]), value],
      inherited,
      href: place.metric(key),
    };
  });
}

export const PRESSURE_TERM_WORDS: Readonly<Record<PressureTermKey, string>> = {
  unpopularity: "How many people disapprove of you",
  alignment: "How far you are from what Congress wants",
  decisionHistory: "Recent decisions that cost approval",
  congress: "A hostile Congress",
  floors: "Time spent below a danger line",
  faction: "A faction inside your own government",
};

export type RemovalStanding = {
  /** The arc's own figure, from the last weekly tick. */
  readonly pressure: number;
  readonly figure: string;
  readonly stance: "neutral" | "caution" | "adverse";
  /** The proceedings' lines on the same scale: the House vote, the trial, conviction. */
  readonly thresholds: readonly { readonly at: number; readonly label: string }[];
  /** What the figure is made of right now, heaviest first; the live total they add up to is `liveTotal`. */
  readonly terms: readonly { readonly key: PressureTermKey; readonly label: string; readonly share: number }[];
  readonly liveTotal: number;
  /** Calm: no proceeding has opened and the figure sits under the first line. */
  readonly calm: boolean;
  /** Only where the charter removes a President by impeachment: the two readings of the President's own party. */
  readonly ownParty?: OwnPartyStanding;
};

export type OwnPartyStanding = {
  /** How many of the President's own party's identifiers still approve, 0..1. */
  readonly approval: number;
  readonly figure: string;
  /** The members of the President's Senate caucus a grave charge would turn against them, and how many sit in it. */
  readonly senatorsLost: number;
  readonly senators: number;
  /** The inability watch: a design threshold, not a historical one, and how long the party has been under it. */
  readonly inability: {
    readonly line: number;
    readonly lineFigure: string;
    readonly below: boolean;
    readonly weeksBelow: number;
    readonly weeksNeeded: number;
    /** Turns until another declaration may be made, after one that failed. */
    readonly weeksUntilRetry?: number;
  };
};

const THRESHOLD_WORDS = ["A committee talks of impeachment", "The House votes to impeach", "The Senate trial can remove you"] as const;

/**
 * How close Congress is to moving against the President: the arc's figure
 * against the lines that open each proceeding, and the terms behind it read
 * live, so the breakdown adds up to the total it says it adds up to.
 */
export function removalStanding(campaign: Campaign): RemovalStanding {
  const arc = selectRemoval(campaign);
  const composition = selectPressureComposition(campaign, charterOf(campaign));
  const stance = removalSeverity(arc);
  return {
    pressure: arc.pressure,
    figure: formatRatio(arc.pressure),
    stance,
    thresholds: BEAT_THRESHOLDS.map((at, index) => ({ at, label: THRESHOLD_WORDS[index] ?? "Another step" })),
    terms: [...composition.components]
      .sort((a, b) => b.contribution - a.contribution)
      .map((component) => ({ key: component.term, label: PRESSURE_TERM_WORDS[component.term], share: component.contribution })),
    liveTotal: pressureCompositionTotal(composition),
    calm: stance === "neutral" && arc.beats.length === 0,
    ...(charterOf(campaign).removalMechanism === "impeachment" ? { ownParty: ownPartyStanding(campaign, arc.inability) } : {}),
  };
}

function ownPartyStanding(campaign: Campaign, watch: RemovalArc["inability"]): OwnPartyStanding {
  const approval = ownIdentifierApproval(campaign);
  const senators = campaign.congress.chambers.senate.administration;
  const since = watch?.belowSince;
  const retry = watch?.failedTurn === undefined ? 0 : watch.failedTurn + turnsFor(INABILITY_RETRY_DAYS) - campaign.turn;
  return {
    approval,
    figure: formatRatio(approval),
    senatorsLost: Math.round(senators * caucusBreakShare(approval)),
    senators,
    inability: {
      line: INABILITY_OWN_LINE,
      lineFigure: formatRatio(INABILITY_OWN_LINE),
      below: since !== undefined,
      weeksBelow: since === undefined ? 0 : Math.max(0, campaign.turn - since),
      weeksNeeded: turnsFor(INABILITY_SUSTAIN_DAYS),
      ...(retry > 0 ? { weeksUntilRetry: retry } : {}),
    },
  };
}
