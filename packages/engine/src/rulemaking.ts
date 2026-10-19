import type { Campaign } from "./state.js";
import { selectLaws } from "./state.js";
import type { Effect, EffectPacket } from "./effects.js";
import type { TurnPhase } from "./turn-loop.js";
import { actOf } from "./legislative-acts.js";
import { executiveOrder } from "./orders.js";
import { orderLandingEffects } from "./order-contribution.js";
import { realizedOrderContribution } from "./order-contribution.js";
import type { PendingRule } from "./state-orders.js";
import { leasePlanningArea } from "./order-authority-subjects.js";
import { compareDates } from "./clock.js";
import { isOrderCourtSuspended } from "./order-authority.js";

// --- Rulemaking, and the resolution that undoes it --------------------------
//
// The other half of what makes an order a decision rather than a purchase. The
// courts can take one back; Congress can take one back too, and does it by
// passing a law, which means the President gets a veto and Congress gets the
// two-thirds answer to it. Both live here because both need to know what the
// order did to the country, and the order catalogue is what knows that.

/**
 * The week a rule becomes final, and the week Congress unmakes one.
 *
 * Runs after the courts, so a strike-down and a landing that fall in the same
 * week resolve in the order they actually would: the bench speaks first, and a
 * rule it has just stayed does not then take effect.
 */
export const rulemakingPhase: TurnPhase = (state: Campaign) => {
  const effects: Effect[] = [...ruleLandings(state), ...disapprovals(state)];
  if (effects.length === 0) return [];
  const landed = effects.filter(
    (effect) => effect.kind === "pendingRule" && effect.set.status === "in-effect"
      && !effect.set.reviewFinding,
  ).length;
  const reviewed = effects.filter(
    (effect) => effect.kind === "pendingRule" && effect.set.status === "in-effect"
      && Boolean(effect.set.reviewFinding),
  ).length;
  const undone = effects.filter(
    (effect) => effect.kind === "pendingRule" && effect.set.status === "disapproved",
  ).length;
  const expiredPlans = effects.filter(
    (effect) => effect.kind === "pendingRule" && effect.set.order === "order-energy-leasing"
      && effect.set.status === "canceled",
  ).length;
  return [
    {
      source: "simulate",
      actor: "world",
      turn: state.turn + 1,
      narration: { summary: rulemakingSummary(landed, undone, reviewed, expiredPlans) },
      effects,
    },
  ] satisfies readonly EffectPacket[];
};

/** The proceedings that finished this week, and what they do to the country. */
function ruleLandings(state: Campaign): readonly Effect[] {
  return state.pendingRules
    .filter((rule) => rule.status === "pending" && !isOrderCourtSuspended(state, rule.id)
      && (state.turn >= rule.effectiveTurn || expiredLeasePlan(state, rule)))
    .flatMap((rule): readonly Effect[] => {
      const order = executiveOrder(rule.order);
      if (!order) return [];
      if (expiredLeasePlan(state, rule)) return [
        { kind: "pendingRule", set: { ...rule, status: "canceled", resolvedTurn: state.turn } },
        { kind: "feed", items: [{ turn: state.turn + 1, kind: "governance", visibility: "public",
          headline: "The named offshore leasing program ends before the agency completes its planning rule; no sale or permit follows.",
          facts: { instrument: order.name } }] },
      ];
      const finding = rule.order === "order-regulatory-review" ? reviewFinding(state, rule) : undefined;
      const target = finding ? state.pendingRules.find((entry) => entry.id === finding.targetRuleId) : undefined;
      const targetName = target ? executiveOrder(target.order)?.name ?? target.order : "the named rule";
      return [
        { kind: "pendingRule", set: { ...rule, status: "in-effect", resolvedTurn: state.turn,
          nationContribution: realizedOrderContribution(state, order.nationEffects), ...(finding ? { reviewFinding: finding } : {}) } },
        ...orderLandingEffects(state, order.nationEffects, rule.id),
        {
          kind: "feed",
          items: [
            {
              turn: state.turn + 1,
              kind: "governance",
              visibility: "public",
              headline: finding
                ? `Agency review of ${targetName.toLowerCase()} is complete: ${reviewFindingLine(finding.disposition)}.`
                : `The rule behind ${order.name.toLowerCase()} is final, and binds from this week.`,
              facts: { instrument: order.name, stake: order.summary },
            },
          ],
        },
      ];
    });
}

