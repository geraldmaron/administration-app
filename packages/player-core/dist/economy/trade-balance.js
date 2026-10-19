import { goodsTradeTotals } from "../world/standing.js";
export function tradeBalance(campaign) {
    const { imports, exports } = goodsTradeTotals(campaign);
    return { imports, exports, balance: exports - imports };
}
