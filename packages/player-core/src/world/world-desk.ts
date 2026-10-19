import {
  selectActiveConflicts,
  selectBindingTreaties,
  selectExpectedRetaliation,
  selectLiveMeasures,
  selectTreatiesAwaitingRatification,
  trustCourse,
  conflictsAsParty,
  type Campaign,
  type Conflict,
} from "@admin/engine";
import type { NationId } from "@admin/world";
import { TRUST_STANCE_CUTS, formatSignedPoints, stanceForTrust, trustWord } from "../format/figures";
import { place } from "../navigation/places";
import { changeOver } from "../polling/record-trend";
import type { Stance } from "../reading";
import { recordRows, type RecordRow } from "../record/record-entry";
import { warAgeLine } from "./war-age";
import { worldWatchlist, type InFlight, type Mover } from "./world-board";
import type { WorldGovernment } from "./world-governments";
import { intensityWord } from "./conflict-intensity";
import { presenceWord } from "./world-governments";
import { formatShare } from "./trade-partners";
import { forcesByHost } from "./us-presence";

// The World's operations overview in numbers: the six headline readings, the
// wars as rows, and the history of the one reading the President carries
// about how other governments see the administration. Every figure is read off
// the engine or off the government rows the table and map draw.

const nameOf = (campaign: Campaign, id: NationId): string => campaign.nations[id]?.base.identity.name ?? id;

export type WarDeskRow = {
  readonly id: string;
  readonly href: string;
  readonly sides: readonly { readonly nation: NationId; readonly name: string; readonly role: "aggressor" | "defender" }[];
  /** Governments that joined after the opening, both sides together. */
  readonly joined: number;
  readonly intensity: number;
  readonly intensityText: string;
  readonly age: string;
  readonly youAreParty: boolean;
  /** US personnel hosted by the belligerents, in words; absent when none is. */
  readonly exposure: string | undefined;
};

function warRow(campaign: Campaign, conflict: Conflict, party: ReadonlySet<string>, hosted: ReadonlyMap<string, number>, most: number): WarDeskRow {
  const everyone = [conflict.aggressor, conflict.defender, ...conflict.joined.aggressor, ...conflict.joined.defender];
  const personnel = everyone.reduce((sum, id) => sum + (hosted.get(id) ?? 0), 0);
  return {
    id: conflict.id,
    href: place.war(conflict.id),
    sides: [
      { nation: conflict.aggressor, name: nameOf(campaign, conflict.aggressor), role: "aggressor" },
      { nation: conflict.defender, name: nameOf(campaign, conflict.defender), role: "defender" },
    ],
    joined: conflict.joined.aggressor.length + conflict.joined.defender.length,
    intensity: conflict.intensity,
    intensityText: intensityWord(conflict.intensity),
    age: warAgeLine(campaign, conflict),
    youAreParty: party.has(conflict.id),
    exposure: personnel > 0 ? `${presenceWord(personnel, most)} US presence among the countries fighting` : undefined,
  };
}

/** Wars the United States fights first, then the hottest. */
export function worldWars(campaign: Campaign): readonly WarDeskRow[] {
  const party = new Set(conflictsAsParty(campaign).map((conflict) => conflict.id));
  const hosted = forcesByHost(campaign);
  const most = Math.max(1, ...hosted.values());
  return selectActiveConflicts(campaign)
    .map((conflict) => warRow(campaign, conflict, party, hosted, most))
    .sort((a, b) => Number(b.youAreParty) - Number(a.youAreParty) || b.intensity - a.intensity || a.id.localeCompare(b.id));
}

export type StanceTally = Readonly<Record<Stance | "unread", number>>;

export type StandingKpi = {
  /** Governments whose view of the United States the services can read. */
  readonly read: number;
  readonly total: number;
  readonly counts: StanceTally;
  /** The average of the read governments' trust: its band, and where it sits on the axis, 0..1. */
  readonly mean: { readonly stance: Stance; readonly word: string; readonly fraction: number } | undefined;
  /** Four weeks' move in that average, in the same axis units; absent until the record reaches back. */
  readonly change4: number | undefined;
};

export type WorldKpis = {
  readonly wars: { readonly count: number; readonly withUs: number; readonly hottest: WarDeskRow | undefined };
  readonly standing: StandingKpi;
  readonly treaties: { readonly inForce: number; readonly alliances: number; readonly awaiting: number; readonly alignedGovernments: number };
  readonly pending: { readonly total: number; readonly byKind: Readonly<Record<InFlight["kind"], number>> };
  readonly trade: { readonly topShare: number; readonly topText: string; readonly topNames: readonly string[]; readonly measures: number; readonly expectedAnswers: number };
  readonly intelligence: { readonly assessed: number; readonly unread: number; readonly total: number };
};

const TOP_PARTNERS = 5;
const ZERO: StanceTally = { favorable: 0, neutral: 0, caution: 0, adverse: 0, unread: 0 };

export function tallyStances(governments: readonly WorldGovernment[]): StanceTally {
  return governments.reduce<StanceTally>((counts, government) => {
    const key = government.stance ?? "unread";
    return { ...counts, [key]: counts[key] + 1 };
  }, ZERO);
}

type TrustPoint = { readonly turn: number; readonly value: number };

const axisToTrust = (fraction: number): number => fraction * 2 - 1;