function expiredLeasePlan(state: Campaign, rule: PendingRule): boolean {
  if (rule.order !== "order-energy-leasing") return false;
  const signature = state.orders.find((record) => record.id === rule.id);
  const area = signature?.subject?.kind === "lease-planning" ? leasePlanningArea(signature.subject.areaId) : undefined;
  return Boolean(area && compareDates(state.calendar, area.programThrough) > 0);
}

function reviewFinding(state: Campaign, review: PendingRule): NonNullable<PendingRule["reviewFinding"]> | undefined {
  const signature = state.orders.find((record) => record.id === review.id);
  if (signature?.subject?.kind !== "rule-review") return undefined;
  const targetRuleId = signature.subject.ruleId;
  const target = state.pendingRules.find((rule) => rule.id === targetRuleId);
  const targetSignature = state.orders.find((record) => record.id === targetRuleId);
  const operative = target?.status === "in-effect" && targetSignature !== undefined
    && targetSignature.rescindedTurn === undefined && targetSignature.review?.status !== "struck-down";
  const defect = target?.process && (target.process.noticeWeeks < 4
    || !target.process.commentsAnswered || !target.process.siteReviewPreserved);
  return { targetRuleId, disposition: !operative ? "closed-without-action" : defect ? "recommend-revision" : "retain" };
}

function reviewFindingLine(disposition: NonNullable<PendingRule["reviewFinding"]>["disposition"]): string {
  if (disposition === "closed-without-action") return "the target no longer operates";
  return disposition === "recommend-revision" ? "the agency recommends a separate revision" : "the agency recommends retaining it";
}

/**
 * The rules Congress has disapproved, undone.
 *
 * Matched from the statute book rather than stamped by the enactment, because
 * an act becomes law by four different routes — signature, lapse, override,
 * and a veto that failed — and a rule that survived because one of those
 * routes forgot to undo it would be a law with nothing behind it.
 */
function disapprovals(state: Campaign): readonly Effect[] {
  const disapproved = new Set(
    selectLaws(state).flatMap((bill) =>
      actOf(bill)?.disapproves === true && bill.target !== undefined ? [bill.target] : [],
    ),
  );
  return state.pendingRules
    .filter((rule) => rule.status === "in-effect" && disapproved.has(rule.order))
    .flatMap((rule): readonly Effect[] => {
      const order = executiveOrder(rule.order);
      if (!order) return [];
      return [
        { kind: "pendingRule", set: { ...rule, status: "disapproved", resolvedTurn: state.turn } },
        { kind: "orderRemedy", ruleId: rule.id },
        {
          kind: "feed",
          items: [
            {
              turn: state.turn + 1,
              kind: "governance",
              visibility: "public",
              headline: `Congress disapproves the rule behind ${order.name.toLowerCase()}; it has no force, and cannot be issued again.`,
              facts: { instrument: order.name, stake: order.summary },
            },
          ],
        },
      ];
    });
}

function rulemakingSummary(landed: number, undone: number, reviewed: number, expiredPlans: number): string {
  const parts: string[] = [];
  if (expiredPlans > 0) parts.push(expiredPlans === 1
    ? "A pending offshore lease plan ends with its authorizing program."
    : `${expiredPlans} pending offshore lease plans end with their authorizing programs.`);
  if (reviewed > 0) parts.push(reviewed === 1
    ? "An agency completes its review of a named existing rule."
    : `${reviewed} agencies complete reviews of named existing rules.`);
  if (landed > 0) {
    parts.push(
      landed === 1
        ? "A rule this administration ordered written is final this week."
        : `${landed} rules this administration ordered written are final this week.`,
    );
  }
  if (undone > 0) {
    parts.push(
      undone === 1
        ? "Congress strikes one of them down by resolution, and what it did is undone."
        : `Congress strikes ${undone} of them down by resolution, and what they did is undone.`,
    );
  }
  return parts.join(" ");
}
