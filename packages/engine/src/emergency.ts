import type { StateId } from "@admin/world";
import type { Campaign, ConditionKind, NationCondition } from "./state.js";
import { selectActiveConflicts } from "./state.js";
import type { DeclaredEmergency, EmergencyScope } from "./state-emergency.js";
import type { Effect, EffectPacket } from "./effects.js";
import type { TurnPhase } from "./turn-loop.js";
import { hazardLabel, hazardNoun } from "./condition-impacts.js";

// A declared emergency: the act that opens the heaviest instruments in the
// game, replacing the ambient boolean that used to open them for free.
//
// `inEmergency` returned true whenever any condition was running anywhere in
// the country, so a wildfire in one city silently conferred the power to
// suspend habeas corpus. There was no declaration to make, no scope to hold it
// in, no cost to carry, and nothing to give back. Everything here exists to
// make crossing that threshold an act with a date on it.

/**
 * Weeks a declaration stands before it lapses unrenewed.
 *
 * A term is 208 turns and this is 52, so a full term holds at most four
 * renewals: four public moments of choosing not to give the power back. That is
 * the mechanic. Declaring is cheap and popular; what costs is staying declared.
 */
export const EMERGENCY_RENEWAL_TURNS = 52;

/** Standing charged per week a declaration stands, before the compounding below. */
export const EMERGENCY_WEEKLY_STANDING_COST = 0.0015;

/**
 * How much the weekly cost grows per additional week the declaration stands.
 *
 * Compounding is the whole design. A flat rent would make a standing emergency
 * a fixed line item a player stops reading; a rising one means the question
 * "when do I end this" gets louder the longer it goes unanswered.
 */
export const EMERGENCY_COST_COMPOUNDING = 0.02;

export function emergencyId(scope: EmergencyScope, cause: DeclaredEmergency["cause"], turn: number): string {
  const where = scope.kind === "nation" ? "nation" : (scope.state as string);
  return `emergency:${where}:${cause}:${turn}`;
}

export function emergencyCauseLabel(cause: DeclaredEmergency["cause"]): string {
  return cause === "armed-conflict" ? "Armed conflict" : hazardLabel(cause);
}

function emergencyCauseNoun(cause: DeclaredEmergency["cause"]): string {
  return cause === "armed-conflict" ? "armed conflict" : hazardNoun(cause);
}

export function isStanding(emergency: DeclaredEmergency): boolean {
  return emergency.endedTurn === undefined;
}

/** Every declaration still in force this week. */
export function selectDeclaredEmergencies(campaign: Campaign): readonly DeclaredEmergency[] {
  return Object.values(campaign.emergencies).filter(isStanding);
}

/**
 * Weeks before the anniversary in which the continuation may be published.
 *
 * Ninety days, in the weeks this game runs on. The notice is a public act with
 * a season on it rather than a switch: a president cannot quietly reset the
 * clock the week after declaring, so the choice to keep the power arrives on a
 * date the country can see coming.
 */
export const EMERGENCY_NOTICE_TURNS = 13;

/** Whether a declaration has gone past its renewal window and lapsed. */
export function hasLapsed(emergency: DeclaredEmergency, turn: number): boolean {
  return turn - emergency.renewedTurn >= EMERGENCY_RENEWAL_TURNS;
}

/** Weeks until this declaration lapses unrenewed. Negative once it has. */
export function weeksToLapse(emergency: DeclaredEmergency, turn: number): number {
  return emergency.renewedTurn + EMERGENCY_RENEWAL_TURNS - turn;
}

/** Whether the continuation notice is open this week. */
export function renewalIsOpen(emergency: DeclaredEmergency, turn: number): boolean {
  return weeksToLapse(emergency, turn) <= EMERGENCY_NOTICE_TURNS;
}

/**
 * Whether a declaration authorizes an act against this state.
 *
 * A national declaration reaches everywhere; a state declaration reaches its
 * own state and nowhere else. Asked with no state, the question is whether any
 * declaration is in force at all.
 */
export function authorizes(emergency: DeclaredEmergency, state?: StateId): boolean {
  if (emergency.scope.kind === "nation") return true;
  return state !== undefined && emergency.scope.state === state;
}

