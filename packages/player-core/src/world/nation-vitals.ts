import { hasIntelOnNation, selectConditionsFor, type Campaign, type NationCondition } from "@admin/engine";
import type { NationId } from "@admin/world";
import { stanceForRatio, type MetricStance } from "../format/figures";
import { statDefinition, type StatDefinition } from "./stat-definition";

// How a foreign country is doing, as bands rather than figures.
//
// Its growth, prices and jobs are what its own government publishes and are
// never secret, so every file shows them. How firmly its rulers hold on is an
// assessment of the elite, not a published figure, so it is read only where the
// services read that government. What it is living through is the one vital
// that is a story rather than a rate: the latest condition on it, in the words
// its last beat was written in.

export type VitalKey = "economy" | "prices" | "jobs" | "order" | "living";

export type NationVital = {
  readonly key: VitalKey;
  readonly caption: string;
  /** The band's word, or "Unread" where the services have no read. */
  readonly word: string;
  readonly stance?: MetricStance;
  /** Where the band sits on its own four steps, 1 to 4, highest the healthiest. */
  readonly level?: number;
  /** One line under the band: the latest beat of a condition, never a figure. */
  readonly line?: string;
  readonly unread?: true;
  /** What the reading is and what reads it, where it is a stat the dataset holds. */
  readonly definition?: StatDefinition;
};

const LEVEL: Readonly<Record<MetricStance, number>> = { adverse: 1, caution: 2, neutral: 3, favorable: 4 };

function band(key: VitalKey, caption: string, stance: MetricStance, word: string, path?: string): NationVital {
  return { key, caption, word, stance, level: LEVEL[stance], ...(path ? { definition: statDefinition(path) } : {}) };
}

function economyVital(growth: number): NationVital {
  const stance: MetricStance = growth < 0 ? "adverse" : growth < 0.015 ? "caution" : growth < 0.04 ? "neutral" : "favorable";
  const word = { adverse: "Shrinking", caution: "Stalling", neutral: "Growing", favorable: "Growing fast" }[stance];
  return band("economy", "Economy", stance, word, "economy.growth");
}

function pricesVital(inflation: number): NationVital {
  if (inflation < -0.005) return band("prices", "Prices", "caution", "Falling", "economy.inflation");
  const stance: MetricStance = inflation <= 0.03 ? "favorable" : inflation <= 0.06 ? "neutral" : inflation <= 0.15 ? "caution" : "adverse";
  const word = { favorable: "Steady", neutral: "Rising", caution: "Rising fast", adverse: "Out of control" }[stance];
  return band("prices", "Prices", stance, word, "economy.inflation");
}

function jobsVital(unemployment: number): NationVital {
  const stance: MetricStance = unemployment < 0.05 ? "favorable" : unemployment < 0.08 ? "neutral" : unemployment < 0.15 ? "caution" : "adverse";
  const word = { favorable: "Plenty of work", neutral: "Some people out of work", caution: "Work is scarce", adverse: "Work is very scarce" }[stance];
  return band("jobs", "Jobs", stance, word, "economy.unemployment");
}

function orderVital(campaign: Campaign, nation: NationId, stability: number): NationVital {
  if (!hasIntelOnNation(campaign, nation)) return { key: "order", caption: "Leaders' grip on power", word: "Unread", unread: true };
  const stance = stanceForRatio(stability);
  const word = { favorable: "Firm", neutral: "Holding", caution: "Shaky", adverse: "Failing" }[stance];
  return band("order", "Leaders' grip on power", stance, word, "politics.regimeStability");
}

const plain = (kind: string): string => {
  const words = kind.replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** The condition a country is living through that its file leads with: the newest, the worst on a tie. */
export function leadingCondition(campaign: Campaign, nation: NationId): NationCondition | undefined {
  return [...selectConditionsFor(campaign, nation)].sort(
    (a, b) => b.startedTurn - a.startedTurn || b.severity - a.severity || a.id.localeCompare(b.id),
  )[0];
}

function livingVital(campaign: Campaign, nation: NationId): NationVital {
  const live = leadingCondition(campaign, nation);
  if (!live) return { key: "living", caption: "Trouble at home", word: "Nothing reported", stance: "favorable", level: 4 };
  const stance: MetricStance = live.severity >= 0.66 ? "adverse" : live.severity >= 0.33 ? "caution" : "neutral";
  const beat = live.beats.at(-1)?.description;
  return { key: "living", caption: "Trouble at home", word: plain(live.kind), stance, level: LEVEL[stance], ...(beat ? { line: beat } : {}) };
}

/** A foreign country's vitals, in the order its file reads them; empty for the player's own or an unknown id. */
export function nationVitals(campaign: Campaign, nation: NationId): readonly NationVital[] {
  const runtime = campaign.nations[nation];
  if (!runtime || nation === campaign.founding.nation) return [];
  const { economy, politics } = runtime.stats;
  return [
    economyVital(economy.growth),
    pricesVital(economy.inflation),
    jobsVital(economy.unemployment),
    orderVital(campaign, nation, politics.regimeStability),
    livingVital(campaign, nation),
  ];
}
