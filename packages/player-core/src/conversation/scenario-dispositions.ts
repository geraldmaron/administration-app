// The answers a staged decision accepts besides a reply, and what each one
// costs. Leaving a decision unanswered is priced by the same packet Continue
// charges a walked-past decision, built against the same campaign the screen
// shows, so the price on the page is the price on the ledger.
import {
  addDays,
  answerLowerOrderReview,
  apply,
  campaignFoundingDate,
  compareDates,
  deferUntil,
  isOpenCase,
  type Campaign,
  type Effect,
  type EffectPacket,
  type GameDate,
  type MetricSet,
  type OpinionDriver,
} from "@admin/engine";
import { deskClosedFlag, inactionPacket, scenarioCaseId, scenarioOccurrenceKey, scenarioPutOffEffect, type CastScenario } from "@admin/content";
import { OPINION_DRIVER_LABELS } from "../format/figures";
import { chargedThisWeek, docketSilenced } from "./lapse-source";
import { SCENARIO_CASE_DISPOSITIONS, scenarioRaiseEffects } from "./scenario-cases";
import { scenarioMatterId, scenarioMatterSource } from "./scripts";

/** The dispositions a decision takes without a reply; `act` is the reply itself. */
export type ScenarioDispositionKind = "defer" | "decline" | "allow-default";

/** A put-off of a decision the board did not warrant holds it for a week, as the Desk's tray does. */
const AMBIENT_PUT_OFF_DAYS = 7;

/** What leaving the decision unanswered costs right now, read off the packet that would charge it. */
export type SilencePrice = {
  /** The silence was already charged this week, so leaving it now adds nothing. */
  readonly alreadyCharged: boolean;
  /** Each reading's move, as the ledger will record it. */
  readonly metrics: Partial<Record<keyof MetricSet, number>>;
  /** Each public judgment's move behind the approval figure. */
  readonly judgments: Partial<Record<OpinionDriver, number>>;
  /** The author's own sentence for what not deciding does. */
  readonly narration: string;
};

const METRIC_KEYS: readonly (keyof MetricSet)[] = ["approval", "treasury", "stability", "militaryReadiness", "standing"];

/** Movements smaller than this are rounding, not a price. */
const MOVED = 1e-9;

function silenceCharged(campaign: Campaign, cast: CastScenario): boolean {
  return chargedThisWeek(campaign, scenarioOccurrenceKey(cast)) || docketSilenced(campaign, scenarioOccurrenceKey(cast));
}

function diffs<K extends string>(keys: readonly K[], before: Readonly<Record<K, number>>, after: Readonly<Record<K, number>>): Partial<Record<K, number>> {
  return Object.fromEntries(keys.map((key) => [key, after[key] - before[key]] as const).filter(([, delta]) => Math.abs(delta) > MOVED)) as Partial<Record<K, number>>;
}

/** The judgments a ledger entry says moved, by how much. */
function judgmentsMoved(mood: Partial<Record<string, number>> | undefined): Partial<Record<OpinionDriver, number>> {
  return Object.fromEntries((Object.keys(OPINION_DRIVER_LABELS) as OpinionDriver[]).map((driver) => [driver, mood?.[driver] ?? 0] as const).filter(([, delta]) => Math.abs(delta) > MOVED));
}

/**
 * The price of silence on this decision today. Applied to a copy of the
 * campaign, so the figures are the entry `apply()` will write: the readings'
 * move, approval settled from the judgments exactly as the ledger settles it,
 * and the judgments' own move as the entry records it.
 */
export function silencePrice(campaign: Campaign, cast: CastScenario): SilencePrice {
  if (cast.orderCase?.posture === "adverse-lower") return {
    alreadyCharged: false, metrics: {}, judgments: {},
    narration: "If you don't respond by the deadline, the lower court's ruling stands and your challenged order ends.",
  };
  const packet = inactionPacket(campaign, cast);
  const narration = packet.narration.summary;
  if (silenceCharged(campaign, cast)) return { alreadyCharged: true, metrics: {}, judgments: {}, narration };
  const after = apply(campaign, packet);
  return {
    alreadyCharged: false,
    metrics: diffs(METRIC_KEYS, campaign.player.metrics, after.player.metrics),
    judgments: judgmentsMoved(after.ledger.at(-1)?.mood),
    narration,
  };
}

