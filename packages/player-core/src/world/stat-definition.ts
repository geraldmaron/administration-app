import { GEO_CONSUMERS, STAT_CONSUMERS, TRAIT_CONSUMERS, metricFor } from "@admin/world";

// What a reading on a country file is, and what in the game reads it.
//
// A band with no definition behind it is a word the game is asking to be
// trusted on. Two things make a definition honest, and neither is written by
// hand here: what the reading measures comes from the world's metric registry,
// so the file and the studio console cannot disagree, and what it changes comes
// from the consumer registry every authored field must have an entry in — so a
// file cannot claim an effect the code does not have, and gains one the day a
// new reader is registered.

export type StatDefinition = {
  readonly path: string;
  /** What measures it, in plain words, from the metric registry. */
  readonly measures?: string;
  /** What it changes in this game, as plain names of the systems that read it. */
  readonly readBy: readonly string[];
};

// The registry names readers by declaration (`packages/engine/src/macro.ts#nextEconomy`);
// a player reads the system, which is the module. A module a player never meets
// (the dataset validator) names nothing, and an engine module with no word of
// its own is the simulation at large.
const SYSTEM_WORDS: Readonly<Record<string, string>> = {
  bands: "how countries are sorted into groups",
  conditions: "the crises a country can fall into",
  "condition-onset": "the crises a country can fall into",
  macro: "how an economy grows or shrinks",
  governance: "the plans a government carries out",
  policy: "the plans a government carries out",
  "npc-agent": "what a government chooses to do abroad",
  "npc-turn": "how often a government acts",
  propensity: "what a government tends to try",
  instruments: "what your tools as president can do",
  "instruments-military": "what your tools as president can do",
  "instruments-economic": "what your tools as president can do",
  trade: "trade",
  "scenario-cast": "which decisions come to you",
  geography: "the map",
};

const SIMULATION = "the simulation";

const CONSUMERS = [...STAT_CONSUMERS, ...GEO_CONSUMERS, ...TRAIT_CONSUMERS];

function systemOf(site: string): string | undefined {
  const file = site.split("#")[0] ?? "";
  const module = (file.split("/").pop() ?? "").replace(/\.tsx?$/, "");
  return SYSTEM_WORDS[module] ?? (file.startsWith("packages/engine/src/") ? SIMULATION : undefined);
}

function readersOf(path: string): readonly string[] {
  const entry = CONSUMERS.find((consumer) => consumer.path === path);
  if (!entry || !("readBy" in entry)) return [];
  const systems = entry.readBy.map(systemOf).filter((word): word is string => word !== undefined);
  return [...new Set(systems)];
}

/** The definition of one stats path — `economy.growth`, `politics.regimeStability`. */
export function statDefinition(path: string): StatDefinition {
  const measures = metricFor(`stats.${path}`)?.description;
  return { path, readBy: readersOf(path), ...(measures ? { measures } : {}) };
}
