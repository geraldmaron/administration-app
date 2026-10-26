import { worldDataset } from "@admin/world";
import { closeTasking, taskCollection } from "./intelligence.js";
import { executiveOrder, orderAvailability, projectOrder } from "./orders.js";
import { localeAct, localeAvailability } from "./locale-acts.js";
import { localeActPrice } from "./locale-act-effects.js";
import type { Campaign } from "./state.js";
import type { DeltaMetricKey, Effect, MetricDeltas } from "./effects.js";
import type { MetricCost } from "./resolution.js";
import type { ReplyCommitment } from "./conversations.js";
import { realizePositionCost } from "./position-assessment.js";
import { transmit } from "./legislation.js";
import { proposeBillText, recommendBillConferenceText } from "./bill-text-actions.js";
import { fittingTariffStatute, imposeTariff } from "./tariff-orders.js";
import { liftMeasure, type TradeMeasure, type TradeMeasureId } from "./trade.js";
import { selectNation } from "./state.js";
import { issueDirective } from "./directives.js";
import { selectMatter } from "./oversight.js";
import { conclusoryAccount, fileInspectorRemovalNotice } from "./inspectors-general.js";
import { institutionDef } from "./institutions.js";
import { openNomination } from "./nomination.js";
import { campaignDay } from "./clock.js";
import { rescindOrder } from "./order-lifecycle.js";
import { answerLowerOrderReview } from "./judicial-review.js";

export function reliefProjection(campaign: Campaign, subject: Extract<ReplyCommitment, { kind: "position" }>["relief"]):
  { readonly ok: true; readonly cost: MetricCost } | { readonly ok: false; readonly reason: string } {
  if (!subject) return { ok: true, cost: {} };
  const order = executiveOrder("order-relief-program");
  const charter = worldDataset.charters.find((entry) => entry.id === campaign.founding.charter);
  if (!order || !charter) return { ok: false, reason: "The federal relief authority is unavailable." };
  const available = orderAvailability(campaign, order, subject);
  if (!available.ok) return { ok: false, reason: available.missing };
  return { ok: true, cost: projectOrder(campaign, charter, order).cost };
}

export function localeProjection(campaign: Campaign, request: Extract<ReplyCommitment, { kind: "position" }>["locale"]):
  { readonly ok: true; readonly cost: MetricCost } | { readonly ok: false; readonly reason: string } {
  if (!request) return { ok: true, cost: {} };
  const act = localeAct(request.act);
  if (!act) return { ok: false, reason: "No such state response." };
  const availability = localeAvailability(campaign, request.state, act, request.cause);
  if (!availability.ok) return { ok: false, reason: availability.missing };
  // The act's own price, unrequested standing included, as the packet charges
  // it. What a suit or an incident would add is drawn when the act is taken
  // and is not quoted before.
  return { ok: true, cost: localeActPrice(campaign, request.state, act) };
}

export function collectionAction(campaign: Campaign, action: Extract<ReplyCommitment, { kind: "position" }>["collection"]):
  { readonly ok: true; readonly effects: readonly Effect[] } | { readonly ok: false; readonly reason: string } {
  if (!action) return { ok: true, effects: [] };
  const result = action.action === "close" ? closeTasking(campaign, action.tasking) : taskCollection(campaign, action.request);
  if (!result.ok) return { ok: false, reason: result.reason };
  const refusal = result.packet.effects.find((effect) => effect.kind === "intelligence" && effect.refusal !== undefined);
  if (refusal) return { ok: false, reason: "The proposed collection tasking is outside the element's authority." };
  return { ok: true, effects: result.packet.effects };
}

export function transmissionAction(campaign: Campaign, actId: string | undefined):
  { readonly ok: true; readonly effects: readonly Effect[]; readonly summary?: string } | { readonly ok: false; readonly reason: string } {
  if (!actId) return { ok: true, effects: [] };
  const result = transmit(campaign, actId);
  return result.ok ? { ok: true, effects: result.packet.effects, summary: result.packet.narration.summary } : result;
}

export function tariffAction(campaign: Campaign, request: Extract<ReplyCommitment, { kind: "position" }>["tariff"]):
  { readonly ok: true; readonly effects: readonly Effect[]; readonly summary?: string } | { readonly ok: false; readonly reason: string } {
  if (!request) return { ok: true, effects: [] };
  if (request.target === campaign.founding.nation) return { ok: false, reason: "A tariff is laid on another country's goods, not our own." };
  if (request.answering !== undefined) {
    const pinned = campaign.trade.measures[request.answering];
    if (!pinned || pinned.kind !== "tariff" || pinned.origin !== "retaliation" || pinned.liftedTurn !== undefined ||
      pinned.actor !== request.target || pinned.target !== request.target || pinned.sector !== request.sourceSector ||
      pinned.rate !== request.sourceRate || pinned.imposedTurn !== request.sourceTurn) {
      return { ok: false, reason: "The retaliation this answer addresses is no longer active." };
    }
  }
  // The law is found for this country, goods and rate rather than assumed: an
  // answer to their tariff fits Section 338, and a tariff the week itself
  // proposes needs whatever finding covers that country.
  const statute = fittingTariffStatute(campaign, request.target, request.sector, request.rate);
  if (!statute) return { ok: false, reason: "No trade law covers this tariff at that rate." };
  const result = imposeTariff(campaign, statute, request.target, request.sector, request.rate);
  return result.ok ? { ok: true, effects: result.packet.effects, summary: result.packet.narration.summary } : result;
}

