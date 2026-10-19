import {
  orderFiscalEffects,
  projectAction,
  rungDefinition,
  type Campaign,
  type Effect,
  type ExecutiveOrder,
  type ReplyOption,
  type ResolutionRequest,
  type RngStreams,
} from "@admin/engine";
import type { NationId } from "@admin/world";

// What an act would add to the national books, as the effects a price row
// prices: an order's, a rung's and a reply's. Each hands the row effects, not a
// figure, so the row prices them through the same booking the settlement uses.

/** The effects of an executive order that reach the books. */
export function orderPriceEffects(campaign: Campaign, order: ExecutiveOrder): readonly Effect[] {
  return orderFiscalEffects(campaign, order);
}

/**
 * Whether an effect out of a rolled resolution is one the actor's own books
 * read: a stat the actor's own nation carries (aid given, a debt write), or
 * choice borrowing (always the founding nation). A stat written onto the
 * target — aid received — is the other side's ledger, not the actor's.
 */
function isActorBooksEffect(effect: Effect, actor: NationId): boolean {
  if (effect.kind === "choiceBorrowing") return true;
  return effect.kind === "nationStat" && effect.nation === actor;
}

/** Conditional fiscal footprint if the instrument works, without rolling its hidden outcome. */
export function rungFiscalEffects(campaign: Campaign, request: ResolutionRequest, streams: RngStreams): readonly Effect[] {
  if (!projectAction(campaign, request, streams).ok) return [];
  return rungDefinition(request.instrument, request.rung).resolve({ campaign, actor: request.actor, target: request.target, streams, ...(request.force ? { force: request.force } : {}) })
    .filter((effect) => isActorBooksEffect(effect, request.actor));
}

/** The borrowing a reply commits the President to, if its impact borrows. */
export function replyBorrowing(option: ReplyOption): readonly Effect[] {
  const commitment = option.commitment;
  if (commitment.kind !== "position") return [];
  return (commitment.resolved ?? []).filter((effect): effect is Effect & { kind: "choiceBorrowing" } => effect.kind === "choiceBorrowing");
}
