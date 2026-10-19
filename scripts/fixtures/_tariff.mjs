// A Section 301 tariff the way a President gets one: the Trade Representative's
// finding on the partner is already in, then the tariff is imposed under it.
import { apply } from "../../packages/engine/dist/effects.js";
import { imposeTariff } from "../../packages/engine/dist/tariff-orders.js";

export function withSection301Finding(campaign, partner) {
  const finding = {
    id: `finding:s301:${partner}:fixture`,
    statute: "s301",
    partner,
    openedTurn: campaign.turn,
    openedDate: campaign.calendar,
    dueDate: campaign.calendar,
    outcome: "affirmative",
    decidedDate: campaign.calendar,
  };
  return apply(campaign, {
    source: "simulate",
    actor: "world",
    turn: campaign.turn,
    narration: { summary: `The Trade Representative finds ${partner}'s trade practices unfair under Section 301.` },
    effects: [{ kind: "trade", finding }],
  });
}

export function imposeSection301Tariff(campaign, partner, sector, rate) {
  const found = withSection301Finding(campaign, partner);
  const result = imposeTariff(found, "s301", partner, sector, rate);
  return result.ok ? { ok: true, campaign: found, packet: result.packet } : result;
}