/** The mean of the read governments' trust each closed week, oldest first, on the 0..1 axis. */
export function averageTrustSeries(campaign: Campaign, governments: readonly WorldGovernment[]): readonly TrustPoint[] {
  const sums = new Map<number, { total: number; count: number }>();
  for (const government of governments.filter((entry) => entry.trust !== undefined)) {
    for (const point of trustCourse(campaign, government.nation)) {
      if (point.theirs === undefined) continue;
      const known = sums.get(point.turn) ?? { total: 0, count: 0 };
      sums.set(point.turn, { total: known.total + (point.theirs + 1) / 2, count: known.count + 1 });
    }
  }
  return [...sums.entries()].sort(([a], [b]) => a - b).map(([turn, { total, count }]) => ({ turn, value: total / count }));
}

function standingKpi(governments: readonly WorldGovernment[], series: readonly TrustPoint[]): StandingKpi {
  const read = governments.filter((government) => government.trust !== undefined);
  const mean = read.length > 0 ? read.reduce((sum, government) => sum + government.trust!, 0) / read.length : undefined;
  const stance = mean === undefined ? undefined : stanceForTrust(axisToTrust(mean));
  const change = changeOver(series, 4);
  return {
    read: read.length,
    total: governments.length,
    counts: tallyStances(governments),
    mean: mean === undefined || stance === undefined ? undefined : { stance, word: trustWord(stance), fraction: mean },
    change4: change,
  };
}

function tradeKpi(campaign: Campaign, governments: readonly WorldGovernment[]): WorldKpis["trade"] {
  const top = [...governments].sort((a, b) => b.tradeShare - a.tradeShare).slice(0, TOP_PARTNERS);
  const share = top.reduce((sum, government) => sum + government.tradeShare, 0);
  return { topShare: share, topText: formatShare(share), topNames: top.map((government) => government.name), measures: selectLiveMeasures(campaign).length, expectedAnswers: selectExpectedRetaliation(campaign).length };
}

const KINDS: readonly InFlight["kind"][] = ["operation", "authorization", "treaty", "retaliation"];

/** The six readings across the top of the World, each from the same rows the sections below draw. */
export function worldKpis(campaign: Campaign, governments: readonly WorldGovernment[], wars: readonly WarDeskRow[], flight: readonly InFlight[], series: readonly TrustPoint[]): WorldKpis {
  const binding = selectBindingTreaties(campaign);
  const counts = tallyStances(governments);
  const assessed = counts.favorable + counts.neutral + counts.caution + counts.adverse;
  return {
    wars: { count: wars.length, withUs: wars.filter((war) => war.youAreParty).length, hottest: wars[0] },
    standing: standingKpi(governments, series),
    treaties: {
      inForce: binding.length,
      alliances: binding.filter((record) => record.kind === "alliance").length,
      awaiting: selectTreatiesAwaitingRatification(campaign).length,
      alignedGovernments: governments.filter((government) => government.alignment === "aligned" || government.alignment === "leaning-aligned").length,
    },
    pending: { total: flight.length, byKind: Object.fromEntries(KINDS.map((kind) => [kind, flight.filter((item) => item.kind === kind).length])) as Record<InFlight["kind"], number> },
    trade: tradeKpi(campaign, governments),
    intelligence: { assessed, unread: governments.length - assessed, total: governments.length },
  };
}

export type StandingMoves = {
  /** Every Record entry that moved International Standing, newest first, each narrowed to that one reading. */
  readonly rows: readonly RecordRow[];
  readonly lifted: { readonly count: number; readonly text: string };
  readonly cost: { readonly count: number; readonly text: string };
};

/** What moved International Standing, from the Record, whoever acted. */
export function standingMoves(campaign: Campaign): StandingMoves {
  const rows = recordRows(campaign)
    .filter((row) => row.moves.some((move) => move.key === "standing"))
    .map((row) => ({ ...row, moves: row.moves.filter((move) => move.key === "standing") }));
  const deltas = rows.flatMap((row) => row.moves.map((move) => move.delta));
  const up = deltas.filter((delta) => delta > 0);
  const down = deltas.filter((delta) => delta < 0);
  const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0);
  return { rows, lifted: { count: up.length, text: formatSignedPoints(sum(up)) }, cost: { count: down.length, text: formatSignedPoints(sum(down)) } };
}

export type WorldDesk = {
  readonly governments: readonly WorldGovernment[];
  readonly wars: readonly WarDeskRow[];
  readonly flight: readonly InFlight[];
  readonly movers: readonly Mover[];
  readonly kpis: WorldKpis;
  readonly trustSeries: readonly number[];
};

export const formatTrustBand = (fraction: number): string => trustWord(stanceForTrust(axisToTrust(fraction)));

const trustAxisAt = (trust: number): number => (trust + 1) / 2;

/** One axis tick in the middle of each trust band, so a chart names every band once and never repeats a word. */
export const TRUST_BAND_TICKS: readonly number[] = [
  trustAxisAt(-1 + (TRUST_STANCE_CUTS.caution + 1) / 2),
  trustAxisAt((TRUST_STANCE_CUTS.caution + TRUST_STANCE_CUTS.neutral) / 2),
  trustAxisAt((TRUST_STANCE_CUTS.neutral + TRUST_STANCE_CUTS.favorable) / 2),
  trustAxisAt((TRUST_STANCE_CUTS.favorable + 1) / 2),
];

/** Everything the World's overview draws, from one pass over the governments. */
export function worldDesk(campaign: Campaign, governments: readonly WorldGovernment[]): WorldDesk {
  const watch = worldWatchlist(campaign);
  const wars = worldWars(campaign);
  const series = averageTrustSeries(campaign, governments);
  return {
    governments,
    wars,
    flight: watch.inFlight,
    movers: watch.movers,
    kpis: worldKpis(campaign, governments, wars, watch.inFlight, series),
    trustSeries: series.map((point) => point.value),
  };
}
