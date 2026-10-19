import type { NationId } from "@admin/world";
import {
  relationshipKey,
  selectActiveConflicts,
  selectNation,
  type Campaign,
  type Conflict,
  type ConflictSide,
  type NationRuntime,
} from "./state.js";
import { apply, type Effect, type EffectPacket } from "./effects.js";
import { createRngStreams, type RngStreams } from "./rng.js";
import { releaseWarCommitments } from "./commitments.js";
import { ministerFor } from "./stewardship.js";
import type { TurnPhase } from "./turn-loop.js";
import { forceProjectionCost } from "./geography.js";
import { stagingPoints } from "./staging.js";
import { sideCombatants } from "./war-forces.js";
import { sideOf } from "./conflicts.js";
import { liveNation, nameOf } from "./war-entry.js";
import { allyJoinEffects, joinDecisionPackets } from "./war-join.js";
import { alliancePackets } from "./peace.js";
import { OUTCOME_LINES, settlementEffects } from "./war-outcomes.js";
import { accumulateCasualties, civilianDeaths, warDeathTolls } from "./war-attrition.js";
import { munitionStrengthFactor } from "./munitions.js";
import { posturePressureFactor } from "./combatant-commands.js";
import { hullLossThisWeek, withHullDeaths } from "./hull-losses.js";

// The week a war is fought: who is stronger where the fighting is, what each
// side loses, who comes in, and when one side is spent. One packet per war.

// --- Strength ---

function nationsOnSide(campaign: Campaign, conflict: Conflict, side: ConflictSide): readonly NationRuntime[] {
  const principal = side === "aggressor" ? conflict.aggressor : conflict.defender;
  return [principal, ...conflict.joined[side]]
    .map((id) => selectNation(campaign, id))
    .filter((runtime): runtime is NationRuntime => runtime !== undefined);
}

/**
 * A defender fighting on its own ground fights better than it would anywhere
 * else: it knows the terrain, it is dug in and its supply lines are short.
 * Carried over from the earlier strength reading, which scored a defender at
 * its adjacent-conflict projection (force index × 1.2).
 */
const HOME_GROUND = 1.2;

/** What an aggressor pays to fight at the defender's distance, from the nearest place it can mount force. */
function projectionPenalty(campaign: Campaign, nation: NationId, defender: NationId): number {
  const own = selectNation(campaign, nation);
  const theater = selectNation(campaign, defender);
  if (!own || !theater) return 1;
  return forceProjectionCost(liveNation(own), liveNation(theater), stagingPoints(campaign, nation, defender)).multiplier;
}

/**
 * What a side brings to the front this week: each government's quality in the
 * field times the square root of the people it has there, so numbers count
 * with diminishing returns and a better force can beat a bigger one. Planning
 * shape: the lopsided wars in the record (the Gulf 1991, Iraq 2003) were won
 * against larger armies, and a war between large armies of like quality grinds.
 *
 * The aggressor fights on someone else's ground at the cost of getting there;
 * the defender fights at home. A side with its magazines drawn down brings less
 * of what it has.
 */
function sideStrength(campaign: Campaign, conflict: Conflict, side: ConflictSide): number {
  return sideCombatants(campaign, conflict, side).reduce((sum, combatant) => {
    const ground = side === "aggressor" ? 1 / projectionPenalty(campaign, combatant.nation, conflict.defender) : HOME_GROUND;
    return sum + combatant.quality * Math.sqrt(combatant.personnel) * ground * munitionStrengthFactor(campaign, combatant.nation);
  }, 0);
}

// The defense ministry is a real wartime variable, and an empty chair is a
// real wartime penalty: a competent, loyal minister converts the same forces
// into less attrition per week. Only the player's government is modeled by its
// minister, the same rule stewardship.ts applies to the odds — the player's
// cabinet must never price another nation's war. Every other government fights
// at its own doctrine, so two armies a doctrine band apart wear differently
// under the same week.
const VACANT_MINISTRY_COMMAND = 0.25;
const COMMAND_SWAY = 0.3;