/**
 * The replacement for the ambient `inEmergency`.
 *
 * Takes an optional state so an order aimed at one place cannot be authorized
 * by a declaration covering a different one.
 */
export function underDeclaredEmergency(campaign: Campaign, state?: StateId): boolean {
  return selectDeclaredEmergencies(campaign).some(
    (emergency) => !hasLapsed(emergency, campaign.turn) && authorizes(emergency, state),
  );
}

export type DeclarationRefusal = { readonly ok: false; readonly reason: string };
/**
 * A packet rather than loose effects, for the same reason every other act the
 * president can take hands one back: `apply()` is the one write path onto the
 * ledger, and a caller assembling its own narration would be a second account
 * of what the administration did.
 */
export type DeclarationResult = { readonly ok: true; readonly packet: EffectPacket } | DeclarationRefusal;

/** Where a declaration reaches, in the words the ledger and the room both use. */
function whereOf(scope: EmergencyScope, campaign: Campaign): string {
  if (scope.kind === "nation") return "the United States";
  return campaign.states[scope.state]?.base.name ?? (scope.state as string);
}

function declarationPacket(
  campaign: Campaign,
  scope: EmergencyScope,
  summary: string,
  effects: readonly Effect[],
): EffectPacket {
  return {
    source: "action",
    actor: "player",
    turn: campaign.turn,
    provenance: {
      origin: "decision",
      systems: ["emergency"],
      ...(scope.kind === "state" ? { locales: [scope.state as string] } : {}),
    },
    narration: { summary },
    effects,
  };
}

/**
 * Declare an emergency over a condition that is actually running.
 *
 * Refuses without a cause on the ground. A president who could declare an
 * emergency over nothing would have the ambient boolean back with an extra
 * button in front of it.
 */
export function declareEmergency(
  campaign: Campaign,
  scope: EmergencyScope,
  cause: ConditionKind,
  armedForcesConflictId?: string,
): DeclarationResult {
  const live = liveCauses(campaign, scope);
  if (!live.some((condition) => condition.kind === cause)) {
    return { ok: false, reason: "no emergency of that kind is running where this would reach" };
  }
  if (underDeclaredEmergency(campaign, scope.kind === "state" ? scope.state : undefined)) {
    return { ok: false, reason: "an emergency is already declared here" };
  }
  if (armedForcesConflictId && (scope.kind !== "nation" || !selectActiveConflicts(campaign).some((conflict) =>
    conflict.id === armedForcesConflictId &&
    (conflict.aggressor === campaign.founding.nation || conflict.defender === campaign.founding.nation)))) {
    return { ok: false, reason: "no active conflict involving the United States supports an armed-forces finding" };
  }
  const where = whereOf(scope, campaign);
  const emergency: DeclaredEmergency = {
    id: emergencyId(scope, cause, campaign.turn),
    scope,
    cause,
    declaredTurn: campaign.turn,
    renewedTurn: campaign.turn,
    reason: `A state of emergency was declared over ${hazardNoun(cause)} in ${where}.`,
    ...(armedForcesConflictId ? { armedForcesConflictId } : {}),
  };
  return {
    ok: true,
    packet: declarationPacket(campaign, scope, emergency.reason, [{ kind: "emergency", set: emergency }]),
  };
}

/** The national declaration names the active conflict whose defense requires armed forces. */
export function declareArmedForcesEmergency(campaign: Campaign, conflictId: string): DeclarationResult {
  const player = campaign.founding.nation;
  const conflict = selectActiveConflicts(campaign).find((entry) => entry.id === conflictId &&
    (entry.aggressor === player || entry.defender === player));
  if (!conflict) return { ok: false, reason: "no active conflict involving the United States requires armed forces" };
  if (selectDeclaredEmergencies(campaign).some((record) => record.cause === "armed-conflict" &&
    record.armedForcesConflictId === conflictId && !hasLapsed(record, campaign.turn))) {
    return { ok: false, reason: "an armed-forces emergency over this conflict already stands" };
  }
  const scope: EmergencyScope = { kind: "nation" };
  const emergency: DeclaredEmergency = { id: emergencyId(scope, "armed-conflict", campaign.turn), scope,
    cause: "armed-conflict", armedForcesConflictId: conflictId, declaredTurn: campaign.turn,
    renewedTurn: campaign.turn, reason: "A national emergency was declared over an armed conflict requiring the armed forces." };
  return { ok: true, packet: declarationPacket(campaign, scope, emergency.reason, [{ kind: "emergency", set: emergency }]) };
}

