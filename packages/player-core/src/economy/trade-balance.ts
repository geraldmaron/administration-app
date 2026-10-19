import type { Campaign } from "@admin/engine";
import { goodsTradeTotals } from "../world/standing.js";

// The trade balance for the room: built on the same memoized partner walk
// `goodsTradeShare` already reads (`world/standing.ts`), never a second sum
// over every partner that could disagree with it.

export type TradeBalanceReading = {
  readonly imports: number;
  readonly exports: number;
  /** Exports less imports; negative is a deficit. */
  readonly balance: number;
};

export function tradeBalance(campaign: Campaign): TradeBalanceReading {
  const { imports, exports } = goodsTradeTotals(campaign);
  return { imports, exports, balance: exports - imports };
}