export function commandQuality(campaign: Campaign, nation: NationId): number {
  if (nation !== campaign.founding.nation) return clamp01(selectNation(campaign, nation)?.stats.military.doctrineQuality ?? 0.5);
  const minister = ministerFor(campaign, "military");
  if (!minister) return VACANT_MINISTRY_COMMAND;
  // Loyalty matters less than competence but is not free: a minister who is
  // not the leader's carries out the war they would rather be fighting.
  return clamp01(minister.base.competence * 0.7 + minister.base.loyalty * 0.3);
}

function attritionMultiplier(campaign: Campaign, nation: NationId): number {
  return 1 - COMMAND_SWAY * (commandQuality(campaign, nation) - 0.5) * 2;
}

// --- The weekly tick ---

const EXHAUSTION_ENDS_WAR = 0.85;
const SUPPORT_ENDS_WAR = 0.15;
// A decisive edge: how lopsided the strength has to be, how hot the week, and
// how often such a week forces the issue. The record's shortest wars are wars
// like this, over inside a month or two.
//
// Three to one on the strength scale above. Both sides' readiness wears every
// fought week, the pressed side's faster, so a ratio drifts toward the side
// that is winning: India against Pakistan opens near 1.8 and peaks near 2.4
// once Pakistan's readiness is spent, and the United States' largest corps
// against Iran opens near 1.2 and cannot pass about 2.6. A sized corps against
// Iraq or Venezuela opens between 5 and 8. The line sits between the two, so a
// collapse against a clearly superior force is decisive and seats a successor,
// and a war between large armies is not decided by its own wear.
const DECISIVE_RATIO = 3;
const DECISIVE_CHANCE = 0.25;
const DECISIVE_INTENSITY = 0.5;

/**
 * How the war is actually going, above 1 for the aggressor.
 *
 * The weekly tick's own figure without the week's swing on it, exported because
 * anything that has to read whether a side is losing — a peace table, a screen —
 * must read the same strength the front is fought with rather than a second
 * opinion about who is winning.
 */
export function strengthRatio(campaign: Campaign, conflict: Conflict): number {
  return (sideStrength(campaign, conflict, "aggressor") + 0.05) / (sideStrength(campaign, conflict, "defender") + 0.05);
}

type SideOutcome = {
  readonly readinessLoss: number;
  readonly stabilityLoss: number;
  readonly reserveDrainRatio: number;
};

// `pressure` is how much of the week's weight this side is carrying: the side
// losing the exchange bleeds faster, but neither side fights for free.
function tickOutcome(pressure: number, intensity: number): SideOutcome {
  return {
    readinessLoss: intensity * (0.03 + 0.09 * pressure),
    stabilityLoss: intensity * (0.01 + 0.04 * pressure),
    reserveDrainRatio: intensity * (0.01 + 0.03 * pressure),
  };
}

function attritionEffects(
  campaign: Campaign,
  conflict: Conflict,
  side: ConflictSide,
  outcome: SideOutcome,
): Effect[] {
  return nationsOnSide(campaign, conflict, side).flatMap((runtime): Effect[] => {
    const nation = runtime.base.id;
    const command = attritionMultiplier(campaign, nation);
    const readinessLoss = outcome.readinessLoss * command;
    const stabilityLoss = outcome.stabilityLoss * command;
    const reserveDrain = outcome.reserveDrainRatio * command;
    const stats = runtime.stats;
    const effects: Effect[] = [
      {
        kind: "nationStat",
        nation,
        setStats: {
          military: { readiness: Math.max(0, stats.military.readiness - readinessLoss) },
          politics: { regimeStability: Math.max(0, stats.politics.regimeStability - stabilityLoss) },
          economy: { reserves: Math.max(0, stats.economy.reserves * (1 - reserveDrain)) },
        },
      },
    ];
    if (nation === campaign.founding.nation) {
      // The player's instrument panel moves with their own nation's war. No
      // readiness line: the attrition above already spends the force, and
      // `apply()` carries that onto the panel — repeating it here would take
      // the week's losses out of the establishment twice. No treasury line
      // either: the war's money is the deployment's weekly bill, priced from
      // the units sent and drawn on the same authority, and a share of the
      // authority on top would bill the same war twice.
      effects.push({ kind: "metric", deltas: { stability: -stabilityLoss } });
    }
    return effects;
  });
}

