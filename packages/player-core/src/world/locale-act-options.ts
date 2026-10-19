import {
  LOCALE_ACTS,
  REVIEW_DEFERRAL_TURNS,
  UNPROVOKED_STANDING,
  coercionOutcome,
  coercionOutlook,
  homeActAvailability,
  localeAct,
  takeHomeAct,
  RELIEF_SIGNATURE_PREFIX,
  governorAssents,
  hazardLabel,
  localeActCost,
  localeAvailability,
  openRequests,
  reliefSignature,
  selectActiveConditions,
  takeLocaleAct,
  type Campaign,
  type ConditionKind,
  type EffectPacket,
  type LocaleAct,
  type LocaleActId,
} from "@admin/engine";
import type { StateId } from "@admin/world";
import { formatSignedPoints } from "../format/figures";
import { formatMoney } from "../format/money";

// The acts a President can aim at one state, each priced off the packet the
// engine would commit for it this week. The packet is built here, shown, and
// committed as it is, so the cost on the screen is the cost on the books.

/** Something in the state a locale act can answer: a live condition, a governor's request, or both. */
export type LocaleMatter = {
  readonly cause: ConditionKind;
  readonly title: string;
  /** The governor's open request over it, when there is one. */
  readonly request?: { readonly reason: string; readonly weeksLeft: number; readonly weight: number };
  /** 0..1, when a live condition carries it. */
  readonly severity?: number;
};

export type LocaleActOption = {
  readonly id: LocaleActId;
  readonly name: string;
  readonly summary: string;
  /** USD millions this obligates. */
  readonly cost: number;
  readonly costText: string;
  /** Standing given up at home, as a positive share; zero when it costs none. */
  readonly standing: number;
  readonly standingText: string;
  /** Relief the state did not ask for, which its governor will say so about. */
  readonly unrequested: boolean;
  /** Whether it discharges the state's open request over this matter. */
  readonly answers: boolean;
  /** Whether it buys the request more time instead. */
  readonly defers: boolean;
  /** The governor's part, said plainly, where the act needs their assent. */
  readonly assent?: string;
  readonly needsDeclaration: boolean;
  /** Why it cannot be taken now; absent when it can. */
  readonly locked?: string;
  /** The packet authorizing commits, built against this campaign. Absent when locked. */
  readonly packet?: EffectPacket;
  /**
   * For force or surveillance aimed at Americans: the chance something goes
   * wrong and how many recent acts are raising it. Only the odds: whether it
   * does go wrong is in the packet, and is read on the receipt, never before.
   */
  readonly risk?: { readonly odds: number; readonly recent: number; readonly erratic: boolean };
  /** Sent with no unrest to answer: read as overreach, and priced as it. */
  readonly unprovoked?: true;
};

/** A state's request on a clock: said beside the options as what goes unanswered, never as one of them. */
export type LocaleWaiting = {
  readonly line: string;
  readonly weeksLeft: number;
};

const causeOfClaim = (signature: string): ConditionKind | undefined =>
  signature.startsWith(`${RELIEF_SIGNATURE_PREFIX}:`) ? (signature.slice(RELIEF_SIGNATURE_PREFIX.length + 1) as ConditionKind) : undefined;

/** What in this state a locale act could answer, requests first, then the worst condition. */
export function localeMatters(campaign: Campaign, id: StateId): readonly LocaleMatter[] {
  const conditions = selectActiveConditions(campaign).filter((condition) => condition.nation === campaign.founding.nation && condition.state === id);
  const requests = openRequests(campaign, id);
  const causes = [...new Set([...requests.flatMap((claim) => causeOfClaim(claim.signature) ?? []), ...conditions.map((condition) => condition.kind)])];
  return causes
    .map((cause): LocaleMatter => {
      const claim = requests.find((entry) => entry.signature === reliefSignature(cause));
      const severity = Math.max(-1, ...conditions.filter((condition) => condition.kind === cause).map((condition) => condition.severity));
      return {
        cause,
        title: hazardLabel(cause),
        ...(claim ? { request: { reason: claim.reason, weeksLeft: Math.max(0, claim.expiresTurn - campaign.turn), weight: claim.weight } } : {}),
        ...(severity >= 0 ? { severity } : {}),
      };
    })
    .sort((a, b) => Number(b.request !== undefined) - Number(a.request !== undefined) || (b.severity ?? 0) - (a.severity ?? 0) || a.cause.localeCompare(b.cause));
}

function metricDelta(packet: EffectPacket | undefined, key: "treasury" | "standing"): number {
  if (!packet) return 0;
  return packet.effects.reduce((sum, effect) => (effect.kind === "metric" ? sum + (effect.deltas[key] ?? 0) : sum), 0);
}

function assentWords(campaign: Campaign, id: StateId, act: LocaleAct): string | undefined {
  if (!act.needsGovernorAssent) return undefined;
  const governor = campaign.states[id]?.governor;
  if (!governor) return "There's no governor in office, so we can't tell whether they'd agree.";
  return governorAssents(governor) ? "The governor agrees to it." : "The governor won't agree to it.";
}

