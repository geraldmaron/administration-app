import { directiveRefusal, executiveOrder, fittingTariffStatute, institutionDef, TARIFF_STATUTES, type Campaign, type ReplyProjection } from "@admin/engine";
import { orderAuthorityRecord, resolveAuthorityText, type Authority } from "@admin/player-core";

// The law an answer rests on or runs into, only where the engine names it
// (DECISIONS §8.12): the relief order's own authority, the statute a
// consultation is owed under, and the bar an office would cite to refuse a
// directive, and the trade law a tariff is laid or lifted under. An answer the
// engine attaches no law to shows none.

export type AnswerAuthority = {
  readonly authority: Authority;
  /** How the law bears on this answer, said before the citation. */
  readonly bearing: "Based on" | "You must consult others under" | "The office can refuse it under";
};

function reliefAuthority(reply: ReplyProjection): readonly AnswerAuthority[] {
  const commitment = reply.option.commitment;
  if (commitment.kind !== "position" || !commitment.relief) return [];
  const order = executiveOrder("order-relief-program");
  const record = order?.authority ? orderAuthorityRecord(order.authority) : undefined;
  return record ? [{ authority: record, bearing: "Based on" }] : [];
}

function consultationAuthorities(reply: ReplyProjection): readonly AnswerAuthority[] {
  return (reply.consultation ?? []).flatMap((consultee) => {
    if (!("body" in consultee)) return [];
    const record = resolveAuthorityText(consultee.body);
    return record ? [{ authority: record, bearing: "You must consult others under" as const }] : [];
  });
}

function directiveAuthority(reply: ReplyProjection): readonly AnswerAuthority[] {
  const commitment = reply.option.commitment;
  if (commitment.kind !== "position" || !commitment.directive || commitment.directive.kind === "inspector-removal-notice") return [];
  const def = institutionDef(commitment.directive.institution);
  const memorandum = def ? directiveRefusal(def, commitment.directive.kind) : undefined;
  const record = memorandum ? resolveAuthorityText(memorandum.authority) : undefined;
  return record ? [{ authority: record, bearing: "The office can refuse it under" }] : [];
}

// The law is the one the engine will use at commit: found for a new tariff,
// and the statute the measure was imposed under for a lift.
function tradeAuthority(reply: ReplyProjection, campaign: Campaign): readonly AnswerAuthority[] {
  const commitment = reply.option.commitment;
  if (commitment.kind !== "position") return [];
  const statute = commitment.tariff
    ? fittingTariffStatute(campaign, commitment.tariff.target, commitment.tariff.sector, commitment.tariff.rate)
    : commitment.tariffLift ? campaign.trade.measures[commitment.tariffLift.ours.measure]?.statute : undefined;
  const record = statute ? resolveAuthorityText(TARIFF_STATUTES[statute].cite) : undefined;
  return record ? [{ authority: record, bearing: "Based on" }] : [];
}

/** Every law the engine ties to this answer, each record once. */
export function answerAuthorities(reply: ReplyProjection, campaign: Campaign): readonly AnswerAuthority[] {
  const all = [...reliefAuthority(reply), ...consultationAuthorities(reply), ...directiveAuthority(reply), ...tradeAuthority(reply, campaign)];
  return all.filter((entry, index) => all.findIndex((other) => other.authority.id === entry.authority.id) === index);
}
