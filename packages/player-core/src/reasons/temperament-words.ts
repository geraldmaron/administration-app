import { foreignLeaderFor, hasIntelOnNation, liveTemperament, type Campaign } from "@admin/engine";
import type { NationId, NationTraits } from "@admin/world";

// A government's temperament in words rather than in numbers.
//
// The eight trait scalars are what the simulation reads and are exactly what a
// player must never see: a screen printing "aggression 0.72" is showing the
// machine instead of the country. A band is the honest middle, and it is always
// a place in the world rather than an absolute word. The authored traits bunch
// low — most governments sit below a third on aggression — so an absolute scale
// would call nearly every country peaceable and say nothing, and a scale cut
// where one bloc's governments happen to sit would read as that bloc's identity.
// So each axis is cut at the world's own fifths, and a band says where this
// government sits among the others.

/** The trait axes a temperament phrase can be read off. `agendas` is a list, not an axis. */
export type TemperamentAxis = Exclude<keyof NationTraits, "agendas">;

export const TEMPERAMENT_AXES: readonly TemperamentAxis[] = [
  "aggression",
  "opportunism",
  "riskTolerance",
  "vengefulness",
  "legalism",
  "reliability",
  "transparency",
  "isolationism",
];

/** One axis as a band: where the government sits among the world's, 1 (least) to 5 (most). */
export type TemperamentReading = {
  readonly axis: TemperamentAxis;
  readonly level: 1 | 2 | 3 | 4 | 5;
  readonly text: string;
};

/** Each axis said as a comparison: the higher end, the lower end, and the middle. */
type AxisWords = { readonly more: string; readonly less: string; readonly same: string };

const AXIS_WORDS: Readonly<Record<TemperamentAxis, AxisWords>> = {
  aggression: { more: "quicker to use force", less: "slower to use force", same: "as quick to use force" },
  opportunism: { more: "quicker to jump at a chance", less: "slower to jump at a chance", same: "as quick to jump at a chance" },
  riskTolerance: { more: "more willing to take risks", less: "more careful about risks", same: "as willing to take risks" },
  vengefulness: { more: "slower to forgive a slight", less: "quicker to forgive a slight", same: "as slow to forgive a slight" },
  legalism: { more: "more bound by law and treaty", less: "less bound by law and treaty", same: "as bound by law and treaty" },
  reliability: { more: "more likely to keep its word", less: "less likely to keep its word", same: "as likely to keep its word" },
  transparency: { more: "more open about its business", less: "more secretive about its business", same: "as open about its business" },
  isolationism: { more: "more likely to stay out of other countries' affairs", less: "more likely to get involved abroad", same: "as likely to get involved abroad" },
};

const QUINTILES = [0.2, 0.4, 0.6, 0.8] as const;

// The cut points, read once per roster: every government's authored trait, so
// a campaign's rolls place a country against the world as it was written
// rather than against itself.
const cutsByRoster = new WeakMap<Campaign["nations"], ReadonlyMap<TemperamentAxis, readonly number[]>>();

function quantile(sorted: readonly number[], q: number): number {
  const at = (sorted.length - 1) * q;
  const low = Math.floor(at);
  const high = Math.ceil(at);
  return sorted[low]! + (sorted[high]! - sorted[low]!) * (at - low);
}

function cutsFor(campaign: Campaign): ReadonlyMap<TemperamentAxis, readonly number[]> {
  const known = cutsByRoster.get(campaign.nations);
  if (known) return known;
  const governments = Object.values(campaign.nations).filter((runtime) => runtime.base.id !== campaign.founding.nation);
  const cuts = new Map(
    TEMPERAMENT_AXES.map((axis) => {
      const sorted = governments.map((runtime) => runtime.base.traits[axis]).sort((a, b) => a - b);
      return [axis, sorted.length === 0 ? [] : QUINTILES.map((q) => quantile(sorted, q))] as const;
    }),
  );
  cutsByRoster.set(campaign.nations, cuts);
  return cuts;
}

function levelOf(value: number, cuts: readonly number[]): TemperamentReading["level"] {
  return (cuts.filter((cut) => value > cut).length + 1) as TemperamentReading["level"];
}

function sentence(axis: TemperamentAxis, level: TemperamentReading["level"]): string {
  const words = AXIS_WORDS[axis];
  if (level === 3) return `About ${words.same} as most governments`;
  const phrase = level > 3 ? words.more : words.less;
  const text = `${level === 1 || level === 5 ? "Far " : ""}${phrase} than most governments`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Where one read government sits on one axis among the world's, or nothing where it cannot be read. */
function levelFor(nation: NationId, axis: TemperamentAxis, campaign: Campaign): TemperamentReading["level"] | undefined {
  const runtime = campaign.nations[nation];
  if (!runtime || nation === campaign.founding.nation || !hasIntelOnNation(campaign, nation)) return undefined;
  const cuts = cutsFor(campaign).get(axis) ?? [];
  return cuts.length === 0 ? undefined : levelOf(runtime.traits[axis], cuts);
}

// How far a leader has to move an axis before the file says so: a couple of
// points on the hundred-point reading. Below that the lean is real but no
// government would be read differently for it.
const LEAN_SHOWN = 0.02;

/**
 * How the leader in office leans this government on one axis, against how it
 * usually is: "Under Anna Weber, it is quicker to use force than it usually
 * is". Only for a government the dataset has researched in full, because
 * anywhere else the temperament is fitted from its region and kind, and a lean
 * measured against a fitted reading would claim more than the services know.
 */
function leaderLeanSentence(nation: NationId, axis: TemperamentAxis, campaign: Campaign): string | undefined {
  const runtime = campaign.nations[nation];
  if (!runtime || (runtime.base.fidelity ?? "full") !== "full") return undefined;
  const live = liveTemperament(campaign, nation);
  const lean = live ? live[axis] - runtime.traits[axis] : 0;
  if (Math.abs(lean) < LEAN_SHOWN) return undefined;
  const leader = foreignLeaderFor(campaign, nation);
  const words = AXIS_WORDS[axis];
  return `${leader ? `Under ${leader.name}, it` : "Under its current leader, it"} is ${lean > 0 ? words.more : words.less} than it usually is`;
}

/**
 * The band phrase for one axis of one government, or nothing where the
 * services cannot read that government. Every read government gets its bands;
 * whether they were researched or fitted is the file's provenance sentence to
 * say, not a reason to hide them.
 */
export function temperamentBand(nation: NationId, axis: TemperamentAxis, campaign: Campaign): string | undefined {
  const level = levelFor(nation, axis, campaign);
  return level === undefined ? undefined : sentence(axis, level);
}

/**
 * One axis as a band with its step, for a screen that draws where the
 * government sits, followed by how its leader leans it where that is worth
 * saying. The band stays the government's own: a leader moves how it decides
 * while they hold office, not what kind of government it is.
 */
export function temperamentReading(nation: NationId, axis: TemperamentAxis, campaign: Campaign): TemperamentReading | undefined {
  const level = levelFor(nation, axis, campaign);
  const band = temperamentBand(nation, axis, campaign);
  if (level === undefined || band === undefined) return undefined;
  const lean = leaderLeanSentence(nation, axis, campaign);
  return { axis, level, text: lean ? `${band}. ${lean}` : band };
}

/** Every axis of one government, in the order the file lists them; empty where it is unread. */
export function temperamentReadings(nation: NationId, campaign: Campaign): readonly TemperamentReading[] {
  return TEMPERAMENT_AXES.flatMap((axis) => {
    const reading = temperamentReading(nation, axis, campaign);
    return reading ? [reading] : [];
  });
}
