import { COMMODITY_IDS, commodityAnchor, laggedIndex, marketQuote, type CommodityId } from "./commodities.js";
import { COMMODITY_DEFS, isAnchored, referenceIndex } from "./commodity-registry.js";
import { stepMarket, type KernelStep } from "./commodity-kernel.js";
import { commodityShocks, netShock, type CommodityShock } from "./commodity-shocks.js";
import type { Effect, EffectPacket } from "./effect-types.js";
import { nextEquity } from "./markets.js";
import { fedRecord } from "./monetary.js";
import { createRngStreams } from "./rng.js";
import { EQUITY_SERIES_WINDOW } from "./state-world.js";
import type { Campaign, CommodityQuote, FeedItem, MarketsState } from "./state.js";
import type { TurnPhase } from "./turn-loop.js";

// The week the world's markets move: every commodity steps through the
// kernel against the shocks the board is carrying, the equity index answers
// the economy and the prices, and the Federal Reserve's meeting, if one fell
// this week, is put on the record. One packet, one writer of the markets
// record, so a screen reading a price and the Record naming its cause read the
// same week.

/** A weekly move this large reaches the wire. */
export const NEWSWORTHY_MOVE = 0.05;

/** The log-price push from what goes into this commodity, read at each input's lag. */
function inputPush(campaign: Campaign, id: CommodityId): number {
  return COMMODITY_DEFS[id].inputs.reduce((sum, input) => {
    const felt = laggedIndex(campaign, input.from, input.lagWeeks, input.lagWeeks + 3);
    return sum + input.weight * Math.log(felt / referenceIndex(input.from));
  }, 0);
}

/**
 * What the Record names for this week's move: the heaviest shock while one is
 * standing, the draw-down of stocks or the return of supply once none is, and
 * nothing for a market at rest.
 */
export function moveCause(shocks: readonly CommodityShock[], step: KernelStep, previous: number): string | undefined {
  const lead = shocks[0];
  if (lead && Math.abs(lead.loss) + lead.risk >= 0.002) return lead.loss < 0 ? `eased by ${lead.cause}` : `up on ${lead.cause}`;
  if (step.index < previous && step.inventory < 1) return "easing as supply returns and stocks rebuild";
  if (step.terms.inputs > 0.01) return "up on the cost of what goes into it";
  return undefined;
}

function nextQuote(campaign: Campaign, id: CommodityId): { readonly quote: CommodityQuote; readonly move: number } {
  const previous = marketQuote(campaign, id);
  const shocks = commodityShocks(campaign, id);
  const { loss, risk } = netShock(shocks);
  const draw = createRngStreams(campaign.seed).stream("commodity", id, campaign.turn).next();
  const step = stepMarket({ quote: previous, reference: referenceIndex(id), params: COMMODITY_DEFS[id].params, loss, risk, inputPush: inputPush(campaign, id), draw });
  const kept = campaign.markets?.commodities[id];
  const cause = moveCause(shocks, step, previous.index);
  const quote: CommodityQuote = {
    index: step.index,
    anchorUsd: kept?.anchorUsd ?? (isAnchored(id) ? commodityAnchor(id).usd : 0),
    ...(cause ? { cause } : {}),
    series: [...(kept?.series ?? []), step.index].slice(-EQUITY_SERIES_WINDOW),
    norm: step.norm,
    inventory: step.inventory,
  };
  return { quote, move: step.index / previous.index - 1 };
}

function wireItem(campaign: Campaign, id: CommodityId, quote: CommodityQuote, move: number): FeedItem {
  const name = COMMODITY_DEFS[id].name;
  const verb = move > 0 ? "jumps" : "falls";
  const percent = `${Math.round(Math.abs(move) * 100)}%`;
  return {
    // The turn loop stamps a phase's packets with the turn they open, so a
    // wire item filed here carries the turn its ledger entry will.
    turn: campaign.turn + 1,
    kind: "drift",
    visibility: "public",
    headline: quote.cause ? `${name} ${verb} ${percent} in a week, ${quote.cause}.` : `${name} ${verb} ${percent} in a week.`,
    facts: { subject: name, figure: percent, topicTags: ["markets", "economy"], sceneFacet: { kind: "economy" } },
  };
}

/** The markets record this week would leave, and the moves worth a headline. */
export function nextMarkets(campaign: Campaign): { readonly markets: MarketsState; readonly wire: readonly FeedItem[] } {
  const stepped = COMMODITY_IDS.map((id) => ({ id, ...nextQuote(campaign, id) }));
  const commodities = Object.fromEntries(stepped.map(({ id, quote }) => [id, quote])) as Record<CommodityId, CommodityQuote>;
  const wire = stepped.filter(({ move }) => Math.abs(move) >= NEWSWORTHY_MOVE).map(({ id, quote, move }) => wireItem(campaign, id, quote, move));
  const fed = fedRecord(campaign);
  const markets: MarketsState = {
    ...(campaign.markets ?? {}),
    commodities,
    equity: nextEquity(campaign, commodities),
    ...(fed ? { fed } : {}),
  };
  return { markets, wire };
}

export const commodityPhase: TurnPhase = (state) => {
  const { markets, wire } = nextMarkets(state);
  const effects: Effect[] = [{ kind: "markets", set: markets }];
  if (wire.length > 0) effects.push({ kind: "feed", items: wire });
  const packet: EffectPacket = {
    source: "simulate",
    actor: "world",
    turn: state.turn,
    background: true,
    provenance: { origin: "world", systems: ["markets"] },
    narration: { summary: "The world's markets move a week." },
    effects,
  };
  return [packet];
};
