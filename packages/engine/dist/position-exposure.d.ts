import { type Campaign } from "./state.js";
import type { ConversationScript, ReplyCommitment } from "./conversations.js";
export type PositionExposure = {
    /** Stable per branch, so a surface or a check can name one without matching prose. */
    readonly id: string;
    readonly description: string;
};
type Position = Extract<ReplyCommitment, {
    kind: "position";
}>;
/**
 * Everything this answer exposes, heaviest first.
 *
 * The order is a judgment about what a president needs to meet first when the
 * surface has room for one line: a war before a briefing, a briefing before a
 * debt the country carries past the term, the debt before the force, the force
 * before a foreign capital's memory, a capital's memory before the people and
 * places at home, and the argument about where you stand last — it is the one
 * the player already knows they are having.
 */
export declare function projectPositionExposure(campaign: Campaign, script: ConversationScript, commitment: Position): readonly PositionExposure[];
export {};
