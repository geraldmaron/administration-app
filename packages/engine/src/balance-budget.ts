import { projectAppropriation, requestAppropriation } from "./appropriation.js";
import type { ProxyProfile } from "./balance-proxies.js";
import { selectBudget } from "./budget.js";
import { projectBudgetDraft } from "./budget-draft.js";
import { selectBudgetYear, selectFiscalYearEndTurn } from "./clock.js";
import { apply } from "./effects.js";
import { answerResignationOffer } from "./cabinet-agenda-acts.js";
import { SLOW_WALK_QUALITY } from "./directives.js";
import { accountCap } from "./funding.js";
import { institutionForRole } from "./institutions.js";
import { requestOmnibus } from "./omnibus.js";
import type { Campaign } from "./state.js";

// The budget a careful proxy sends up. A real administration transmits a
// budget for every fiscal year and takes the count, rather than governing a
// whole term on stopgaps; the harness never did, so the per-account vote and
// the trade between the carrier and the safety net were proven only by unit
// convergence and never across a campaign. Where the lines would not clear the
// Senate one at a time, it negotiates an omnibus, giving half of every change
// away for the other side's votes, and a stopgap is what is left if even that
// does not carry.

/** A proxy that keeps most of its authority in reserve governs through the regular order. */
const CAREFUL_RESERVE = 0.8;

/**
 * When the budget goes up: a quarter before the book in force runs out, and
 * again in the last week of every stopgap after it, because each deadline is
 * the week a full-year bill can still replace the next stopgap.
 */
const BUDGET_LEAD_TURNS = 13;

/**
 * What the careful budget moves: a fifth of a point of output from the
 * military account to the domestic one, the same total asked for, so the vote
 * is about priorities rather than about more money.
 */
const REALLOCATED_SHARE = 0.002;

function careful(profile: ProxyProfile): boolean {
  return profile.reserveShare >= CAREFUL_RESERVE && profile.oddsFloor <= 1;
}

/**
 * The week's budget, if this proxy sends one: only a careful proxy, only on a
 * deadline, and only while the next fiscal year is not yet paid for. A refused
 * budget leaves the government on the prior year's numbers, which is what a
 * refusal is.
 */
export function voteBudget(campaign: Campaign, profile: ProxyProfile): Campaign {
  if (!careful(profile)) return campaign;
  const book = campaign.congress.appropriation;
  const left = book.throughTurn - campaign.turn;
  if (left !== BUDGET_LEAD_TURNS && left !== 0) return campaign;
  if (book.throughTurn >= selectFiscalYearEndTurn(campaign, selectBudgetYear(campaign))) return campaign;
  const standing = selectBudget(campaign);
  const moved = Math.min(REALLOCATED_SHARE, standing.military, accountCap(campaign, "domestic") - standing.domestic);
  if (moved <= 0) return campaign;
  const draft = projectBudgetDraft(campaign, { military: standing.military - moved, domestic: standing.domestic + moved });
  if (!draft.ok) return campaign;
  const regular = projectAppropriation(campaign, draft.candidate).wouldPass;
  const result = regular ? requestAppropriation(campaign, draft.candidate) : requestOmnibus(campaign, draft.candidate);
  return result.ok ? apply(campaign, result.packet) : campaign;
}

/**
 * The offers to resign a careful proxy has on its Desk this week, answered. A
 * President who reads the Desk answers every one: they accept the Secretary
 * whose department is failing under them and ask the rest to stay. Left
 * unanswered, every offer lapsed and cost the Secretary's loyalty, so a
 * careful cabinet leaked like an ignored one and almost nobody left it.
 * Returns the week's campaign and how many Secretaries were let go.
 */
export function answerOffers(campaign: Campaign, profile: ProxyProfile): { readonly campaign: Campaign; readonly accepted: number } {
  if (!careful(profile)) return { campaign, accepted: 0 };
  return (campaign.cabinetAgenda?.offers ?? []).reduce(
    (week, offer) => {
      const department = institutionForRole(offer.role);
      const quality = department ? week.campaign.institutions[department.id]?.implementationQuality : undefined;
      const failing = quality !== undefined && quality < SLOW_WALK_QUALITY;
      const answered = answerResignationOffer(week.campaign, offer.id, failing ? "accept" : "decline");
      return answered.ok ? { campaign: apply(week.campaign, answered.packet), accepted: week.accepted + (failing ? 1 : 0) } : week;
    },
    { campaign, accepted: 0 },
  );
}