/** End a declaration the president is holding. The act of giving the power back. */
export function endEmergency(campaign: Campaign, id: string): DeclarationResult {
  const emergency = campaign.emergencies[id];
  if (!emergency || !isStanding(emergency)) {
    return { ok: false, reason: "no emergency by that name is in force" };
  }
  return {
    ok: true,
    packet: declarationPacket(
      campaign,
      emergency.scope,
      `The state of emergency over ${emergencyCauseNoun(emergency.cause)} in ${whereOf(emergency.scope, campaign)} is ended, and the powers it carried go back.`,
      [{ kind: "emergency", set: { ...emergency, endedTurn: campaign.turn } }],
    ),
  };
}

/**
 * Renew a declaration that would otherwise lapse.
 *
 * The anniversary continuation: the power does not carry itself, and choosing
 * to keep it is a notice published in public rather than a silence.
 */
export function renewEmergency(campaign: Campaign, id: string): DeclarationResult {
  const emergency = campaign.emergencies[id];
  if (!emergency || !isStanding(emergency)) {
    return { ok: false, reason: "no emergency by that name is in force" };
  }
  if (!renewalIsOpen(emergency, campaign.turn)) {
    const weeks = weeksToLapse(emergency, campaign.turn) - EMERGENCY_NOTICE_TURNS;
    return {
      ok: false,
      reason: `the continuation is published in the ninety days before the anniversary, which is ${weeks} ${weeks === 1 ? "week" : "weeks"} away`,
    };
  }
  return {
    ok: true,
    packet: declarationPacket(
      campaign,
      emergency.scope,
      `The state of emergency over ${emergencyCauseNoun(emergency.cause)} in ${whereOf(emergency.scope, campaign)} is continued for another year.`,
      [{ kind: "emergency", set: { ...emergency, renewedTurn: campaign.turn } }],
    ),
  };
}

/** Conditions a declaration of this scope could honestly be declared over. */
export function liveCauses(campaign: Campaign, scope: EmergencyScope): readonly NationCondition[] {
  return Object.values(campaign.conditions).filter((condition) => {
    if (condition.status !== "active") return false;
    if (condition.nation !== campaign.founding.nation) return false;
    if (scope.kind === "nation") return true;
    return condition.state === scope.state;
  });
}

/**
 * What one standing declaration costs the administration this week.
 *
 * Rises with the weeks it has stood, so an emergency nobody ends becomes the
 * loudest line on the ledger rather than a rounding error.
 */
export function weeklyStandingCost(emergency: DeclaredEmergency, turn: number): number {
  const weeks = Math.max(0, turn - emergency.declaredTurn);
  return EMERGENCY_WEEKLY_STANDING_COST * (1 + weeks * EMERGENCY_COST_COMPOUNDING);
}

/**
 * The weekly price of every standing declaration, and the lapse of any that
 * went unrenewed.
 *
 * This is where the design lives. Declaring is cheap and popular; the cost is
 * carried by the weeks afterward, rising as they accumulate, so a president who
 * declares an emergency and never ends it is paying more for it every week and
 * can see the number. A declaration past its renewal window lapses on its own —
 * the power is not held by inertia.
 */
export const emergencyPhase: TurnPhase = (state) => {
  const standing = selectDeclaredEmergencies(state);
  if (standing.length === 0) return [];

  const packets: EffectPacket[] = [];
  for (const emergency of standing) {
    if (hasLapsed(emergency, state.turn)) {
      packets.push({
        source: "simulate",
        actor: "world",
        turn: state.turn,
        narration: { summary: `${emergency.reason.replace(/\.$/, "")} — lapsed, unrenewed.` },
        effects: [{ kind: "emergency", set: { ...emergency, endedTurn: state.turn } }],
      });
      continue;
    }
    const cost = weeklyStandingCost(emergency, state.turn);
    packets.push({
      source: "simulate",
      actor: "world",
      turn: state.turn,
      narration: { summary: "The emergency powers still stand." },
      effects: [{ kind: "metric", deltas: { standing: -cost } }],
    });
  }
  return packets;
};
