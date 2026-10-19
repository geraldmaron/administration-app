import type { Campaign, Favor, HillPostId } from "./state.js";
import type { BudgetAccount } from "./budget.js";
/** Live floor business that carries a real fiscal footprint. */
export type FiscalMatter = {
    readonly billId: string;
    readonly title: string;
    readonly actId: string;
    readonly reservedTreasury: number;
    readonly account?: BudgetAccount;
};
/** Rebuild a fiscal matter from a stored bill id, if that bill still has substance. */
export declare function fiscalMatterForBill(campaign: Campaign, billId: string): FiscalMatter | undefined;
/** The first in-progress bill whose catalogue act spends, authorizes, or funds. */
export declare function eligibleFiscalMatter(campaign: Campaign): FiscalMatter | undefined;
/**
 * Whether accepting a budget negotiation on this matter would overcommit the
 * authority on hand or stack a second claim on the same bill / member.
 */
export declare function lobbyFavorAvailability(campaign: Campaign, matter: FiscalMatter, post: HillPostId): {
    readonly ok: true;
} | {
    readonly ok: false;
    readonly reason: string;
};
export declare function lobbyFavorId(post: HillPostId, turn: number, billId: string): string;
/** What the member was promised, in the words the record keeps. */
export declare function lobbyFavorWhat(title: string): string;
/** The favor a landed budget negotiation opens; callers must have already passed availability. */
export declare function draftLobbyFavor(campaign: Campaign, post: HillPostId, matter: FiscalMatter, lobbyId: string): Favor;