// The world's answer to aggression: third parties move against the attacker,
// and a repeat aggressor bleeds standing everywhere. The bully arc is priced
// here rather than authored.
function worldOpinionEffects(campaign: Campaign, conflict: Conflict): Effect[] {
  const effects: Effect[] = [];
  for (const id of Object.keys(campaign.nations)) {
    const nation = id as NationId;
    if (sideOf(conflict, nation) !== undefined) continue;
    if (!campaign.relationships[relationshipKey(nation, conflict.aggressor)]) continue;
    effects.push({
      kind: "relationship",
      from: nation,
      to: conflict.aggressor,
      deltas: { trust: -0.02 * (0.5 + conflict.intensity), militaryThreat: 0.02 },
    });
  }
  if (conflict.aggressor === campaign.founding.nation) {
    const priorWars = Object.values(campaign.conflicts).filter(
      (other) => other.aggressor === conflict.aggressor && other.id !== conflict.id,
    ).length;
    effects.push({ kind: "metric", deltas: { standing: -0.01 * (1 + priorWars) } });
  }
  return effects;
}

export function settle(conflict: Conflict, turn: number, status: Conflict["status"], description: string): Conflict {
  return {
    ...conflict,
    status,
    endedTurn: turn,
    intensity: 0,
    beats: [...conflict.beats, { turn, description }],
  };
}

/** A war's end, and whether it was forced (a collapse or a decisive blow) rather than a side giving up. */
type Ending = { readonly conflict: Conflict; readonly decisive: boolean };

function spentEnding(turn: number, conflict: Conflict, ratio: number): Ending | undefined {
  const aggressorSpent =
    conflict.exhaustion.aggressor >= EXHAUSTION_ENDS_WAR || conflict.warSupport.aggressor <= SUPPORT_ENDS_WAR;
  const defenderSpent =
    conflict.exhaustion.defender >= EXHAUSTION_ENDS_WAR || conflict.warSupport.defender <= SUPPORT_ENDS_WAR;
  if (aggressorSpent && defenderSpent) {
    return { conflict: settle(conflict, turn, "settled", OUTCOME_LINES.armistice), decisive: false };
  }
  if (aggressorSpent) {
    return { conflict: settle(conflict, turn, "defender-victory", OUTCOME_LINES.withdrawal), decisive: ratio <= 1 / DECISIVE_RATIO };
  }
  if (defenderSpent) {
    return { conflict: settle(conflict, turn, "aggressor-victory", OUTCOME_LINES.collapse), decisive: ratio >= DECISIVE_RATIO };
  }
  return undefined;
}

/** The support a war opens with. A defense of home ground starts better supported than a war of choice. */
export const OPENING_WAR_SUPPORT: Readonly<Record<ConflictSide, number>> = { aggressor: 0.7, defender: 0.85 };

// Below this a front is being held rather than fought: a line neither side is
// trying to move, the kind of war that freezes rather than ends. What a held
// front gives back each week is small on purpose, because a war that cools and
// rebuilds its public for a season can be fought again, and should cost that.
// A held front stays held: its tempo drifts below the line and never climbs
// back over it on its own, so only an act — a strike, an escalation — puts the
// war back in motion.
export const HELD_FRONT_INTENSITY = 0.2;
const HELD_SUPPORT_RECOVERY = 0.015;
const HELD_EXHAUSTION_RECOVERY = 0.01;
const HELD_DRIFT = 0.04;
const HELD_CEILING = HELD_FRONT_INTENSITY - 0.01;

// A held front that has rested can be written down: both sides back to the
// support they opened with and nearly rested. Once there, each week has this
// chance of becoming a signed armistice. The wait for rest is what keeps a war
// that has only just frozen from ending the same season, and it is why a
// frozen front is the long tail of the durations.
const ARMISTICE_READY_EXHAUSTION = 0.1;
const HELD_ARMISTICE_CHANCE = 0.04;

// The wear of a fought week, before who is carrying it: a base every week of
// fighting costs, and more the hotter the front. Set so evenly matched sides
// wear for about four months before one gives or the front freezes, near the
// record's median for interstate wars.
const WEAR_BASE = 0.015;
const WEAR_PER_INTENSITY = 0.04;

// Two tired armies stop pushing: each week the front cools by this much of the
// fresher side's exhaustion. It is what turns a stalemate into a held line
// instead of a war that runs hot until one side breaks.
const FRONT_COOLING = 0.1;

