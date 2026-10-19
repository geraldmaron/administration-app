import { commitReply, createRngStreams, type Campaign, type ConversationBeat, type ReplyProjection } from "@admin/engine";
import { castStillBound, rememberReply, type CastScenario } from "@admin/content";
import { BUNDLED_CONSEQUENCES, decisionCamera, scenarioDispositionPackets, type ScenarioDispositionKind } from "@admin/player-core";
import { useAuthorize, type ActReview, type Authorized, type Preparation } from "../app/use-authorize";

/** What was decided, kept beside the receipt so it is said from what the commit returned, not re-read off a board that has moved. */
export type Decided = {
  readonly title: string;
  readonly subject: string;
  readonly date: string;
  readonly before: Campaign;
  readonly after: Campaign;
  readonly beats: readonly ConversationBeat[];
  /** The Record entry the act wrote, newest last. */
  readonly eventId?: string;
  readonly saveError?: string;
};

/** The same dispositions as the review offers them, before anything is done. */
const OFFER_WORDS: Readonly<Record<ScenarioDispositionKind, string>> = {
  defer: "Put it off",
  decline: "Decline",
  "allow-default": "Leave it unanswered",
};

const DONE_WORDS: Readonly<Record<ScenarioDispositionKind, string>> = {
  defer: "Put off",
  decline: "Declined",
  "allow-default": "Left unanswered",
};

/**
 * The decision's two kinds of act, each committed against the campaign the
 * screen priced it on (`basis`), so a stale press is refused rather than
 * charged at a price nobody quoted. Both record the change for the delta
 * lens and hand back what the receipt reads.
 */
export function useDecisionActs(campaign: Campaign, cast: CastScenario, onDone: (decided: Decided) => void) {
  const { busy, problem, authorize } = useAuthorize(campaign);
  const place = decisionCamera(cast);
  // A routine matter gets a short confirmation; a serious or critical one the full presidential review.
  const review: ActReview = cast.def.severity === "routine" ? { tier: "confirm" } : { tier: "full" };
  const matter = { label: "Matter", value: cast.script.subject };

  function settle(title: string, authorized: Authorized<Preparation> | undefined, beats: readonly ConversationBeat[]) {
    if (!authorized) return;
    onDone({
      title,
      subject: cast.script.subject,
      date: authorized.date,
      before: authorized.before,
      after: authorized.after,
      beats,
      ...(authorized.eventId ? { eventId: authorized.eventId } : {}),
      ...(authorized.saveError ? { saveError: authorized.saveError } : {}),
    });
  }

  const answer = async (reply: ReplyProjection) => {
    const tone = `${reply.option.tone.charAt(0).toUpperCase()}${reply.option.tone.slice(1)}`;
    const title = `Answered: ${tone}`;
    const authorized = await authorize(() => {
      if (!castStillBound(campaign, cast)) throw new Error("This decision was withdrawn: what it was about is over.");
      const result = commitReply(campaign, cast.script, reply.option, createRngStreams(campaign.seed), { consequences: BUNDLED_CONSEQUENCES });
      if (!result.ok) throw new Error(result.missingCapability);
      return { packet: rememberReply(campaign, result.packet, cast, reply.option.id), beats: result.beats };
    }, { ...review, title: `Answer: ${tone}`, lines: [matter, { label: "Your answer", value: reply.option.text }] }, place);
    settle(title, authorized, authorized?.built.beats ?? []);
  };

  const dispose = async (kind: ScenarioDispositionKind) => {
    const authorized = await authorize(() => {
      const answered = scenarioDispositionPackets(campaign, cast, kind);
      if (!answered.ok) throw new Error(answered.reason);
      return { packet: answered.packets };
    }, { ...review, title: OFFER_WORDS[kind], lines: [matter] }, place);
    settle(DONE_WORDS[kind], authorized, []);
  };

  return { busy, problem, answer, dispose };
}
