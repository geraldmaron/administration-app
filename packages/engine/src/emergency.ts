import type { StateId } from "@admin/world";
import type { Campaign, ConditionKind, NationCondition } from "./state.js";
import { selectActiveConflicts } from "./state.js";
import type { AuthorityClock, DeclaredEmergency, EmergencyScope } from "./state-emergency.js";
import type { Effect, EffectPacket } from "./effects.js";
import type { TurnPhase } from "./turn-loop.js";
import { addDays, compareDates, daysBetween, selectDateOfTurn } from "./clock.js";
import { lawConstraints } from "./legislation.js";
import { elapsedDays } from "./pace.js";
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

// A later proclamation in the same office week must not replace a bill's target.
function nextDeclarationId(campaign: Campaign, scope: EmergencyScope, cause: DeclaredEmergency["cause"]): string {
  const base = emergencyId(scope, cause, campaign.turn);
  if (!campaign.emergencies[base]) return base;
  let ordinal = 2;
  while (campaign.emergencies[`${base}:${ordinal}`]) ordinal += 1;
  return `${base}:${ordinal}`;
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

// Readings are projected, never written back onto the declaration record.
export type EmergencyReading = DeclaredEmergency & {
  readonly clockReading: { readonly turn: number; readonly daysLeft: number; readonly presidentialRenewal: boolean };
};

export function selectDeclaredEmergencies(campaign: Campaign): readonly EmergencyReading[] {
  return Object.values(campaign.emergencies).filter((record) => isStanding(record) && !hasLapsed(record, campaign.turn, campaign))
    .sort((a, b) => a.id.localeCompare(b.id)).map((record) => {
      const clock = emergencyAuthorityClock(campaign, record);
      const deadline = authorityDeadline(campaign, clock);
      return { ...record, clockReading: { turn: campaign.turn,
        daysLeft: daysBetween(record.authorityClockId ? campaign.calendar : legacyEmergencyDate(campaign), deadline),
        presidentialRenewal: compareDates(deadline, clock.expiresDate) === 0 } };
    });
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
export function hasLapsed(emergency: DeclaredEmergency | EmergencyReading, turn: number, campaign?: Campaign): boolean {
  if (!campaign) return weeksToLapse(emergency, turn) <= 0;
  const clock = emergencyAuthorityClock(campaign, emergency);
  const now = emergency.authorityClockId ? campaign.calendar : legacyEmergencyDate(campaign);
  return authorityHasExpired(campaign, clock, now);
}

/** Weeks until this declaration lapses unrenewed. Negative once it has. */
export function weeksToLapse(emergency: DeclaredEmergency | EmergencyReading, turn: number): number {
  if ("clockReading" in emergency) return emergency.clockReading.daysLeft / elapsedDays(1) - (turn - emergency.clockReading.turn);
  return emergency.renewedTurn + EMERGENCY_RENEWAL_TURNS - turn;
}

/** Whether the continuation notice is open this week. */
export function renewalIsOpen(emergency: DeclaredEmergency | EmergencyReading, turn: number): boolean {
  const left = weeksToLapse(emergency, turn);
  return left > 0 && ("clockReading" in emergency ? emergency.clockReading.presidentialRenewal && elapsedDays(left) <= 90 : left <= EMERGENCY_NOTICE_TURNS);
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
    (emergency) => !hasLapsed(emergency, campaign.turn, campaign) && authorizes(emergency, state),
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
    id: nextDeclarationId(campaign, scope, cause),
    scope,
    cause,
    declaredTurn: campaign.turn,
    renewedTurn: campaign.turn,
    reason: `A state of emergency was declared over ${hazardNoun(cause)} in ${where}.`,
    ...(armedForcesConflictId ? { armedForcesConflictId } : {}),
  };
  return declareOnClock(campaign, emergency, live.filter((condition) => condition.kind === cause).map((condition) => condition.id));
}

/** The national declaration names the active conflict whose defense requires armed forces. */
export function declareArmedForcesEmergency(campaign: Campaign, conflictId: string): DeclarationResult {
  const player = campaign.founding.nation;
  const conflict = selectActiveConflicts(campaign).find((entry) => entry.id === conflictId &&
    (entry.aggressor === player || entry.defender === player));
  if (!conflict) return { ok: false, reason: "no active conflict involving the United States requires armed forces" };
  if (selectDeclaredEmergencies(campaign).some((record) => record.cause === "armed-conflict" &&
    record.armedForcesConflictId === conflictId && !hasLapsed(record, campaign.turn, campaign))) {
    return { ok: false, reason: "an armed-forces emergency over this conflict already stands" };
  }
  const scope: EmergencyScope = { kind: "nation" };
  const emergency: DeclaredEmergency = { id: nextDeclarationId(campaign, scope, "armed-conflict"), scope,
    cause: "armed-conflict", armedForcesConflictId: conflictId, declaredTurn: campaign.turn,
    renewedTurn: campaign.turn, reason: "A national emergency was declared over an armed conflict requiring the armed forces." };
  return declareOnClock(campaign, emergency, [conflictId]);
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
  if (hasLapsed(emergency, campaign.turn, campaign)) return { ok: false, reason: "The authority has expired; a presidential continuation cannot revive it." };
  const clock = emergencyAuthorityClock(campaign, emergency);
  const now = emergency.authorityClockId ? campaign.calendar : legacyEmergencyDate(campaign);
  if (compareDates(authorityDeadline(campaign, clock), clock.expiresDate) < 0) {
    return { ok: false, reason: "The enacted limit requires congressional renewal of this emergency." };
  }
  if (daysBetween(now, clock.expiresDate) > 90) {
    const days = daysBetween(now, clock.expiresDate) - 90;
    return {
      ok: false,
      reason: `the continuation is published in the ninety days before the anniversary, which is ${days} ${days === 1 ? "day" : "days"} away`,
    };
  }
  return {
    ok: true,
    packet: declarationPacket(
      campaign,
      emergency.scope,
      `The state of emergency over ${emergencyCauseNoun(emergency.cause)} in ${whereOf(emergency.scope, campaign)} is continued for another year.`,
      [
        { kind: "authorityClock", set: { ...clock, expiresDate: anniversaryAfter(clock.expiresDate) } },
        { kind: "emergency", set: { ...emergency, authorityClockId: clock.id, renewedTurn: campaign.turn } },
      ],
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
export const emergencyPhase: TurnPhase = (state) => [
  ...emergencyExpiryPhase(state),
  ...selectDeclaredEmergencies(state).map((emergency): EffectPacket => ({
    source: "simulate", actor: "world", turn: state.turn,
    provenance: { origin: "scheduled", causeIds: emergency.causedBy ? [emergency.causedBy] : [], systems: ["emergency"], effectiveDate: state.calendar },
    narration: { summary: "The emergency powers still stand." },
    effects: [{ kind: "metric", deltas: { standing: -weeklyStandingCost(emergency, state.turn) } }],
  })),
];

// The same ceiling is read by issuance, renewal, selectors and daily expiry.
export function authorityDeadline(campaign: Campaign, clock: AuthorityClock): Campaign["calendar"] {
  const days = lawConstraints(campaign).authorityDays?.[clock.authority];
  const ceiling = days === undefined ? undefined : addDays(clock.openedDate, days);
  const limit = ceiling && clock.authorizedThrough && compareDates(clock.authorizedThrough, ceiling) > 0 ? clock.authorizedThrough : ceiling;
  const limits = limit ? [limit] : [];
  return [clock.expiresDate, ...limits, ...(clock.terminatedDate ? [clock.terminatedDate] : [])].sort(compareDates)[0]!;
}

export function authorityHasExpired(campaign: Campaign, clock: AuthorityClock, now = campaign.calendar): boolean {
  return compareDates(now, authorityDeadline(campaign, clock)) >= 0;
}

function anniversaryAfter(date: Campaign["calendar"]): Campaign["calendar"] {
  // February 29's next civil anniversary is March 1 in a non-leap year.
  return addDays({ year: date.year + 1, month: date.month, day: 1 }, date.day - 1);
}

function legacyEmergencyDate(campaign: Campaign): Campaign["calendar"] {
  const fromTurn = selectDateOfTurn(campaign, campaign.turn);
  return compareDates(fromTurn, campaign.calendar) > 0 ? fromTurn : campaign.calendar;
}

export function emergencyAuthorityClock(campaign: Campaign, emergency: DeclaredEmergency): AuthorityClock {
  const stored = emergency.authorityClockId && campaign.authorityClocks?.[emergency.authorityClockId];
  if (stored) return withEmergencyPredicates(campaign, stored);
  const predicates = declarationPredicates(campaign, emergency);
  return { id: `authority:${emergency.id}`, authority: "emergency", predicate: predicates[0] ?? `legacy:${emergency.id}`, predicates,
    openedDate: selectDateOfTurn(campaign, emergency.declaredTurn),
    expiresDate: addDays(selectDateOfTurn(campaign, emergency.renewedTurn), elapsedDays(EMERGENCY_RENEWAL_TURNS)),
    ...(emergency.causedBy ? { causedBy: emergency.causedBy } : {}) };
}

function declarationPredicates(campaign: Campaign, emergency: DeclaredEmergency): readonly string[] {
  if (emergency.cause === "armed-conflict") return emergency.armedForcesConflictId ? [emergency.armedForcesConflictId] : [];
  return Object.values(campaign.conditions).filter((condition) => condition.nation === campaign.founding.nation
    && condition.kind === emergency.cause && condition.startedTurn <= emergency.declaredTurn
    && (condition.endedTurn === undefined || condition.endedTurn >= emergency.declaredTurn)
    && (emergency.scope.kind === "nation" || condition.state === emergency.scope.state))
    .map((condition) => condition.id).sort();
}

// Older saves retained only one predicate; recover the others from declarations, never later conditions.
function withEmergencyPredicates(campaign: Campaign, clock: AuthorityClock): AuthorityClock {
  if (clock.predicates) return clock;
  const covered = Object.values(campaign.emergencies).filter((record) => record.authorityClockId === clock.id)
    .flatMap((record) => declarationPredicates(campaign, record));
  return { ...clock, predicates: [...new Set([clock.predicate, ...covered])].sort() };
}

function declareOnClock(campaign: Campaign, emergency: DeclaredEmergency, predicates: readonly string[]): DeclarationResult {
  const prior = [
    ...Object.values(campaign.authorityClocks ?? {}).filter((clock) => clock.authority === "emergency")
      .map((clock) => withEmergencyPredicates(campaign, clock)),
    ...Object.values(campaign.emergencies).filter((record) => !record.authorityClockId)
      .map((record) => emergencyAuthorityClock(campaign, record)),
  ].filter((clock) => (clock.predicates ?? [clock.predicate]).some((predicate) => predicates.includes(predicate)))
    .sort((a, b) => compareDates(a.openedDate, b.openedDate) || a.id.localeCompare(b.id))[0];
  const clock: AuthorityClock = { ...(prior ?? {
    id: `authority:${emergency.id}`, authority: "emergency", predicate: [...predicates].sort()[0]!,
    openedDate: campaign.calendar, expiresDate: anniversaryAfter(campaign.calendar),
  }), predicates: [...new Set([...(prior?.predicates ?? []), ...predicates])].sort() };
  if (authorityHasExpired(campaign, clock)) return { ok: false, reason: "This emergency episode has exhausted its authority; a new declaration does not reset its statutory clock." };
  return { ok: true, packet: declarationPacket(campaign, emergency.scope, emergency.reason, [
    { kind: "authorityClock", set: clock }, { kind: "emergency", set: { ...emergency, authorityClockId: clock.id } },
  ]) };
}

export function emergencyExpiryPhase(campaign: Campaign): readonly EffectPacket[] {
  return Object.values(campaign.emergencies).filter((record) => isStanding(record) && hasLapsed(record, campaign.turn, campaign))
    .sort((a, b) => a.id.localeCompare(b.id)).map((record) => ({
      source: "simulate", actor: "world", turn: campaign.turn,
      provenance: { origin: "scheduled", causeIds: record.causedBy ? [record.causedBy] : [], systems: ["emergency"], effectiveDate: campaign.calendar },
      narration: { summary: `${record.reason.replace(/\.$/, "")} — the authority has expired.` },
      effects: [{ kind: "emergency", set: { ...record, endedTurn: campaign.turn } }],
    }));
}

export function emergencyLegislationEffects(campaign: Campaign, target: string | undefined, action: "terminate" | "renew"): readonly Effect[] {
  const record = target ? campaign.emergencies[target] : undefined;
  if (!record) return [];
  const clock = emergencyAuthorityClock(campaign, record);
  if (action === "terminate") return [
    { kind: "authorityClock", set: { ...clock, terminatedDate: campaign.calendar } },
    ...Object.values(campaign.emergencies).filter((entry) => emergencyAuthorityClock(campaign, entry).id === clock.id && isStanding(entry))
      .sort((a, b) => a.id.localeCompare(b.id)).map((entry): Effect => ({ kind: "emergency", set: { ...entry, authorityClockId: clock.id, endedTurn: campaign.turn } })),
  ];
  if (!isStanding(record) || hasLapsed(record, campaign.turn, campaign)) return [];
  const authorizedThrough = addDays(authorityDeadline(campaign, clock), 90);
  return [{ kind: "authorityClock", set: { ...clock, authorizedThrough,
    expiresDate: compareDates(authorizedThrough, clock.expiresDate) > 0 ? authorizedThrough : clock.expiresDate } },
    { kind: "emergency", set: { ...record, authorityClockId: clock.id } }];
}
