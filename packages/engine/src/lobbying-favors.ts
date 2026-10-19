import type { Campaign, Favor, HillPostId } from "./state.js";
import { selectBillsInProgress } from "./state.js";
import { actCost, actOf, type LegislativeAct } from "./legislative-acts.js";
import { obligationAvailability } from "./funding.js";
import type { BudgetAccount } from "./budget.js";
import { openFavorsOwedByPresident } from "./ties.js";

// What a budget negotiation on the Hill leaves the President owing.
//
// International `commitments.ts` is force and aid abroad. A budget negotiation
// on the Hill is a domestic appropriation claim: support on live fiscal business
// in exchange for a place in that bill's own fiscal path. It is kept as a favor
// the President owes the member, on the member's own tie, so the same ledger
// that will carry every other debt between the President and a person carries
// this one. The favor does not debit budget authority when offered or when
// accepted; the act's enactment (treasuryOfGdp / raisesCap / funds) is the one
// charge, when Congress and the President finish the bill. The ledger records
// the claim so the same bill cannot be promised twice and so an accepted offer
// that would overcommit authority is refused before the vote moves.

/** Live floor business that carries a real fiscal footprint. */
export type FiscalMatter = {
  readonly billId: string;
  readonly title: string;
  readonly actId: string;
  readonly reservedTreasury: number;
  readonly account?: BudgetAccount;
};

function hasFiscalSubstance(act: LegislativeAct): boolean {
  return act.treasuryOfGdp !== undefined || act.raisesCap !== undefined || act.funds !== undefined;
}

function reservedFor(campaign: Campaign, act: LegislativeAct): number {
  const cost = actCost(campaign, act).treasury;
  if (cost === undefined || cost >= 0) return 0;
  return Math.abs(cost);
}

/** Rebuild a fiscal matter from a stored bill id, if that bill still has substance. */
export function fiscalMatterForBill(campaign: Campaign, billId: string): FiscalMatter | undefined {
  const bill = selectBillsInProgress(campaign).find((entry) => entry.id === billId) ?? campaign.bills[billId];
  if (!bill) return undefined;
  const act = actOf(bill);
  if (!act || !hasFiscalSubstance(act)) return undefined;
  return {
    billId: bill.id,
    title: bill.title,
    actId: act.id,
    reservedTreasury: reservedFor(campaign, act),
    ...(act.raisesCap ? { account: act.raisesCap.account } : {}),
  };
}

/** The first in-progress bill whose catalogue act spends, authorizes, or funds. */
export function eligibleFiscalMatter(campaign: Campaign): FiscalMatter | undefined {
  for (const bill of selectBillsInProgress(campaign)) {
    const act = actOf(bill);
    if (!act || !hasFiscalSubstance(act)) continue;
    return {
      billId: bill.id,
      title: bill.title,
      actId: act.id,
      reservedTreasury: reservedFor(campaign, act),
      ...(act.raisesCap ? { account: act.raisesCap.account } : {}),
    };
  }
  return undefined;
}

function openReserveTotal(campaign: Campaign): number {
  return openFavorsOwedByPresident(campaign).reduce((sum, favor) => sum + (favor.reservedTreasury ?? 0), 0);
}

/**
 * Whether accepting a budget negotiation on this matter would overcommit the
 * authority on hand or stack a second claim on the same bill / member.
 */
export function lobbyFavorAvailability(
  campaign: Campaign,
  matter: FiscalMatter,
  post: HillPostId,
): { readonly ok: true } | { readonly ok: false; readonly reason: string } {
  const open = openFavorsOwedByPresident(campaign);
  if (open.some((favor) => favor.billId === matter.billId)) {
    return { ok: false, reason: "That bill already carries an open appropriation commitment from this administration." };
  }
  if (open.some((favor) => favor.post === post)) {
    return { ok: false, reason: "This member already holds an open appropriation commitment from this administration." };
  }
  if (matter.reservedTreasury <= 0) return { ok: true };
  const already = openReserveTotal(campaign);
  const needed = already + matter.reservedTreasury;
  const gate = obligationAvailability(campaign, needed);
  if (!gate.ok) {
    return {
      ok: false,
      reason: `Accepting this commitment would overcommit budget authority (${Math.round(needed).toLocaleString("en-US")} reserved against what is still apportioned).`,
    };
  }
  return { ok: true };
}

export function lobbyFavorId(post: HillPostId, turn: number, billId: string): string {
  return `promise:lobby:${post}:${turn}:${billId}`;
}

/** What the member was promised, in the words the record keeps. */
export function lobbyFavorWhat(title: string): string {
  return `A place in the appropriation path for ${title}`;
}

/** The favor a landed budget negotiation opens; callers must have already passed availability. */
export function draftLobbyFavor(campaign: Campaign, post: HillPostId, matter: FiscalMatter, lobbyId: string): Favor {
  return {
    id: lobbyFavorId(post, campaign.turn, matter.billId),
    direction: "owed-by-president",
    what: lobbyFavorWhat(matter.title),
    openedTurn: campaign.turn,
    status: "open",
    billId: matter.billId,
    actId: matter.actId,
    post,
    lobbyId,
    reservedTreasury: matter.reservedTreasury,
    ...(matter.account ? { account: matter.account } : {}),
  };
}
