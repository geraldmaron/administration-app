import type { Campaign, FeedItem, IssuedPressAct, LobbyForecast, PressAction, PressCorps, PressEngagement } from "./state.js";
import type { Effect, EffectPacket } from "./effects.js";
import { apply } from "./effects.js";
import { createRngStreams } from "./rng.js";
import { addDays, compareDates } from "./clock.js";
import { headOfGovernmentTitle } from "./naming.js";
import {
  PRESS_PLAYS,
  fileAtDesk,
  movedCorps,
  playMovement,
  pressOutletById,
  projectPressAction,
  type PodiumSubject,
  type PressForecast,
  type PressPlay,
  type PressProjection,
} from "./press.js";

// The press engagement as an issued act: booked today, answered by the room on
// its due date, the forecast frozen at issuance so what the player read and
// what the record keeps cannot come apart. Split from press.ts, which holds the
// corps and the week; this file holds the calendar.

export type PressIssueResult =
  | { readonly ok: false; readonly reason: string }
  | {
      readonly ok: true;
      readonly projection: PressProjection;
      readonly act: IssuedPressAct;
      readonly packet: EffectPacket;
    };

export type PressResult =
  | { readonly ok: false; readonly reason: string }
  | {
      readonly ok: true;
      readonly projection: PressProjection;
      readonly wentWell: boolean;
      readonly engagement: PressEngagement;
      readonly packet: EffectPacket;
    };

/** One day: the hour is booked; the corps writes overnight. */
function pressDelayDays(_kind: PressAction): number {
  return 1;
}

function pendingPressOn(campaign: Campaign): IssuedPressAct | undefined {
  return Object.values(campaign.issuedActs ?? {}).find(
    (act): act is IssuedPressAct =>
      act.kind === "press" &&
      (act.status === "issued" || act.status === "awaiting-response" || act.status === "in-progress"),
  );
}

function pressSlotTaken(campaign: Campaign): boolean {
  if (pendingPressOn(campaign)) return true;
  return campaign.press.engagements.some((engagement) => engagement.turn === campaign.turn);
}

function refusePressTarget(kind: PressAction, outletId: string | undefined): string | undefined {
  if (PRESS_PLAYS[kind].targeting !== "outlet") return undefined;
  if (outletId === undefined) {
    return kind === "interview"
      ? "An interview is with somebody. Choose the masthead it goes to."
      : "A story has to be given to a particular desk. Choose the masthead it goes to.";
  }
  if (!pressOutletById(outletId)) {
    return "That masthead is not one of the ones covering this administration.";
  }
  return undefined;
}

function freezePressForecast(campaign: Campaign, forecast: PressForecast): LobbyForecast {
  return { ...forecast, asOf: campaign.calendar };
}

function pressActId(kind: PressAction, campaign: Campaign): string {
  return `issued:press:${kind}:${campaign.turn}:${campaign.calendar.year}-${campaign.calendar.month}-${campaign.calendar.day}`;
}

/**
 * Authorize the engagement. The corps has not answered yet. Standing (and only
 * standing) can move at issuance when the play prices it; the room's reading
 * lands on the due date.
 */
export function issuePressAction(
  campaign: Campaign,
  kind: PressAction,
  outletId?: string,
): PressIssueResult {
  if (pressSlotTaken(campaign)) {
    return { ok: false, reason: "The administration has already been in front of the press this week." };
  }
  const targetReason = refusePressTarget(kind, outletId);
  if (targetReason) return { ok: false, reason: targetReason };
  const projection = projectPressAction(campaign, kind, outletId);
  const dueDate = addDays(campaign.calendar, pressDelayDays(kind));
  const status: IssuedPressAct["status"] = kind === "press-conference" ? "in-progress" : "awaiting-response";
  const act: IssuedPressAct = {
    id: pressActId(kind, campaign),
    kind: "press",
    status,
    action: kind,
    issuedTurn: campaign.turn,
    issuedDate: campaign.calendar,
    dueDate,
    chance: projection.successChance,
    forecast: freezePressForecast(campaign, projection.forecast),
    ...(outletId === undefined ? {} : { outletId }),
  };
  const effects: Effect[] = [{ kind: "issuedAct", set: act }];
  const upfront = projection.play.cost;
  if (Object.keys(upfront).length > 0) effects.push({ kind: "metric", deltas: upfront });
  const when = pressDelayDays(kind) === 1 ? "tomorrow" : `in ${pressDelayDays(kind)} days`;
  return {
    ok: true,
    projection,
    act,
    packet: {
      source: "action",
      actor: "player",
      turn: campaign.turn,
      narration: {
        summary: `${PRESS_PLAYS[kind].name} is on the calendar. How the room takes it lands ${when}.`,
      },
      effects,
      provenance: { origin: "decision", systems: ["press"] },
    },
  };
}