function readyForArmistice(conflict: Conflict): boolean {
  return (
    conflict.intensity < HELD_FRONT_INTENSITY &&
    conflict.exhaustion.aggressor <= ARMISTICE_READY_EXHAUSTION &&
    conflict.exhaustion.defender <= ARMISTICE_READY_EXHAUSTION &&
    conflict.warSupport.aggressor >= OPENING_WAR_SUPPORT.aggressor &&
    conflict.warSupport.defender >= OPENING_WAR_SUPPORT.defender
  );
}

function terminalState(turn: number, conflict: Conflict, ratio: number, roll: number): Ending | undefined {
  const spent = spentEnding(turn, conflict, ratio);
  if (spent) return spent;
  if (readyForArmistice(conflict)) {
    return roll < HELD_ARMISTICE_CHANCE ? { conflict: settle(conflict, turn, "settled", OUTCOME_LINES.heldArmistice), decisive: false } : undefined;
  }
  // A decisive edge can force the issue early — but only can.
  if (conflict.intensity >= DECISIVE_INTENSITY && roll < DECISIVE_CHANCE) {
    if (ratio >= DECISIVE_RATIO) {
      return { conflict: settle(conflict, turn, "aggressor-victory", OUTCOME_LINES.decisiveOffensive), decisive: true };
    }
    if (ratio <= 1 / DECISIVE_RATIO) {
      return { conflict: settle(conflict, turn, "defender-victory", OUTCOME_LINES.decisiveRepulse), decisive: true };
    }
  }
  return undefined;
}

type FrontWeek = Pick<Conflict, "exhaustion" | "warSupport">;

/** A fought week: both sides wear, the side carrying more of the week wears faster, and better command wears slower. */
function wornFront(campaign: Campaign, conflict: Conflict, aggressorPressure: number, defenderPressure: number): FrontWeek {
  const wear = WEAR_BASE + conflict.intensity * WEAR_PER_INTENSITY;
  const command = (side: ConflictSide) => attritionMultiplier(campaign, side === "aggressor" ? conflict.aggressor : conflict.defender);
  return {
    exhaustion: {
      aggressor: clamp01(conflict.exhaustion.aggressor + wear * (0.6 + aggressorPressure) * command("aggressor")),
      defender: clamp01(conflict.exhaustion.defender + wear * (0.6 + defenderPressure) * command("defender")),
    },
    // A war of choice loses its public faster than a defense does.
    warSupport: {
      aggressor: clamp01(conflict.warSupport.aggressor - wear * (0.4 + aggressorPressure)),
      defender: clamp01(conflict.warSupport.defender - wear * (0.2 + defenderPressure * 0.8)),
    },
  };
}

/**
 * A held week: the forces rest and the public's patience rebuilds, toward the
 * level the war opened with and never past it. The bound is the point: a front
 * cooled on purpose may recover what it spent, and it may not become a way to
 * manufacture more support than the war ever had.
 */
function heldFront(conflict: Conflict): FrontWeek {
  const rebuilt = (current: number, prior: number) => (current >= prior ? current : Math.min(prior, current + HELD_SUPPORT_RECOVERY));
  return {
    exhaustion: {
      aggressor: Math.max(0, conflict.exhaustion.aggressor - HELD_EXHAUSTION_RECOVERY),
      defender: Math.max(0, conflict.exhaustion.defender - HELD_EXHAUSTION_RECOVERY),
    },
    warSupport: {
      aggressor: rebuilt(conflict.warSupport.aggressor, OPENING_WAR_SUPPORT.aggressor),
      defender: rebuilt(conflict.warSupport.defender, OPENING_WAR_SUPPORT.defender),
    },
  };
}

/** Next week's tempo: a fought front moves on the draw and cools as both sides tire; a held one stays under the line. */
function nextIntensity(conflict: Conflict, draw: number): number {
  if (conflict.intensity < HELD_FRONT_INTENSITY) {
    return Math.max(0, Math.min(HELD_CEILING, conflict.intensity + (draw - 0.5) * HELD_DRIFT));
  }
  const cooling = FRONT_COOLING * Math.min(conflict.exhaustion.aggressor, conflict.exhaustion.defender);
  return clamp01(conflict.intensity + (draw - 0.45) * 0.2 - cooling);
}

