import { formatDate, type ReadingMove, type TimelineRow } from "@admin/player-core";
import type { IconName } from "@admin/ui";
import type { EntryMove, EntryRowView, EntryTone } from "@admin/ui/record";

// How a Record entry is drawn: its mark (the first subsystem it moved that
// has a glyph, so a column reads as Congress, trade, the press, war, before
// a word is read), whose act it was, and the readings it moved.

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

/** Marks that mean force read red, whoever acted. */
const FORCE: ReadonlySet<IconName> = new Set(["conflict", "shield", "instrumentMilitary", "instrumentCovert"]);

/** The institution whose emblem stands for a subsystem, where one body plainly owns it. */
const SYSTEM_SEALS: Readonly<Record<string, { readonly id: string; readonly name: string }>> = {
  congress: { id: "INST-CONGRESS", name: "Congress" },
  treaties: { id: "INST-STATE", name: "Department of State" },
  judiciary: { id: "INST-JUDICIARY", name: "The federal judiciary" },
  intelligence: { id: "INST-ODNI", name: "Director of National Intelligence" },
  "covert-action": { id: "INST-CIA", name: "Central Intelligence Agency" },
  "war-powers": { id: "INST-DOD", name: "Department of Defense" },
  "combatant-commands": { id: "INST-JCS", name: "Joint Chiefs of Staff" },
  military: { id: "INST-DOD", name: "Department of Defense" },
  relations: { id: "INST-STATE", name: "Department of State" },
  statecraft: { id: "INST-STATE", name: "Department of State" },
  trade: { id: "INST-USTR", name: "Trade Representative" },
  fiscal: { id: "INST-OMB", name: "Office of Management and Budget" },
  emergency: { id: "INST-FEMA", name: "FEMA" },
  orders: { id: "SEAL-WHITE-HOUSE", name: "The White House" },
};

export function entryMark(systems: readonly string[], actor: string): IconName {
  for (const system of systems) {
    const mark = SYSTEM_MARKS[system];
    if (mark) return mark;
  }
  return actor === "player" ? "decision" : "world";
}

export function entryTone(mark: IconName, actor: string): EntryTone {
  if (FORCE.has(mark)) return "red";
  return actor === "player" ? "gold" : "blue";
}

/** The institutions an entry's subsystems belong to, each once. */
export function entryInstitutions(systems: readonly string[]): readonly { readonly id: string; readonly name: string }[] {
  const found = systems.flatMap((system) => (SYSTEM_SEALS[system] ? [SYSTEM_SEALS[system]] : []));
  return found.filter((body, i) => found.findIndex((other) => other.id === body.id) === i);
}

/** Whether a reading's move helps the President: every reading the Record moves is better higher. */
export function moveOf(move: ReadingMove): EntryMove {
  return { key: move.key, label: move.label, text: move.text, up: move.delta > 0, good: move.delta > 0 };
}

const SHOWN = 2;

export function entryView(row: TimelineRow): EntryRowView {
  const mark = entryMark(row.systems, row.actor);
  return {
    id: row.id,
    mark,
    tone: entryTone(mark, row.actor),
    date: formatDate(row.date),
    actor: row.actorWord,
    ...(row.subject ? { place: row.subject.label } : {}),
    headline: row.headline,
    moves: row.moves.slice(0, SHOWN).map(moveOf),
    more: Math.max(0, row.moves.length - SHOWN),
  };
}