function narratePress(play: PressPlay, wentWell: boolean, title: string): string {
  if (play.kind === "leak") {
    return wentWell
      ? "The story runs, sourced to a senior official nobody can name, and the administration is asked about it rather than blamed for it."
      : `The story runs, and by the second edition it is sourced to ${title}'s own staff — which is now the story.`;
  }
  if (play.kind === "interview") {
    return wentWell
      ? `${title} sits for an hour and gives the corps something to quote that the building is content to have quoted.`
      : `${title} sits for an hour, and the only line anyone takes from it is the one the follow-up question produced.`;
  }
  return wentWell
    ? `${title} takes questions for an hour and leaves the room with the week's argument won.`
    : `${title} takes questions for an hour, and the eleventh one is what leads every bulletin.`;
}

/** What the room asked about, said once at the end of the engagement's own account. */
function subjectLine(subject: PodiumSubject): string {
  if (subject.kind === "story") return ` The questions were about ${subject.text}.`;
  if (subject.kind === "act") return subject.act === "order" ? ` The questions were about ${subject.text}.` : " The questions were about the week's decision.";
  return "";
}

function engagementHeadline(play: PressPlay, wentWell: boolean, title: string, outletName: string | undefined): string {
  const desk = outletName ?? "one outlet";
  if (play.kind === "leak") {
    return wentWell
      ? "A story sourced to a senior official ran the way the building wanted it to."
      : "A story placed with the press this week has been traced back to the White House.";
  }
  if (play.kind === "interview") {
    return wentWell
      ? `The ${title} sat for an hour with ${desk} and gave the building the line it wanted.`
      : `One follow-up in the ${title}'s hour with ${desk} is now the story.`;
  }
  return wentWell
    ? `The ${title} took questions for an hour and held the room.`
    : `The ${title} took questions for an hour, and one answer is what leads.`;
}

/**
 * The story the engagement itself becomes.
 *
 * The President's own act, filed with the nation as its actor and no person as
 * its subject: the subject of a press conference is what was said at it, and a
 * piece that treated the President as the subject would be written from the
 * banks for a person in trouble.
 */
function engagementItem(campaign: Campaign, play: PressPlay, wentWell: boolean, title: string, outletId: string | undefined): FeedItem {
  const outletName = outletId ? pressOutletById(outletId)?.name : undefined;
  return {
    turn: campaign.turn,
    kind: "player-action",
    visibility: "public",
    headline: engagementHeadline(play, wentWell, title, outletName),
    actor: campaign.founding.nation,
  };
}