/**
 * The week's weight on each side after the theater's posture: where the
 * United States fights, its command's posture takes up to a tenth of the
 * American side's share off it, and the other side carries the rest.
 */
function posturedPressure(campaign: Campaign, conflict: Conflict, aggressorShare: number): Readonly<Record<ConflictSide, number>> {
  const usSide = sideOf(conflict, campaign.founding.nation);
  if (!usSide) return { aggressor: aggressorShare, defender: 1 - aggressorShare };
  const factor = posturePressureFactor(campaign, conflict.defender);
  const us = (usSide === "aggressor" ? aggressorShare : 1 - aggressorShare) * factor;
  return usSide === "aggressor" ? { aggressor: us, defender: 1 - us } : { aggressor: 1 - us, defender: us };
}

/**
 * The week's weight on each side from the strength ratio alone, before the
 * week's swing: what the week's losses are computed on, so they are derived
 * rather than drawn.
 */
export function derivedPressure(campaign: Campaign, conflict: Conflict): Readonly<Record<ConflictSide, number>> {
  return posturedPressure(campaign, conflict, clamp01(1 / (1 + strengthRatio(campaign, conflict))));
}

/** The beats the week adds beyond the joins: a front that has just frozen, and a war that has just run a year. */
function weekBeats(campaign: Campaign, before: Conflict, intensity: number): readonly string[] {
  const froze = before.intensity >= HELD_FRONT_INTENSITY && intensity < HELD_FRONT_INTENSITY;
  const year = before.inherited === undefined && campaign.turn - before.startedTurn === 52;
  return [...(froze ? [OUTCOME_LINES.frozen] : []), ...(year ? [OUTCOME_LINES.pastAYear] : [])];
}

type TickResult = { readonly conflict: Conflict; readonly effects: Effect[]; readonly decisive: boolean };

// One conflict, one week. Pure with respect to its draws: everything comes
// from the seeded stream keyed by (conflict, turn), drawn in the same order
// every week — the swing, the tempo, the terminal roll — so no draw is
// re-keyed by anything added around them.
function tickConflict(campaign: Campaign, conflict: Conflict, streams: RngStreams): TickResult {
  const stream = streams.stream("conflict", conflict.id, campaign.turn);
  const ratio = strengthRatio(campaign, conflict);
  // Variance is the whole point: strength shifts the week, it does not decide
  // it. A superpower can lose a war it cannot supply.
  const swing = (stream.next() - 0.5) * 0.6;
  const pressure = posturedPressure(campaign, conflict, clamp01(1 / (1 + ratio) + swing));

  const derived = derivedPressure(campaign, conflict);
  const join = allyJoinEffects(campaign, conflict, streams);
  const hulls = hullLossThisWeek(campaign, conflict, streams);
  const effects: Effect[] = [
    ...attritionEffects(campaign, conflict, "aggressor", tickOutcome(pressure.aggressor, conflict.intensity)),
    ...attritionEffects(campaign, conflict, "defender", tickOutcome(pressure.defender, conflict.intensity)),
    ...join.effects,
    ...worldOpinionEffects(campaign, conflict),
    ...warDeathTolls(campaign, conflict, derived),
    ...hulls.effects,
  ];

  const held = conflict.intensity < HELD_FRONT_INTENSITY;
  const front = held ? heldFront(conflict) : wornFront(campaign, conflict, pressure.aggressor, pressure.defender);
  const intensity = nextIntensity(conflict, stream.next());
  const beats = [...join.beats, ...weekBeats(campaign, conflict, intensity)];
  const fought: Conflict = {
    ...conflict,
    joined: {
      aggressor: [...conflict.joined.aggressor, ...join.joined.aggressor],
      defender: [...conflict.joined.defender, ...join.joined.defender],
    },
    intensity,
    ...front,
    casualties: withHullDeaths(accumulateCasualties(campaign, conflict, derived), hulls),
    civilianDeaths: (conflict.civilianDeaths ?? 0) + civilianDeaths(campaign, conflict, derived),
    beats: [...conflict.beats, ...beats.map((description) => ({ turn: campaign.turn, description }))],
  };

  const ending = terminalState(campaign.turn, fought, ratio, stream.next());
  return { conflict: ending?.conflict ?? fought, effects, decisive: ending?.decisive ?? false };
}

