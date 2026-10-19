import type { Campaign, ReplyProjection } from "@admin/engine";
import type { CastScenario } from "@admin/content";
import { decisionOutcomes, type DecisionComparison } from "@admin/player-core";
import type { IconName } from "@admin/ui";
import type { CompareOption, OptionAccent } from "@admin/ui/review";

// A decision's answers as the results list draws them: each answer's cost,
// odds, moves and worst case read off the one comparison the engine priced,
// every reading a change from today. Leaving it unanswered is no answer; its
// cost is the silence line beside them. Nothing here prices; it only names and
// labels.

export const upperFirst = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

type Look = { readonly icon: IconName; readonly accent: OptionAccent };

const TONE_LOOK: Readonly<Record<string, Look>> = {
  firm: { icon: "escalate", accent: "red" },
  coercive: { icon: "instrumentMilitary", accent: "red" },
  conciliatory: { icon: "summit", accent: "blue" },
  principled: { icon: "law", accent: "gold" },
  evasive: { icon: "hidden", accent: "neutral" },
};
const FALLBACK_LOOK: Look = { icon: "decision", accent: "blue" };

/** The other government by name, or the public when the matter is at home. */
export function counterpartName(campaign: Campaign, cast: CastScenario): string {
  const nation = campaign.nations[cast.counterpart];
  return nation && cast.counterpart !== campaign.founding.nation ? nation.base.identity.name : "The public";
}

/** Each answer as one results row, with its cost, odds, moves and worst case drawn from the same comparison. */
export function choiceOptions(comparison: DecisionComparison): readonly CompareOption[] {
  const outcomes = decisionOutcomes(comparison);
  return comparison.options.map((option, index) => ({
    id: option.id,
    label: upperFirst(option.tone),
    ...(TONE_LOOK[option.tone] ?? FALLBACK_LOOK),
    outcome: outcomes[index]!,
    lead: option.text,
    ...(option.locked ? { unavailable: `Not available right now. ${option.locked}` } : {}),
  }));
}

/** What authorizing the picked answer will do, in one line beside the verb. */
export function reviewOf(reply: ReplyProjection | undefined): string | undefined {
  if (!reply) return undefined;
  const timing = reply.timing?.days ? ` It takes time to carry out (${reply.timing.label.toLowerCase()}). Some costs hit right away.` : "";
  return `You'll say: “${reply.option.text}”${timing} Your answer and what it costs go on your Record.`;
}

/** The verb on the one control: an answer with its own clock starts preparing rather than speaking. */
export function verbOf(reply: ReplyProjection | undefined): string {
  return reply?.timing?.days ? "Start preparing" : "Give this answer";
}

/** Force, coercion or a firm line abroad is drawn as danger in the review; the rest as a signature. */
export function dangerOf(reply: ReplyProjection | undefined): boolean {
  if (!reply) return false;
  return reply.option.commitment.kind === "instrument" || reply.option.commitment.kind === "join" || reply.option.tone === "coercive";
}