function resolveFromProjection(
  campaign: Campaign,
  projection: PressProjection,
  act: IssuedPressAct,
  roleTitles?: Readonly<Record<string, string>>,
): Extract<PressResult, { ok: true }> {
  const play = projection.play;
  const dayIndex = campaign.calendar.year * 10000 + campaign.calendar.month * 100 + campaign.calendar.day;
  const desk = act.outletId ?? "corps";
  const wentWell =
    createRngStreams(campaign.seed).stream("press-outcome", dayIndex, act.action, desk).next() < projection.successChance;
  const title = headOfGovernmentTitle(campaign.founding.leadRole, roleTitles);
  const summary = `${narratePress(play, wentWell, title)}${subjectLine(projection.subject)}`;
  const engagement: PressEngagement = {
    id: `press:${act.action}:${campaign.turn}`,
    kind: act.action,
    turn: campaign.turn,
    wentWell,
    summary,
    ...(act.outletId === undefined ? {} : { outletId: act.outletId }),
  };
  const corps: PressCorps = {
    ...movedCorps(campaign.press, playMovement(play, wentWell, act.outletId)),
    // A leak is not the administration speaking, however much of the week's
    // coverage it produces, so it does not stop the silence clock. That
    // asymmetry is the point of having three of these rather than one.
    lastSpokeTurn: play.onTheRecord ? campaign.turn : campaign.press.lastSpokeTurn,
    engagements: [...campaign.press.engagements, engagement],
  };
  const resolved: IssuedPressAct = {
    ...act,
    status: "resolved",
    outcome: { landed: wentWell, account: summary },
  };
  const story = fileAtDesk({ ...campaign, press: corps }, engagementItem(campaign, play, wentWell, title, act.outletId));
  const effects: Effect[] = [
    { kind: "press", set: corps },
    { kind: "issuedAct", set: resolved },
    { kind: "feed", items: [story] },
  ];
  // Backfire only — upfront cost was billed at issuance.
  if (!wentWell && Object.keys(play.backfire).length > 0) {
    effects.push({ kind: "metric", deltas: play.backfire });
  }
  if (!wentWell && play.moodBackfire) {
    effects.push({ kind: "opinion", deltas: play.moodBackfire });
  }
  return {
    ok: true,
    projection,
    wentWell,
    engagement,
    packet: {
      source: "action",
      actor: "player",
      turn: campaign.turn,
      narration: { summary },
      effects,
      provenance: {
        origin: "scheduled",
        causeIds: [act.id],
        systems: ["press"],
        effectiveDate: campaign.calendar,
      },
    },
  };
}

/** Resolve one issued press engagement whose due date has arrived. */
export function resolveIssuedPress(
  campaign: Campaign,
  id: string,
  roleTitles?: Readonly<Record<string, string>>,
): PressResult {
  const act = campaign.issuedActs?.[id];
  if (!act || act.kind !== "press") return { ok: false, reason: "That engagement is not outstanding." };
  if (act.status === "resolved" || act.status === "reported" || act.status === "withdrawn" || act.status === "expired") {
    return { ok: false, reason: "That engagement has already closed." };
  }
  if (compareDates(campaign.calendar, act.dueDate) < 0) {
    return { ok: false, reason: "The room has not answered yet." };
  }
  const live = projectPressAction(campaign, act.action, act.outletId);
  const frozen: PressProjection = {
    ...live,
    successChance: act.chance,
    forecast: {
      likelihood: act.forecast.likelihood,
      confidence: act.forecast.confidence,
      confidenceBasis: act.forecast.confidenceBasis,
      supporting: act.forecast.supporting,
      uncertainty: act.forecast.uncertainty,
      source: act.forecast.source,
    },
  };
  return resolveFromProjection(campaign, frozen, act, roleTitles);
}

export function dueIssuedPressActs(campaign: Campaign): readonly IssuedPressAct[] {
  return Object.values(campaign.issuedActs ?? {})
    .filter(
      (act): act is IssuedPressAct =>
        act.kind === "press" &&
        (act.status === "issued" || act.status === "awaiting-response" || act.status === "in-progress") &&
        compareDates(campaign.calendar, act.dueDate) >= 0,
    )
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** Every press engagement still waiting on the room, whether or not it is due. */
export function outstandingIssuedPressActs(campaign: Campaign): readonly IssuedPressAct[] {
  return Object.values(campaign.issuedActs ?? {})
    .filter(
      (act): act is IssuedPressAct =>
        act.kind === "press" &&
        (act.status === "issued" || act.status === "awaiting-response" || act.status === "in-progress"),
    )
    .sort((a, b) => compareDates(a.dueDate, b.dueDate) || a.id.localeCompare(b.id));
}

/**
 * Apply every press engagement that has come due. Charter titles are optional;
 * American role fallbacks cover the playable seat when none are supplied.
 */
export function resolveDuePress(
  campaign: Campaign,
  roleTitles?: Readonly<Record<string, string>>,
): { readonly campaign: Campaign; readonly packets: readonly EffectPacket[] } {
  const due = dueIssuedPressActs(campaign);
  const packets: EffectPacket[] = [];
  let working = campaign;
  for (const act of due) {
    const result = resolveIssuedPress(working, act.id, roleTitles);
    if (!result.ok) continue;
    packets.push(result.packet);
    working = apply(working, result.packet);
  }
  return { campaign: working, packets };
}

export * from "./press-secretary.js";
