import { economyRecord, stateApprovals, type Campaign, type MetricSet, type NationRuntime } from "@admin/engine";
import { computeMilitaryMetrics, debtToGdp, type NationStats, type StateId } from "@admin/world";
import type { EconomyHistoryRate } from "../economy/history.js";
import { selfNation } from "./subjects.js";
import type { Better, CoursePoint, FormatKind, CompareSubjectKind } from "./types.js";

// Every reading the comparison surfaces can set side by side, with where each
// subject's figure is read from. A reader exists only where the campaign holds
// the figure: a foreign government has no approval rating in this game, and
// nothing keeps the course of any government's stats but the President's own
// economy, so those readers are absent rather than approximated.

export type CompareMetricId =
  | "approval"
  | "treasury"
  | "stability"
  | "militaryReadiness"
  | "standing"
  | "growth"
  | "inflation"
  | "unemployment"
  | "debtToGdp"
  | "militaryStrength"
  | "regimeStability"
  | "softPower"
  | "tradeReliance";

/** Where a subject's history subjects come from: the engine's authored landmarks or the published U.S. record. */
export type HistorySource = "approval-landmarks" | "treasury-scale" | EconomyHistoryRate;

export type CompareMetric = {
  readonly id: CompareMetricId;
  readonly label: string;
  /** The unit in words, for a caption or an axis. */
  readonly unit: string;
  readonly format: FormatKind;
  readonly better: Better;
  /** A fixed scale where the reading has one. */
  readonly domain?: readonly [number, number];
  readonly subjects: readonly CompareSubjectKind[];
  /**
   * `published`: a figure the government prints, readable for any government.
   * `assessed`: a judgment of a government's inner workings, readable only
   * where the President's services read that government.
   */
  readonly visibility: "published" | "assessed";
  /** The President's own figure this week. */
  readonly self: (campaign: Campaign) => number | undefined;
  /** The President's recorded course, oldest first, this week last. Absent where nothing keeps one. */
  readonly course?: (campaign: Campaign) => readonly CoursePoint[];
  /** Another government's figure this week, off its live stats. */
  readonly nation?: (runtime: NationRuntime) => number;
  readonly state?: (campaign: Campaign, id: StateId) => number | undefined;
  readonly stateCourse?: (campaign: Campaign, id: StateId) => readonly CoursePoint[];
  readonly history?: HistorySource;
};

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/** A course with this week's live reading in place of any sample stamped this week. */
function withLive(campaign: Campaign, points: readonly CoursePoint[], live: number | undefined): readonly CoursePoint[] {
  const settled = points.filter((point) => point.turn < campaign.turn);
  return live === undefined ? settled : [...settled, { turn: campaign.turn, value: live }];
}

/**
 * `metricHistory` carries no turn of its own: it is the week-opening reading of
 * each closed week, newest last, so its last entry is last week's and the
 * entries before it count back one week each (into the inherited quarter
 * before the oath on a young campaign).
 */
function playerCourse(campaign: Campaign, key: keyof MetricSet): readonly CoursePoint[] {
  const history = campaign.player.metricHistory;
  const first = campaign.turn - history.length;
  const closed = history.map((snapshot, index) => ({ turn: first + index, value: snapshot[key] }));
  return [...closed, { turn: campaign.turn, value: campaign.player.metrics[key] }];
}

function selfRuntime(campaign: Campaign): NationRuntime | undefined {
  return campaign.nations[selfNation(campaign)];
}

function selfStat(read: (runtime: NationRuntime) => number): (campaign: Campaign) => number | undefined {
  return (campaign) => {
    const runtime = selfRuntime(campaign);
    return runtime ? read(runtime) : undefined;
  };
}

function economyCourse(rate: EconomyHistoryRate): (campaign: Campaign) => readonly CoursePoint[] {
  return (campaign) => {
    const recorded = economyRecord(campaign).map((sample) => ({ turn: sample.turn, value: sample[rate] }));
    return withLive(campaign, recorded, selfRuntime(campaign)?.stats.economy[rate]);
  };
}

/** A state's jobless rate is the country's carried through the state's authored standing against it, as the economy board reads it. */
function stateUnemploymentAt(campaign: Campaign, id: StateId, national: number): number | undefined {
  const anchor = campaign.states[id]?.base.character.vitalAnchor.unemployment;
  return anchor === undefined ? undefined : clamp01(national + anchor);
}

function stateUnemploymentCourse(campaign: Campaign, id: StateId): readonly CoursePoint[] {
  return economyCourse("unemployment")(campaign).flatMap((point) => {
    const value = stateUnemploymentAt(campaign, id, point.value);
    return value === undefined ? [] : [{ turn: point.turn, value }];
  });
}