function raiseEffects(campaign: Campaign, cast: CastScenario): readonly Effect[] {
  return scenarioRaiseEffects(campaign, cast);
}

/**
 * The decision left unanswered, as the player acts: its silence charged once
 * (never twice in a week), then its case closed with the chosen disposition
 * and the desk closed for the week, as an answer closes it. Two packets,
 * because the charge is the world's and the closing is the President's.
 */
export function leaveUnansweredPackets(campaign: Campaign, cast: CastScenario, kind: Exclude<ScenarioDispositionKind, "defer">, narration: { readonly summary: string; readonly onCase: string }): readonly EffectPacket[] {
  if (cast.orderCase?.posture === "adverse-lower" && kind === "allow-default") {
    const answer = scenarioDispositionPackets(campaign, cast, "allow-default");
    if (!answer.ok) throw new Error(answer.reason);
    return answer.packets;
  }
  const charge = silenceCharged(campaign, cast) ? [] : [inactionPacket(campaign, cast)];
  const close: EffectPacket = {
    source: "action",
    actor: "player",
    turn: campaign.turn,
    provenance: { origin: "decision", entities: [scenarioCaseId(cast)], systems: ["cases"] },
    narration: { summary: narration.summary },
    effects: [
      ...raiseEffects(campaign, cast),
      { kind: "case", actor: "player", transition: { id: scenarioCaseId(cast), disposition: { kind }, narration: narration.onCase } },
      { kind: "flag", set: [deskClosedFlag(campaign.turn)] },
    ],
  };
  return [...charge, close];
}

/** The day a put-off holds the decision to: the engine's own date, or a week for one the board did not warrant. */
function putOffUntil(campaign: Campaign, cast: CastScenario): GameDate {
  const matter = scenarioMatterSource(campaign, campaign.calendar).find((entry) => entry.id === scenarioMatterId(scenarioOccurrenceKey(cast)));
  if (!matter || matter.urgency === "ambient") return addDays(campaign.calendar, AMBIENT_PUT_OFF_DAYS);
  return deferUntil(matter, campaign.calendar, campaignFoundingDate(campaign));
}

/** Keep the authored answer and its underlying lower-court response on one return date. */
export function scenarioPutOffEffects(campaign: Campaign, cast: CastScenario, until: GameDate): readonly Effect[] {
  const onCase = scenarioPutOffEffect(campaign, scenarioCaseId(cast), until);
  if (!onCase || onCase.kind !== "case" || onCase.transition?.disposition.kind !== "defer") return [];
  const held = onCase.transition.disposition.until;
  if (cast.orderCase?.posture !== "adverse-lower") return [onCase];
  const responseId = `case:review:${cast.orderCase.proceedingId}`;
  const response = campaign.cases?.[responseId];
  if (!response || !response.allowedDispositions.includes("defer") ||
    !isOpenCase(response.status) || response.clock.kind === "none" ||
    compareDates(held, response.clock.dueAt) >= 0) return [];
  return [onCase, { kind: "case", actor: "player", transition: {
    id: responseId, disposition: { kind: "defer", until: held }, narration: "Put off with the authored court response.",
  } }];
}

function putOffPacket(campaign: Campaign, cast: CastScenario): EffectPacket | undefined {
  const raise = raiseEffects(campaign, cast);
  const seated = raise.length > 0 ? apply(campaign, { source: "simulate", actor: "world", turn: campaign.turn, narration: { summary: "A decision is waiting." }, effects: raise }) : campaign;
  const id = scenarioCaseId(cast);
  const onCases = scenarioPutOffEffects(seated, cast, putOffUntil(campaign, cast));
  const onCase = onCases[0];
  if (!onCase || onCase.kind !== "case" || onCase.transition?.disposition.kind !== "defer") return undefined;
  return {
    source: "action",
    actor: "player",
    turn: campaign.turn,
    provenance: { origin: "decision", entities: [id], systems: ["cases"] },
    narration: { summary: `Put off: ${cast.script.subject}.` },
    effects: [...raise, { kind: "attention", defer: { [scenarioMatterId(scenarioOccurrenceKey(cast))]: onCase.transition.disposition.until } }, ...onCases],
  };
}

