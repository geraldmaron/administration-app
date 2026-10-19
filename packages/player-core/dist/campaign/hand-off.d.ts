import { type Campaign, type GameDate } from "@admin/engine";
import type { CastScenario } from "@admin/content";
import { type AttentionPolicySettings } from "../desk/attention";
import type { AttentionItem } from "../desk/attention-row";
/**
 * Whether a waiting matter has to come from the President.
 *
 * The office's own deadlines, anything a statute is running a clock on, and any
 * matter at its last call. Everything else a chief of staff can take off the
 * desk, because putting it off is already something the President may do.
 */
export declare function mustComeFromPresident(item: AttentionItem, today: GameDate): boolean;
export type HandOffPlan = {
    /** What stays on the desk and keeps holding Continue. */
    readonly kept: readonly AttentionItem[];
    /** Desk rows put off, each as its own row's put-off. */
    readonly rows: readonly AttentionItem[];
    /** Decisions left unanswered, each charged as the silence it is. */
    readonly decisions: readonly CastScenario[];
};
/** Who would take what. Reads every owed row, not only the three presented, so the run does not stop on the next one in line. */
export declare function handOffPlan(campaign: Campaign, settings?: AttentionPolicySettings): HandOffPlan;
/** Whether the press would leave nothing holding Continue. */
export declare function handOffClears(plan: HandOffPlan): boolean;
/**
 * Applies the hand-off and says what stayed.
 *
 * Decisions are seated first so each one resolved is a case closed on the
 * record, not a draw that comes back tomorrow. A row is put off with its own
 * row's packet; a decision is charged its silence and closed as left to its
 * default. Every one is a player act on the ledger, so each is on the Record.
 */
export declare function handOff(campaign: Campaign, settings?: AttentionPolicySettings): {
    readonly campaign: Campaign;
    readonly kept: readonly AttentionItem[];
};