type PinnedMeasure = { readonly measure: TradeMeasureId; readonly sector: string; readonly rate: number; readonly imposedTurn: number };

function stillPinned(campaign: Campaign, pin: PinnedMeasure, origin: TradeMeasure["origin"]): TradeMeasure | undefined {
  const live = campaign.trade.measures[pin.measure];
  return live && live.kind === "tariff" && live.origin === origin && live.liftedTurn === undefined &&
    live.sector === pin.sector && live.rate === pin.rate && live.imposedTurn === pin.imposedTurn ? live : undefined;
}

/**
 * Lift this administration's tariff that a partner's retaliation answers, and
 * with `theirs` the retaliation as well, the two ending together as agreed.
 *
 * Ours goes through `liftMeasure`, the same lift the trade desk signs, so the
 * shelf price and the relationship move exactly as they would there. Their
 * answer added no American shelf price when it landed, so nothing comes off
 * the shelf when it ends.
 */
export function tariffLiftAction(campaign: Campaign, request: Extract<ReplyCommitment, { kind: "position" }>["tariffLift"]):
  { readonly ok: true; readonly effects: readonly Effect[]; readonly summary?: string } | { readonly ok: false; readonly reason: string } {
  if (!request) return { ok: true, effects: [] };
  if (!stillPinned(campaign, request.ours, "us")) return { ok: false, reason: "The tariff this answer lifts is no longer in force." };
  const theirs = request.theirs ? stillPinned(campaign, request.theirs, "retaliation") : undefined;
  if (request.theirs && !theirs) return { ok: false, reason: "Their tariff this agreement ends is no longer in force." };
  const lifted = liftMeasure(campaign, request.ours.measure);
  if (!lifted.ok) return lifted;
  const theirName = theirs ? selectNation(campaign, theirs.target)?.base.identity.name ?? String(theirs.target) : undefined;
  return {
    ok: true,
    effects: [...lifted.packet.effects, ...(theirs ? [{ kind: "trade" as const, lift: theirs.id }] : [])],
    summary: theirs ? `${lifted.packet.narration.summary} ${theirName} lifts its answering tariff the same day.` : lifted.packet.narration.summary,
  };
}

export function directiveAction(campaign: Campaign, request: Extract<ReplyCommitment, { kind: "position" }>["directive"]):
  { readonly ok: true; readonly effects: readonly Effect[]; readonly summary?: string } | { readonly ok: false; readonly reason: string } {
  if (!request) return { ok: true, effects: [] };
  const pinned = selectMatter(campaign, request.matterId);
  if (!pinned || pinned.stage === "closed" || pinned.origin.kind !== "inspector-general" ||
    pinned.origin.institution !== request.institution || pinned.subject !== request.matterSubject ||
    pinned.openedTurn !== request.openedTurn) {
    return { ok: false, reason: "The inspector general matter this answer addresses is no longer open." };
  }
  const result = request.kind === "inspector-removal-notice"
    ? fileInspectorRemovalNotice(campaign, request.institution, conclusoryAccount(request.reason, pinned.id, campaign.turn))
    : issueDirective(campaign, { institution: request.institution, kind: request.kind, subject: request.subject });
  return result.ok ? { ok: true, effects: result.packet.effects, summary: result.packet.narration.summary } : result;
}

export function billTextAction(campaign: Campaign, request: Extract<ReplyCommitment, { kind: "position" }>["billText"]):
  { readonly ok: true; readonly effects: readonly Effect[]; readonly summary?: string } | { readonly ok: false; readonly reason: string } {
  if (!request) return { ok: true, effects: [] };
  const pinned = campaign.bills?.[request.id];
  if (!pinned || pinned.status !== "in-progress" || pinned.act !== request.act || pinned.title !== request.title ||
    pinned.introducedTurn !== request.introducedTurn || pinned.stage !== request.stage ||
    JSON.stringify(pinned.text ?? null) !== JSON.stringify(request.text ?? null)) {
    return { ok: false, reason: "The bill this answer addresses has changed." };
  }
  const result = request.action === "propose" ? proposeBillText(campaign, request.id) :
    recommendBillConferenceText(campaign, request.id, request.choice);
  return result.ok ? { ok: true, effects: result.packet.effects, summary: result.packet.narration.summary } : result;
}

