import type { Campaign, FeedItem, PressEngagement } from "./state.js";
import type { Effect, EffectPacket } from "./effects.js";
import type { OpinionDriver } from "./opinion.js";
import { markedFlags } from "./marked-flags.js";
import {
  PRESS_PLAYS,
  fileAtDesk,
  movedCorps,
  playMovement,
  pressSecretary,
  secretarySpentFlag,
} from "./press.js";

// The press secretary taking a bad cycle for the President.
//
// Press secretaries exist partly to stand between the President and a bad
// answer: "I misspoke on the President's behalf" moves the story onto the
// podium and off the Oval Office. It works once. A secretary who has done it
// has told the room that what they say from the podium can be withdrawn, and
// briefs at half from then on (`podiumSkill`). That is the whole price, and it
// is paid in the one currency the post has.

/** How much of a bad engagement the secretary's apology wins back. */
export const TAKE_THE_HIT_SHARE = 0.6;

/** How recent a bad cycle has to be for anyone to be able to take it: this week or last. */
export const TAKE_THE_HIT_WINDOW_TURNS = 1;

export type TakeTheHitProjection =
  | { readonly ok: false; readonly reason: string }
  | {
      readonly ok: true;
      readonly secretary: { readonly id: string; readonly name: string };
      readonly engagement: PressEngagement;
      /** Where the corps's standing lands once the apology is read. */
      readonly standingAfter: number;
      readonly packet: EffectPacket;
    };

function badCycle(campaign: Campaign): PressEngagement | undefined {
  return [...campaign.press.engagements]
    .reverse()
    .find((engagement) => !engagement.wentWell && campaign.turn - engagement.turn <= TAKE_THE_HIT_WINDOW_TURNS);
}

function refund(deltas: Partial<Record<OpinionDriver, number>> | undefined): Partial<Record<OpinionDriver, number>> | undefined {
  if (!deltas) return undefined;
  return Object.fromEntries(Object.entries(deltas).map(([driver, value]) => [driver, -(value ?? 0) * TAKE_THE_HIT_SHARE]));
}

function apologyItem(campaign: Campaign, name: string): FeedItem {
  return {
    turn: campaign.turn,
    kind: "player-action",
    visibility: "public",
    headline: `White House Press Secretary ${name} told the briefing room the week's worst answer was the secretary's own mistake, not the President's.`,
    actor: campaign.founding.nation,
  };
}

/**
 * The act, projected and ready to commit. Refused, with the reason, when there
 * is no secretary to send, the secretary has already spent their credibility,
 * or there is no recent bad cycle to take.
 */
export function secretaryTakesTheHit(campaign: Campaign): TakeTheHitProjection {
  const secretary = pressSecretary(campaign);
  if (!secretary) return { ok: false, reason: "There is no press secretary to send to the podium." };
  if (campaign.player.flags[secretarySpentFlag(secretary.id)] === true) {
    return { ok: false, reason: `${secretary.name} has already taken one for you, and the room remembers it.` };
  }
  const engagement = badCycle(campaign);
  if (!engagement) return { ok: false, reason: "There is no bad cycle this week or last for anyone to take." };
  const play = PRESS_PLAYS[engagement.kind];
  const lost = playMovement(play, false, engagement.outletId);
  const recovered = Object.fromEntries(Object.entries(lost).map(([id, value]) => [id, -value * TAKE_THE_HIT_SHARE]));
  const corps = movedCorps(campaign.press, recovered);
  const mood = refund(play.moodBackfire);
  const effects: Effect[] = [
    { kind: "press", set: corps },
    { kind: "flag", set: markedFlags([secretarySpentFlag(secretary.id)], campaign.turn) },
    { kind: "feed", items: [fileAtDesk({ ...campaign, press: corps }, apologyItem(campaign, secretary.name))] },
    ...(mood ? [{ kind: "opinion", deltas: mood } as Effect] : []),
  ];
  return {
    ok: true,
    secretary,
    engagement,
    standingAfter: corps.standing,
    packet: {
      source: "action",
      actor: "player",
      turn: campaign.turn,
      narration: { summary: `${secretary.name} took the week's bad answer from the podium, and the room moved on.` },
      effects,
      provenance: { origin: "decision", systems: ["press"] },
    },
  };
}