function optionFor(campaign: Campaign, id: StateId, cause: ConditionKind, act: LocaleAct): LocaleActOption {
  const availability = localeAvailability(campaign, id, act, cause);
  const result = availability.ok ? takeLocaleAct(campaign, id, act.id, cause) : undefined;
  const packet = result?.ok ? result.packet : undefined;
  const refused = result && !result.ok ? result.reason : undefined;
  const standing = Math.abs(metricDelta(packet, "standing")) || (packet ? 0 : act.standingCost);
  const cost = packet ? Math.abs(metricDelta(packet, "treasury")) : localeActCost(campaign, act);
  const assent = assentWords(campaign, id, act);
  return {
    id: act.id,
    name: act.name,
    summary: act.summary,
    cost,
    costText: formatMoney(cost),
    standing,
    standingText: standing > 0 ? `${formatSignedPoints(-standing)} pts` : "None",
    unrequested: act.predicate === "request" && openRequests(campaign, id).length === 0,
    answers: act.answersClaim && openRequests(campaign, id).some((claim) => claim.signature === reliefSignature(cause)),
    defers: act.id === "review" && openRequests(campaign, id).length > 0,
    ...(assent ? { assent } : {}),
    needsDeclaration: act.needsDeclaration,
    ...(availability.ok ? {} : { locked: `This needs ${availability.missing}.` }),
    ...(refused ? { locked: refused } : {}),
    ...(packet ? { packet } : {}),
    ...(act.coercion ? { risk: riskOf(campaign, act) } : {}),
  };
}

function riskOf(campaign: Campaign, act: LocaleAct, provoked = true): NonNullable<LocaleActOption["risk"]> {
  const outlook = coercionOutlook(campaign, act.coercion!, provoked);
  return { odds: outlook.odds, recent: outlook.recent, erratic: outlook.erratic };
}

/**
 * Every locale act against one matter in one state, in the engine's order,
 * priced on this week's campaign. Force and collection aimed at Americans are
 * offered only against unrest: against a flood they are not a choice anyone
 * would weigh, only clutter.
 */
export function localeActOptions(campaign: Campaign, id: StateId, cause: ConditionKind): readonly LocaleActOption[] {
  return LOCALE_ACTS.filter((act) => !act.coercion || cause === "unrest").map((act) => optionFor(campaign, id, cause, act));
}

/** The state's request running out unanswered, which becomes a grievance; undefined when nothing is owed, so no clock runs. */
export function localeWaiting(campaign: Campaign, id: StateId, cause: ConditionKind): LocaleWaiting | undefined {
  const claim = openRequests(campaign, id).find((entry) => entry.signature === reliefSignature(cause));
  const name = campaign.states[id]?.base.name ?? id;
  if (!claim) return undefined;
  const weeksLeft = Math.max(0, claim.expiresTurn - campaign.turn);
  return {
    line: `${name}'s request runs out in ${weeksLeft} ${weeksLeft === 1 ? "week" : "weeks"}. If you don't answer it, the state will hold it against you.`,
    weeksLeft,
  };
}

/**
 * What went wrong when a coercive act was taken, read after the fact off the
 * campaign it was taken on: the draw is the same one the committed packet
 * made, so this is the incident on the books, not a second roll. Undefined
 * when the act carries no risk or nothing went wrong.
 */
export function localeIncident(before: Campaign, id: StateId, actId: LocaleActId, provoked = true): string | undefined {
  const act = localeAct(actId);
  if (!act?.coercion) return undefined;
  return coercionOutcome(before, id, before.states[id]?.base.name ?? id, act.coercion, provoked).incident;
}

function homeOptionFor(campaign: Campaign, id: StateId, act: LocaleAct): LocaleActOption {
  const availability = homeActAvailability(campaign, id, act);
  const result = availability.ok ? takeHomeAct(campaign, id, act.id) : undefined;
  const packet = result?.ok ? result.packet : undefined;
  const standing = packet ? Math.abs(metricDelta(packet, "standing")) : act.standingCost * UNPROVOKED_STANDING;
  const cost = packet ? Math.abs(metricDelta(packet, "treasury")) : localeActCost(campaign, act);
  return {
    id: act.id,
    name: act.name,
    summary: act.summary,
    cost,
    costText: formatMoney(cost),
    standing,
    standingText: standing > 0 ? `${formatSignedPoints(-standing)} pts` : "None",
    unrequested: false,
    answers: false,
    defers: false,
    needsDeclaration: act.needsDeclaration,
    ...(availability.ok ? {} : { locked: `This needs ${availability.missing}.` }),
    ...(result && !result.ok ? { locked: result.reason } : {}),
    ...(packet ? { packet } : {}),
    risk: riskOf(campaign, act, false),
    unprovoked: true,
  };
}

/**
 * Force and collection the President can send into a state on their own
 * initiative, with no unrest there to answer: every act that carries a
 * coercion risk, priced as the overreach it is read as.
 */
export function homeActOptions(campaign: Campaign, id: StateId): readonly LocaleActOption[] {
  return LOCALE_ACTS.filter((act) => act.coercion).map((act) => homeOptionFor(campaign, id, act));
}

/** How long a review buys, for the sentence that says so. */
export const REVIEW_WEEKS = REVIEW_DEFERRAL_TURNS;