/** Keep the announced candidate tied to the vacant seat that produced the case. */
export function judicialNominationAction(campaign: Campaign, request: Extract<ReplyCommitment, { kind: "position" }>["judicialNomination"]):
  { readonly ok: true; readonly effects: readonly Effect[]; readonly summary?: string } | { readonly ok: false; readonly reason: string } {
  if (!request) return { ok: true, effects: [] };
  const office = institutionDef(request.institution)?.offices[0];
  if (!campaign.institutions[request.institution]?.vacancy || office?.id !== request.office ||
    office.title !== request.title ||
    campaignDay(campaign) - campaign.institutions[request.institution]!.vacantDays !== request.vacancyOpenedDay ||
    campaign.people[request.nominee]?.base.name !== request.nomineeName) {
    return { ok: false, reason: "The Court seat or candidate this answer addresses has changed." };
  }
  const result = openNomination(campaign, request.office, request.nominee);
  return result.ok ? { ok: true, effects: result.packet.effects, summary: result.packet.narration.summary } : result;
}

/** Rescind prospectively without erasing the proceeding or any surviving injury. */
export function orderRescissionAction(campaign: Campaign, request: Extract<ReplyCommitment, { kind: "position" }>["orderRescission"]):
  { readonly ok: true; readonly effects: readonly Effect[]; readonly summary?: string } | { readonly ok: false; readonly reason: string } {
  if (!request) return { ok: true, effects: [] };
  const proceeding = campaign.judiciary.proceedings?.find((entry) => entry.id === request.proceedingId);
  const record = campaign.orders.find((entry) => entry.id === request.recordId);
  if (proceeding?.subject.kind !== "executive-order" || proceeding.subject.recordId !== request.recordId ||
    proceeding.subject.orderId !== request.orderId || proceeding.filedTurn !== request.filedTurn ||
    proceeding.stage !== request.stage || (proceeding.matter?.question ?? "Whether this order is lawful.") !== request.question ||
    record?.order !== request.orderId || record.review?.status !== "pending" ||
    executiveOrder(request.orderId)?.name !== request.orderName) {
    return { ok: false, reason: "The pending Court case this answer addresses has changed." };
  }
  const result = rescindOrder(campaign, request.recordId);
  return result.ok ? { ok: true, effects: result.packet.effects, summary: result.packet.narration.summary } : result;
}

/** Answer the pinned adverse lower judgment and close its existing dated court-response case. */
export function orderReviewAction(campaign: Campaign, request: Extract<ReplyCommitment, { kind: "position" }>["orderReview"]):
  { readonly ok: true; readonly effects: readonly Effect[]; readonly summary?: string } | { readonly ok: false; readonly reason: string } {
  if (!request) return { ok: true, effects: [] };
  const proceeding = campaign.judiciary.proceedings?.find((entry) => entry.id === request.proceedingId);
  const record = campaign.orders.find((entry) => entry.id === request.recordId);
  const rule = campaign.pendingRules.find((entry) => entry.id === request.recordId);
  const state = !rule || rule.status === "in-effect" ? "operative" :
    rule.status === "pending" || rule.status === "stayed" ? "unimplemented" : undefined;
  if (proceeding?.subject.kind !== "executive-order" || proceeding.subject.recordId !== request.recordId ||
    proceeding.subject.orderId !== request.orderId || proceeding.filedTurn !== request.filedTurn ||
    proceeding.stage !== "appeal" || proceeding.lower?.holding !== "struck-down" ||
    proceeding.lower.enforcement !== "in-force" ||
    (proceeding.matter?.question ?? "Whether this order is lawful.") !== request.question ||
    record?.order !== request.orderId || record.review?.status !== "pending" ||
    executiveOrder(request.orderId)?.name !== request.orderName || state !== request.ruleState) {
    return { ok: false, reason: "The lower judgment this answer addresses has changed." };
  }
  const result = answerLowerOrderReview(campaign, request.proceedingId, request.choice);
  return result.ok ? { ok: true, effects: result.packet.effects, summary: result.packet.narration.summary } : result;
}

/** Quote both authored and resolved metric costs, or the price of a typed report action. */
export function quotedPositionCost(campaign: Campaign, commitment: Extract<ReplyCommitment, { kind: "position" }>): MetricCost {
  if (commitment.relief) {
    const relief = reliefProjection(campaign, commitment.relief);
    return relief.ok ? relief.cost : {};
  }
  if (commitment.locale) {
    const locale = localeProjection(campaign, commitment.locale);
    return locale.ok ? locale.cost : {};
  }
  const resolvedDeltas = (commitment.resolved ?? []).filter((effect): effect is Effect & { kind: "metric" } => effect.kind === "metric");
  return resolvedDeltas.reduce<MetricDeltas>(
    (total, effect) => {
      for (const [key, delta] of Object.entries(effect.deltas) as [DeltaMetricKey, number | undefined][]) {
        if (delta === undefined) continue;
        total[key] = (total[key] ?? 0) + delta;
      }
      return total;
    },
    { ...realizePositionCost(campaign, commitment.cost) },
  ) as MetricCost;
}
