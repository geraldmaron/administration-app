import type { Campaign } from "@admin/engine";
import { appropriationStatus, orderPipeline, PLACES } from "@admin/player-core";
import type { AttentionMark } from "./attention/marks";

/** The funding line under which the Nation home already reads the budget as bad; the badge uses the same line so the two never disagree. */
export const FUNDING_ALARM_WEEKS = 8;

/** Under this many weeks of funding, a budget already flagged is flagged again. */
const FUNDING_URGENT_WEEKS = 4;

function fundingStage(shutdown: boolean, weeksLeft: number): string | undefined {
  if (shutdown) return "shutdown";
  if (weeksLeft <= FUNDING_URGENT_WEEKS) return "urgent";
  return weeksLeft <= FUNDING_ALARM_WEEKS ? "short" : undefined;
}

/**
 * Work a destination owns that is not a Desk matter: orders drafted and
 * waiting for the President's signature, and a budget that is closed or about
 * to run out. Read from the same sources the Nation home and Policy draw, and
 * tied to the section of the page that shows each.
 */
export function standingAttention(campaign: Campaign): readonly AttentionMark[] {
  const ready = orderPipeline(campaign).find((stage) => stage.stage === "desk")?.rows ?? [];
  const funding = appropriationStatus(campaign);
  const stage = fundingStage(funding.shutdown, funding.weeksLeft);
  const marks: AttentionMark[] = ready.map((row) => ({
    id: `standing:order:${row.id}`,
    place: "policy",
    title: `${row.name} is ready for your signature`,
    subject: row.name,
    status: "Ready for signature",
    href: `${PLACES.policy.href}?view=orders#order-board`,
    path: PLACES.policy.href,
    anchor: "order-board",
    version: row.stage,
  }));
  if (stage) {
    const title = funding.shutdown ? "The government is shut down" : `Funding runs out in ${funding.weeksLeft} ${funding.weeksLeft === 1 ? "week" : "weeks"}`;
    marks.push({ id: "standing:budget", place: "budget", title, href: `${PLACES.budget.href}#budget-status`, path: PLACES.budget.href, anchor: "budget-status", version: stage });
  }
  return marks;
}
