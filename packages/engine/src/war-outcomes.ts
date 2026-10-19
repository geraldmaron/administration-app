import type { NationId } from "@admin/world";
import { relationshipKey, type Campaign, type Conflict, type ConflictSide } from "./state.js";
import type { Effect } from "./effect-types.js";
import { createGrudge } from "./relationships.js";
import { defeatSuccessionEffects } from "./foreign-politics.js";

// What a war leaves behind when it ends: standing, the grudges the loser
// keeps, and sometimes who governs the loser. The weekly tick decides that a
// war ends; this decides what the ending costs each side.
//
// Everything here derives from the ending itself. No draw decides what a
// victory is worth, so the same ending on the same board always leaves the
// same aftermath, and the only draw that can end a war stays the tick's own.

/** How a war ended, as far as its aftermath is concerned. */
export type SettlementOptions = {
  /** A collapse or a decisive offensive, as opposed to a side that ran out of will. */
  readonly decisive?: boolean;
};

// What the President's standing gains or loses when a war the country fought
// ends. A defeat costs more than a victory earns: the world remembers a great
// power that lost more readily than one that won.
const US_VICTORY_STANDING = 0.03;
const US_DEFEAT_STANDING = -0.05;
const US_DECISIVE_DEFEAT_STANDING = -0.08;

// A government's standing at home, on the legitimacy it governs with.
const VICTOR_LEGITIMACY = 0.04;
const LOSER_LEGITIMACY = -0.08;
const DECISIVE_LOSER_LEGITIMACY = -0.15;
const LOSER_STABILITY = -0.05;

// How heavily each ending is remembered, as a grudge's opening weight.
const DEFEAT_GRUDGE = 0.6;
const DECISIVE_DEFEAT_GRUDGE = 0.8;
const ARMISTICE_GRUDGE = 0.3;
const JOINER_GRUDGE = 0.3;
const DEFEAT_TRUST = -0.1;

type Sides = { readonly victor: ConflictSide; readonly loser: ConflictSide };

function sidesOf(conflict: Conflict): Sides | undefined {
  if (conflict.status === "aggressor-victory") return { victor: "aggressor", loser: "defender" };
  if (conflict.status === "defender-victory") return { victor: "defender", loser: "aggressor" };
  return undefined;
}

function principal(conflict: Conflict, side: ConflictSide): NationId {
  return side === "aggressor" ? conflict.aggressor : conflict.defender;
}