function stateApprovalCourse(campaign: Campaign, id: StateId): readonly CoursePoint[] {
  const recorded = (campaign.stateApprovalHistory ?? []).flatMap((sample) => {
    const value = sample.approval[id];
    return value === undefined ? [] : [{ turn: sample.turn, value }];
  });
  return withLive(campaign, recorded, stateApprovals(campaign)[id]);
}

function playerMetric(key: keyof MetricSet, label: string, unit: string, format: FormatKind, history?: HistorySource): CompareMetric {
  return {
    id: key,
    label,
    unit,
    format,
    better: "up",
    ...(format === "usd-millions" ? {} : { domain: [0, 1] as const }),
    subjects: history ? ["self", "self-at", "history"] : ["self", "self-at"],
    visibility: "published",
    self: (campaign) => campaign.player.metrics[key],
    course: (campaign) => playerCourse(campaign, key),
    ...(history ? { history } : {}),
  };
}

function economyRate(rate: EconomyHistoryRate, label: string, unit: string, better: Better): CompareMetric {
  return {
    id: rate,
    label,
    unit,
    format: "percent",
    better,
    subjects: ["self", "self-at", "nation", "history"],
    visibility: "published",
    self: selfStat((runtime) => runtime.stats.economy[rate]),
    course: economyCourse(rate),
    nation: (runtime) => runtime.stats.economy[rate],
    history: rate,
  };
}

function nationStat(
  id: CompareMetricId,
  label: string,
  unit: string,
  format: FormatKind,
  better: Better,
  visibility: CompareMetric["visibility"],
  read: (stats: NationStats) => number,
): CompareMetric {
  return {
    id,
    label,
    unit,
    format,
    better,
    ...(format === "index" ? { domain: [0, 1] as const } : {}),
    subjects: ["self", "nation"],
    visibility,
    self: selfStat((runtime) => read(runtime.stats)),
    nation: (runtime) => read(runtime.stats),
  };
}

const softPower = (stats: NationStats): number => (stats.softPower.diplomaticReach + stats.softPower.culturalReach) / 2;
const tradeReliance = (stats: NationStats): number => Math.max(0, ...Object.values(stats.trade.tradeDependence));

const APPROVAL: CompareMetric = {
  ...playerMetric("approval", "Approval", "share of Americans who approve", "share", "approval-landmarks"),
  subjects: ["self", "self-at", "state", "history"],
  state: (campaign, id) => stateApprovals(campaign)[id],
  stateCourse: stateApprovalCourse,
};

const UNEMPLOYMENT: CompareMetric = {
  ...economyRate("unemployment", "Unemployment", "share of the labor force out of work", "down"),
  subjects: ["self", "self-at", "nation", "state", "history"],
  state: (campaign, id) => {
    const national = selfRuntime(campaign)?.stats.economy.unemployment;
    return national === undefined ? undefined : stateUnemploymentAt(campaign, id, national);
  },
  stateCourse: stateUnemploymentCourse,
};

export const COMPARE_METRICS: Readonly<Record<CompareMetricId, CompareMetric>> = {
  approval: APPROVAL,
  treasury: playerMetric("treasury", "Budget authority", "USD millions", "usd-millions", "treasury-scale"),
  stability: playerMetric("stability", "Stability", "score, 0 to 1", "index"),
  militaryReadiness: playerMetric("militaryReadiness", "Military readiness", "% of full readiness", "share"),
  standing: playerMetric("standing", "Standing abroad", "score, 0 to 1", "index"),
  growth: economyRate("growth", "Growth", "yearly change in what the economy produces", "up"),
  inflation: economyRate("inflation", "Inflation", "yearly change in prices", "down"),
  unemployment: UNEMPLOYMENT,
  debtToGdp: nationStat("debtToGdp", "Debt compared with economy", "debt as a share of what the economy produces in a year", "share", "down", "published", debtToGdp),
  militaryStrength: nationStat("militaryStrength", "Military strength", "strength score, 0 to 1", "index", "up", "assessed", (stats) => computeMilitaryMetrics(stats).forceIndex),
  regimeStability: nationStat("regimeStability", "Government stability", "score, 0 to 1", "index", "up", "assessed", (stats) => stats.politics.regimeStability),
  softPower: nationStat("softPower", "Influence abroad", "reach through diplomacy and culture, 0 to 1", "index", "up", "published", softPower),
  tradeReliance: nationStat("tradeReliance", "Reliance on top trade partner", "share of trade through one partner", "share", "down", "published", tradeReliance),
};

export const COMPARE_METRIC_IDS: readonly CompareMetricId[] = Object.keys(COMPARE_METRICS) as CompareMetricId[];

export function compareMetric(id: string): CompareMetric | undefined {
  return COMPARE_METRIC_IDS.includes(id as CompareMetricId) ? COMPARE_METRICS[id as CompareMetricId] : undefined;
}
