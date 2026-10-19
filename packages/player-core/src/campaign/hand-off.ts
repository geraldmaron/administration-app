// "Hand the rest to the Chief of Staff and continue": one press that resolves
// every waiting matter a chief of staff may take off the President's desk, by
// the same inaction the President could have chosen row by row.
import { daysBetween, apply, type AttentionSource, type Campaign, type GameDate } from "@admin/engine";
import type { CastScenario } from "@admin/content";
import { LAST_CALL_DAYS } from "../desk/attention-policy";
import { matterFor, owedItems, type AttentionPolicySettings } from "../desk/attention";
import type { AttentionItem } from "../desk/attention-row";
import { leaveUnansweredPackets } from "../conversation/scenario-dispositions";
import { withWithdrawnScenarioCases } from "../conversation/scenario-cases";
import { pendingConversations, seatScenarioCases } from "../conversation/scripts";
import { seatFamilyCases } from "../desk/family-cases";
import { deferMatterPacket } from "./stop-brief";

// A constitutional deadline and a bill's signing window are the President's by
// the Constitution itself: a chief of staff cannot sign, veto or take an oath.
const PRESIDENT_ONLY: ReadonlySet<AttentionSource> = new Set<AttentionSource>(["constitutional-deadline", "bill-signature"]);

/**
 * Whether a waiting matter has to come from the President.
 *
 * The office's own deadlines, anything a statute is running a clock on, and any
 * matter at its last call. Everything else a chief of staff can take off the
 * desk, because putting it off is already something the President may do.
 */
export function mustComeFromPresident(item: AttentionItem, today: GameDate): boolean {
  if (PRESIDENT_ONLY.has(item.source)) return true;
  if (item.clock?.kind === "statutory") return true;
  return item.dueDate !== undefined && daysBetween(today, item.dueDate) <= LAST_CALL_DAYS;
}

export type HandOffPlan = {
  /** What stays on the desk and keeps holding Continue. */
  readonly kept: readonly AttentionItem[];
  /** Desk rows put off, each as its own row's put-off. */
  readonly rows: readonly AttentionItem[];
  /** Decisions left unanswered, each charged as the silence it is. */
  readonly decisions: readonly CastScenario[];
};

/** Who would take what. Reads every owed row, not only the three presented, so the run does not stop on the next one in line. */
export function handOffPlan(campaign: Campaign, settings?: AttentionPolicySettings): HandOffPlan {
  const owed = owedItems(campaign, settings);
  return {
    kept: owed.filter((item) => mustComeFromPresident(item, campaign.calendar)),
    rows: owed.filter((item) => !mustComeFromPresident(item, campaign.calendar)),
    decisions: pendingConversations(campaign),
  };
}

/** Whether the press would leave nothing holding Continue. */
export function handOffClears(plan: HandOffPlan): boolean {
  return plan.kept.length === 0 && plan.rows.length + plan.decisions.length > 0;
}

// The silence is charged exactly as Continue charges a walked-past decision,
// skipped where Continue would skip it, so the press is never a cheaper way
// past a decision than walking past it; the President leaving it unanswered
// from the decision itself is charged by the same packets.
function resolveDecision(campaign: Campaign, cast: CastScenario): Campaign {
  const packets = leaveUnansweredPackets(campaign, cast, "allow-default", {
    summary: `Handed to the Chief of Staff: ${cast.script.subject}.`,
    onCase: "Handed to the Chief of Staff and left unanswered.",
  });
  return packets.reduce((state, packet) => apply(state, packet), campaign);
}

/**
 * Applies the hand-off and says what stayed.
 *
 * Decisions are seated first so each one resolved is a case closed on the
 * record, not a draw that comes back tomorrow. A row is put off with its own
 * row's packet; a decision is charged its silence and closed as left to its
 * default. Every one is a player act on the ledger, so each is on the Record.
 */
export function handOff(campaign: Campaign, settings?: AttentionPolicySettings): { readonly campaign: Campaign; readonly kept: readonly AttentionItem[] } {
  const seated = seatFamilyCases(seatScenarioCases(campaign));
  const plan = handOffPlan(seated, settings);
  const decided = plan.decisions.reduce(resolveDecision, seated);
  const handed = plan.rows.reduce((state, item) => apply(state, deferMatterPacket(state, matterFor(item, state.calendar))), decided);
  return { campaign: withWithdrawnScenarioCases(handed), kept: plan.kept };
}