function membersOf(conflict: Conflict, side: ConflictSide): readonly NationId[] {
  return [principal(conflict, side), ...conflict.joined[side]];
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

/** The President's standing after a war the country fought ends, won or lost. An armistice moves nothing. */
function usStanding(campaign: Campaign, conflict: Conflict, sides: Sides | undefined, decisive: boolean): readonly Effect[] {
  if (!sides) return [];
  const us = campaign.founding.nation;
  if (membersOf(conflict, sides.victor).includes(us)) return [{ kind: "metric", deltas: { standing: US_VICTORY_STANDING } }];
  if (membersOf(conflict, sides.loser).includes(us)) {
    return [{ kind: "metric", deltas: { standing: decisive ? US_DECISIVE_DEFEAT_STANDING : US_DEFEAT_STANDING } }];
  }
  return [];
}

/** A principal's legitimacy at home after the war, written as absolutes against live stats. */
function homeStanding(campaign: Campaign, nation: NationId, legitimacy: number, stability: number): readonly Effect[] {
  const runtime = campaign.nations[nation];
  if (!runtime || nation === campaign.founding.nation) return [];
  const politics = runtime.stats.politics;
  return [
    {
      kind: "nationStat",
      nation,
      setStats: {
        politics: {
          legitimacy: clamp01(politics.legitimacy + legitimacy),
          regimeStability: clamp01(politics.regimeStability + stability),
        },
      },
    },
  ];
}

function principalStanding(campaign: Campaign, conflict: Conflict, sides: Sides | undefined, decisive: boolean): readonly Effect[] {
  if (!sides) return [];
  return [
    ...homeStanding(campaign, principal(conflict, sides.victor), VICTOR_LEGITIMACY, 0),
    ...homeStanding(campaign, principal(conflict, sides.loser), decisive ? DECISIVE_LOSER_LEGITIMACY : LOSER_LEGITIMACY, LOSER_STABILITY),
  ];
}

/** One grudge, from the government that remembers to the one it blames, only on an edge the graph holds. */
function grudge(campaign: Campaign, from: NationId, to: NationId, weight: number, cause: string, trust: number): readonly Effect[] {
  if (from === to || !campaign.relationships[relationshipKey(from, to)]) return [];
  const vengefulness = campaign.nations[from]?.traits.vengefulness ?? 0.5;
  return [
    {
      kind: "relationship",
      from,
      to,
      ...(trust !== 0 ? { deltas: { trust } } : {}),
      addGrudge: createGrudge(cause, weight, campaign.turn, vengefulness),
    },
  ];
}

/**
 * The grudges a war leaves. A loser remembers the victor, and more lightly
 * each government that came in against it; an armistice leaves both
 * principals bitter and neither beaten.
 */
function grudges(campaign: Campaign, conflict: Conflict, sides: Sides | undefined, decisive: boolean): readonly Effect[] {
  const cause = `war:${conflict.id}`;
  if (!sides) {
    return [
      ...grudge(campaign, conflict.aggressor, conflict.defender, ARMISTICE_GRUDGE, cause, 0),
      ...grudge(campaign, conflict.defender, conflict.aggressor, ARMISTICE_GRUDGE, cause, 0),
    ];
  }
  const loser = principal(conflict, sides.loser);
  const victor = principal(conflict, sides.victor);
  return [
    ...grudge(campaign, loser, victor, decisive ? DECISIVE_DEFEAT_GRUDGE : DEFEAT_GRUDGE, cause, DEFEAT_TRUST),
    ...conflict.joined[sides.victor].flatMap((joiner) => grudge(campaign, loser, joiner, JOINER_GRUDGE, cause, 0)),
  ];
}

/**
 * Who governs the loser after a decisive defeat: every effect the succession
 * rule's own packet files, the chair and the program with the seat, so one
 * rule with one owner decides it and nothing here re-reads its result.
 */
function succession(campaign: Campaign, conflict: Conflict, sides: Sides | undefined, decisive: boolean): readonly Effect[] {
  if (!sides || !decisive) return [];
  const loser = principal(conflict, sides.loser);
  if (loser === campaign.founding.nation) return [];
  return defeatSuccessionEffects(campaign, loser);
}

/**
 * The effects a war's settlement carries: the President's standing where the
 * country fought, each principal's legitimacy at home, the grudges on the
 * edges, and a new government for a loser beaten decisively. The settled war
 * itself stays on the board as the record of the armistice or the victory.
 */
export function settlementEffects(campaign: Campaign, conflict: Conflict, options: SettlementOptions = {}): readonly Effect[] {
  if (conflict.status === "active") return [];
  const sides = sidesOf(conflict);
  const decisive = options.decisive === true;
  return [
    ...usStanding(campaign, conflict, sides, decisive),
    ...principalStanding(campaign, conflict, sides, decisive),
    ...grudges(campaign, conflict, sides, decisive),
    ...succession(campaign, conflict, sides, decisive),
  ];
}

/**
 * The beats a war's ending and its long middle file. Plain and restrained: no
 * line celebrates a death, and none prints a casualty figure.
 */
export const OUTCOME_LINES = {
  armistice: "Both sides are spent; an armistice is signed.",
  withdrawal: "The aggressor can no longer sustain the war and withdraws.",
  collapse: "The defense collapses and terms are dictated.",
  decisiveOffensive: "A decisive offensive breaks the defense.",
  decisiveRepulse: "The invasion is thrown back decisively.",
  frozen: "The front goes quiet. Neither side is trying to move the line, and the war is not over.",
  heldArmistice: "A line that has held for months is written down as an armistice.",
  pastAYear: "The war has run past a year, and neither side is close to ending it.",
} as const;
