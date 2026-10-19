import type { NationId } from "@admin/world";
import type { Campaign } from "../state.js";
import { imposeTariff } from "../tariff-orders.js";
import type { TariffFinding } from "../tariff-statutes.js";
import type { TradeResult } from "../trade.js";
import type { TradeSectorId } from "../trade-sectors.js";

/** A campaign whose Trade Representative has already found the partner's practices actionable. */
export function withTariffFinding(campaign: Campaign, partner: NationId): Campaign {
  const finding: TariffFinding = {
    id: `finding:s301:${partner}:fixture`,
    statute: "s301",
    partner,
    openedTurn: campaign.turn,
    openedDate: campaign.calendar,
    dueDate: campaign.calendar,
    outcome: "affirmative",
    decidedDate: campaign.calendar,
  };
  return { ...campaign, trade: { ...campaign.trade, findings: { ...campaign.trade.findings, [finding.id]: finding } } };
}

/** A Section 301 tariff on a partner already found, for tests about what a tariff does rather than which law allows it. */
export function imposeTestTariff(campaign: Campaign, partner: NationId, sector: TradeSectorId, rate: number): TradeResult {
  return imposeTariff(withTariffFinding(campaign, partner), "s301", partner, sector, rate);
}
