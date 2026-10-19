import { selectFeed } from "@admin/engine";
import { reasonLines } from "./reason-lines";
const MOVES_SHOWN = 3;
function weeksAgo(now, turn) {
    const weeks = Math.max(0, now - turn);
    return weeks === 0 ? "This week" : weeks === 1 ? "Last week" : `${weeks} weeks ago`;
}
/** The stamp the act on this turn against this target was resolved with, if one was kept. */
function stampFor(campaign, nation, turn, target) {
    for (let index = campaign.ledger.length - 1; index >= 0; index -= 1) {
        const entry = campaign.ledger[index];
        if (entry.turn < turn)
            break;
        const stamp = entry.causal?.decision;
        if (entry.turn === turn && stamp?.question === "npc-act" && stamp.actor === nation && stamp.subject === target)
            return stamp;
    }
    return undefined;
}
/** A government's latest moves as the wire reported them, newest first, each with its reasons where they can be read. */
export function recentMoves(campaign, nation, limit = MOVES_SHOWN) {
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
