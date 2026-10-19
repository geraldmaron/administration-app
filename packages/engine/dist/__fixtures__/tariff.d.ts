import type { NationId } from "@admin/world";
import type { Campaign } from "../state.js";
import type { TradeResult } from "../trade.js";
import type { TradeSectorId } from "../trade-sectors.js";
/** A campaign whose Trade Representative has already found the partner's practices actionable. */
export declare function withTariffFinding(campaign: Campaign, partner: NationId): Campaign;
/** A Section 301 tariff on a partner already found, for tests about what a tariff does rather than which law allows it. */
export declare function imposeTestTariff(campaign: Campaign, partner: NationId, sector: TradeSectorId, rate: number): TradeResult;