const NARRATION: Readonly<Record<Exclude<ScenarioDispositionKind, "defer">, (subject: string) => { readonly summary: string; readonly onCase: string }>> = {
  decline: (subject) => ({ summary: `Declined to take up: ${subject}.`, onCase: "Declined." }),
  "allow-default": (subject) => ({ summary: `Left unanswered: ${subject}.`, onCase: "Left unanswered." }),
};

/** The packets one disposition commits, in order, or the reason it cannot be taken today. */
export function scenarioDispositionPackets(
  campaign: Campaign,
  cast: CastScenario,
  kind: ScenarioDispositionKind,
): { readonly ok: true; readonly packets: readonly EffectPacket[] } | { readonly ok: false; readonly reason: string } {
  if (kind === "defer") {
    const packet = putOffPacket(campaign, cast);
    return packet ? { ok: true, packets: [packet] } : { ok: false, reason: "There's no time left to put this off." };
  }
  if (kind === "allow-default" && cast.orderCase?.posture === "adverse-lower") {
    const answer = answerLowerOrderReview(campaign, cast.orderCase.proceedingId, "accept");
    if (!answer.ok) return { ok: false, reason: answer.reason };
    return { ok: true, packets: [{ ...answer.packet, effects: [
      ...raiseEffects(campaign, cast), ...answer.packet.effects,
      { kind: "case", actor: "player", transition: { id: scenarioCaseId(cast),
        disposition: { kind: "act", actionId: "accept-lower-judgment" }, narration: "Accepted the lower judgment." } },
      { kind: "flag", set: [deskClosedFlag(campaign.turn)] },
    ] }] };
  }
  return { ok: true, packets: leaveUnansweredPackets(campaign, cast, kind, NARRATION[kind](cast.script.subject)) };
}

export type ScenarioDisposition = {
  readonly kind: ScenarioDispositionKind;
  readonly label: string;
  /** What it does, in a sentence, before it is pressed. */
  readonly detail: string;
  /** Why it cannot be taken today, when it cannot. */
  readonly unavailable?: string;
};

const LABELS: Readonly<Record<ScenarioDispositionKind, string>> = {
  defer: "Put it off",
  decline: "Decline it",
  "allow-default": "Close it unanswered",
};

function detailOf(kind: ScenarioDispositionKind, price: SilencePrice): string {
  if (kind === "defer") return "It comes back to you before time runs out, and it costs nothing now. If you never answer it, you pay the cost of staying silent when time runs out.";
  const charged = price.alreadyCharged ? "You already paid the cost of staying silent this week, so it costs nothing more now." : "You pay the cost of staying silent now, as said above the answers.";
  const said = kind === "decline" ? "The Record will show you declined it." : "The Record will show you closed it unanswered.";
  return `${charged} ${said} You won't get a new decision until next week.`;
}

/**
 * Every disposition the decision's case declares besides a reply, in the order
 * the case lists them, each with what it does. Nothing is offered that the case
 * does not accept.
 */
export function scenarioDispositions(campaign: Campaign, cast: CastScenario): readonly ScenarioDisposition[] {
  const declared = campaign.cases?.[scenarioCaseId(cast)]?.allowedDispositions ?? SCENARIO_CASE_DISPOSITIONS;
  const price = silencePrice(campaign, cast);
  return declared
    .filter((kind): kind is ScenarioDispositionKind => kind === "defer" || kind === "decline" || kind === "allow-default")
    .map((kind) => {
      const answer = kind === "defer" || cast.orderCase?.posture === "adverse-lower" ? scenarioDispositionPackets(campaign, cast, kind) : undefined;
      const acceptance = kind === "allow-default" && cast.orderCase?.posture === "adverse-lower";
      return {
        kind,
        label: acceptance ? "Accept the lower judgment" : LABELS[kind],
        detail: acceptance ? "The lower court's ruling stands, and your challenged order ends." :
          kind === "defer" && cast.orderCase?.posture === "adverse-lower"
            ? "This comes back to you before the Court's deadline. Until then, the lower court's ruling stays in effect and your order stays on hold. Putting it off costs nothing right now."
            : detailOf(kind, price),
        ...(answer && !answer.ok ? { unavailable: answer.reason } : {}),
      };
    });
}