function narrate(campaign: Campaign, after: Conflict, before: Conflict): string {
  if (after.status !== "active") return after.beats[after.beats.length - 1]!.description;
  const parties = `${nameOf(campaign, after.aggressor)} and ${nameOf(campaign, after.defender)}`;
  if (after.intensity < HELD_FRONT_INTENSITY) return `The front between ${parties} holds.`;
  return after.intensity > before.intensity
    ? `The war between ${parties} intensifies.`
    : `The war between ${parties} grinds on.`;
}

type ConflictWeek = { readonly packet: EffectPacket; readonly ending?: { readonly conflict: Conflict; readonly decisive: boolean; readonly summary: string } };

function conflictWeek(campaign: Campaign, conflict: Conflict, streams: RngStreams): ConflictWeek {
  const tick = tickConflict(campaign, conflict, streams);
  const summary = narrate(campaign, tick.conflict, conflict);
  const packet: EffectPacket = {
    source: "simulate",
    actor: "world",
    turn: campaign.turn,
    narration: { summary },
    effects: [
      ...tick.effects,
      { kind: "conflict", set: tick.conflict },
      {
        kind: "feed",
        items: [
          {
            // The turn loop stamps a phase's packets with the turn they open,
            // so a feed item written here carries the turn its ledger entry will.
            turn: campaign.turn + 1,
            kind: "conflict",
            visibility: "public",
            headline: summary,
            actor: tick.conflict.aggressor,
            target: tick.conflict.defender,
          },
        ],
      },
    ],
  };
  return tick.conflict.status === "active" ? { packet } : { packet, ending: { conflict: tick.conflict, decisive: tick.decisive, summary } };
}

/**
 * What a war that ended this week leaves, read off the board after its last
 * week was fought. Two reasons it cannot share that week's packet: the
 * settlement writes each principal's standing as absolutes, which read against
 * the pre-week stats would erase the last week's attrition, and a government
 * that came in during the last week holds a commitment the pre-week board has
 * never seen, which would then stay deployed to a war that is over.
 *
 * A war that ends by attrition ends the promises made to fight it, the same
 * way one ended at a table does. Won or lost makes no difference to this: the
 * front is gone either way, and a sustainment line billing the treasury for a
 * theater nobody is in is the same defect in both directions.
 */
export function aftermathPacket(settled: Campaign, conflict: Conflict, decisive: boolean, summary: string): EffectPacket {
  return {
    source: "simulate",
    actor: "world",
    turn: settled.turn,
    narration: { summary },
    effects: [
      ...releaseWarCommitments(settled, conflict.id, [conflict.aggressor, conflict.defender], summary),
      ...settlementEffects(settled, conflict, { decisive }),
    ],
  };
}

/**
 * The turn phase: one packet per active war, so the ledger explains each war's
 * week on its own line. Each packet is applied before the next war is computed
 * — two wars sharing a belligerent must both bite it, and attrition is written
 * as absolute stats, so a stale snapshot would let the second overwrite the first.
 */
export const conflictPhase: TurnPhase = (state) => {
  const streams = createRngStreams(state.seed);
  const packets: EffectPacket[] = [];
  let working = state;
  for (const active of selectActiveConflicts(state)) {
    // The table first: a war two governments end this week is not fought, and
    // a government that goes home this week does not fight in it.
    for (const peace of alliancePackets(working, working.conflicts[active.id] ?? active, streams)) {
      packets.push(peace);
      working = apply(working, peace);
    }
    const conflict = working.conflicts[active.id];
    if (!conflict || conflict.status !== "active") continue;
    // The reasons for this week's joins, read off the board the week is fought on.
    const decisions = joinDecisionPackets(working, conflict, streams);
    const week = conflictWeek(working, conflict, streams);
    packets.push(week.packet);
    working = apply(working, week.packet);
    if (week.ending) {
      const aftermath = aftermathPacket(working, week.ending.conflict, week.ending.decisive, week.ending.summary);
      packets.push(aftermath);
      working = apply(working, aftermath);
    }
    for (const next of decisions) {
      packets.push(next);
      working = apply(working, next);
    }
  }
  return packets;
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
