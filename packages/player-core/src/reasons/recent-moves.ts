import { selectFeed, type Campaign, type DecisionStamp } from "@admin/engine";
import type { NationId } from "@admin/world";
import { reasonLines, type ReasonLine } from "./reason-lines";

// What a foreign government has done lately, and why.
//
// The moves are the ones the wire carried — the feed already applies the rule
// for which of a government's acts the President could have learned of — so a
// covert act the services never saw is not on its file either. The why is the
// decision stamp the act was resolved with, rendered only where the services
// read the government that made it.

export type RecentMove = {
  readonly turn: number;
  /** "This week", "Last week", "5 weeks ago". */
  readonly when: string;
  readonly headline: string;
  readonly target?: NationId;
  /** Empty where the services cannot read the government, or no stamp was kept. */
  readonly reasons: readonly ReasonLine[];
};

const MOVES_SHOWN = 3;

function weeksAgo(now: number, turn: number): string {
  const weeks = Math.max(0, now - turn);
  return weeks === 0 ? "This week" : weeks === 1 ? "Last week" : `${weeks} weeks ago`;
}

/** The stamp the act on this turn against this target was resolved with, if one was kept. */
function stampFor(campaign: Campaign, nation: NationId, turn: number, target: NationId | undefined): DecisionStamp | undefined {
  for (let index = campaign.ledger.length - 1; index >= 0; index -= 1) {
    const entry = campaign.ledger[index]!;
    if (entry.turn < turn) break;
    const stamp = entry.causal?.decision;
    if (entry.turn === turn && stamp?.question === "npc-act" && stamp.actor === nation && stamp.subject === target) return stamp;
  }
  return undefined;
}

/** A government's latest moves as the wire reported them, newest first, each with its reasons where they can be read. */
export function recentMoves(campaign: Campaign, nation: NationId, limit: number = MOVES_SHOWN): readonly RecentMove[] {
  return [...selectFeed(campaign)]
    .filter((item) => item.kind === "npc-action" && item.actor === nation)
    .sort((a, b) => b.turn - a.turn)
    .slice(0, limit)
    .map((item) => {
      const stamp = stampFor(campaign, nation, item.turn, item.target);
      return {
        turn: item.turn,
        when: weeksAgo(campaign.turn, item.turn),
        headline: item.headline,
        ...(item.target ? { target: item.target } : {}),
        reasons: stamp ? reasonLines(stamp, campaign) : [],
      };
    });
}
