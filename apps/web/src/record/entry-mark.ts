import type { IconName } from "@admin/ui-web";

// The mark a Record entry is drawn with: the first subsystem it moved that
// has a glyph, so a column of entries reads as Congress, trade, the press,
// war, at a glance before a word of it is read.

const SYSTEM_MARKS: Readonly<Record<string, IconName>> = {
  intelligence: "intel",
  "covert-action": "instrumentCovert",
  press: "press",
  leak: "press",
  platform: "microphone",
  congress: "subjectCapitol",
  nominations: "appoint",
  cabinet: "appoint",
  institutions: "building",
  judiciary: "court",
  orders: "order",
  policy: "law",
  treaties: "sign",
  compacts: "sign",
  "war-powers": "conflict",
  "combatant-commands": "shield",
  alliances: "summit",
  relations: "instrumentDiplomatic",
  engagement: "summit",
  statecraft: "instrumentDiplomatic",
  economic: "instrumentEconomic",
  military: "instrumentMilitary",
  trade: "subjectTrade",
  markets: "graph",
  macro: "economyGrowth",
  fiscal: "budget",
  emergency: "eventEmergency",
  states: "mapPin",
  opinion: "ballot",
  "foreign-politics": "world",
  "world-events": "world",
  impacts: "info",
};

/** An entry's glyph: its first subsystem with one, else who acted. */
export function entryMark(systems: readonly string[], actor: "player" | "world" | string): IconName {
  for (const system of systems) {
    const mark = SYSTEM_MARKS[system];
    if (mark) return mark;
  }
  return actor === "player" ? "decision" : "world";
}
