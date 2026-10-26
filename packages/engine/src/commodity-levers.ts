import { addDays } from "./clock.js";
import { marketQuote } from "./commodities.js";
import { commodityShocks, RESERVE_RELEASE_SHARE, reserveReleasing } from "./commodity-shocks.js";
import type { EffectPacket } from "./effect-types.js";
import { fuelWaiverStanding, oathPumpPrice, selectPumpPrice } from "./household-prices.js";
import { emptyMarkets } from "./markets.js";
import type { MetricCost, RiskBranch } from "./resolution.js";
import type { Campaign, GameDate, MarketsState } from "./state.js";

// The two levers a President has on the price of fuel inside a term: drawing
// down the Strategic Petroleum Reserve, which adds barrels to the world market
// for half a year, and an emergency fuel waiver, which takes a few cents off
// the part of a gallon that is not crude. Neither writes a price. The release
// is a supply shock the kernel prices like any other; the waiver is read by the
// pump price. Each is refused where the law that grants it does not reach.

/** Planning value: a drawdown sells this share of the reserve's opening fill, over `RELEASE_WEEKS`. */
export const RELEASE_DRAW = 0.45;

/** Planning value: how long a drawdown's barrels flow. */
export const RELEASE_WEEKS = 26;

/** Planning value: how long an emergency fuel waiver stands. */
export const WAIVER_WEEKS = 20;

/** Planning value: how far crude must stand above where buyers expect it before a supply interruption is severe enough to find. */
export const SEVERE_INTERRUPTION = 0.1;

/** Planning value: the standing an emergency fuel waiver spends against the objection it draws. */
const WAIVER_STANDING_COST = 0.005;

export type LeverProjection =
  | { readonly ok: false; readonly reason: string }
  | { readonly ok: true; readonly cost: MetricCost; readonly risks: readonly RiskBranch[]; readonly until: GameDate };

export type LeverResult = { readonly ok: true; readonly packet: EffectPacket } | { readonly ok: false; readonly reason: string };

/**
 * Whether the world crude market is in a supply interruption the law
 * recognizes for a full drawdown: a standing shock, or crude well above its
 * norm. 42 U.S.C. §6241(d)(1) also allows a full drawdown to meet the
 * country's obligations under the International Energy Program; an IEA
 * collective action is called on a severe disruption, so the same finding
 * stands for it here, and the other members' barrels are not modeled, since
 * the IEA's own pages on its 2022 actions refused the request (403).
 */
export function severeInterruption(campaign: Campaign): boolean {
  const quote = marketQuote(campaign, "crude");
  const shocked = commodityShocks(campaign, "crude").some((shock) => shock.loss > 0);
  return shocked || quote.index >= quote.norm * (1 + SEVERE_INTERRUPTION);
}

function reserveFill(campaign: Campaign): number {
  return campaign.markets?.reserve?.fill ?? 1;
}

/** What a drawdown of the Strategic Petroleum Reserve would do, before it is ordered. */
export function projectReserveRelease(campaign: Campaign): LeverProjection {
  if (reserveReleasing(campaign)) return { ok: false, reason: "A drawdown is already flowing. The reserve cannot sell the same barrels twice." };
  if (reserveFill(campaign) < RELEASE_DRAW) return { ok: false, reason: "The reserve is too low for another full drawdown; refilling it takes an appropriation and years." };
  if (!severeInterruption(campaign)) {
    return { ok: false, reason: "A full drawdown needs a finding of a severe energy supply interruption, and crude is where buyers expect it." };
  }
  const left = Math.round((reserveFill(campaign) - RELEASE_DRAW) * 100);
  return {
    ok: true,
    cost: {},
    risks: [{ id: "reserve-depleted", chance: 1, description: `The reserve is drawn to ${left}% of its opening fill, and a later shock finds less of it.` }],
    until: addDays(campaign.calendar, RELEASE_WEEKS * 7),
  };
}

function withMarkets(campaign: Campaign, patch: Partial<MarketsState>): MarketsState {
  return { ...(campaign.markets ?? emptyMarkets()), ...patch };
}

/** Order a drawdown of the Strategic Petroleum Reserve. */
export function releaseStrategicReserve(campaign: Campaign): LeverResult {
  const projection = projectReserveRelease(campaign);
  if (!projection.ok) return projection;
  const reserve = { fill: Math.round((reserveFill(campaign) - RELEASE_DRAW) * 1000) / 1000, release: { from: campaign.calendar, until: projection.until, share: RESERVE_RELEASE_SHARE } };
  return {
    ok: true,
    packet: {
      source: "action",
      actor: "player",
      turn: campaign.turn,
      provenance: { origin: "decision", systems: ["markets"], entities: ["INST-DOE"] },
      narration: { summary: "The President orders a drawdown of the Strategic Petroleum Reserve." },
      effects: [
        { kind: "markets", set: withMarkets(campaign, { reserve }) },
        {
          kind: "feed",
          items: [
            {
              turn: campaign.turn,
              kind: "press",
              visibility: "public",
              headline: "The President orders oil released from the Strategic Petroleum Reserve.",
              facts: { subject: "the Strategic Petroleum Reserve", topicTags: ["markets", "energy"], sceneFacet: { kind: "economy" } },
            },
          ],
        },
      ],
    },
  };
}

/** The reserve's barrels at the opening: EIA weekly SPR crude stocks, week of 2026-10-16 (WCSSTUS1, opened 2026-10-25). */
export const SPR_OPENING_BARRELS = 282_683_000;

/**
 * 42 U.S.C. §6241(h), opened 2026-10-25 (law.cornell.edu): on a finding of a
 * domestic or international energy supply shortage of significant scope or
 * duration, short of the severe interruption a full drawdown needs, the
 * Secretary may draw down no more than 30,000,000 barrels for each such
 * shortage, for no more than 60 days, and never below 252,400,000 barrels.
 */
export const LIMITED_DRAWDOWN = { barrels: 30_000_000, days: 60, floor: 252_400_000 } as const;

/** World petroleum and other liquids consumption, 2024: 103,110 thousand b/d (EIA INTL.5-2-WORL-TBPD.A, opened 2026-10-25). */
const WORLD_KBD = 103_110;

/** The share of world crude supply a limited drawdown adds while it flows: its barrels over its days, against world consumption. */
export const LIMITED_RELEASE_SHARE = LIMITED_DRAWDOWN.barrels / LIMITED_DRAWDOWN.days / 1000 / WORLD_KBD;

/** The supply losses standing on crude now: the shortage a limited drawdown answers. */
function shortageCauses(campaign: Campaign): readonly string[] {
  return commodityShocks(campaign, "crude").filter((shock) => shock.loss > 0).map((shock) => shock.cause).sort();
}

/** What a limited drawdown of the Strategic Petroleum Reserve would do, before it is ordered. */
export function projectLimitedRelease(campaign: Campaign): LeverProjection {
  if (reserveReleasing(campaign)) return { ok: false, reason: "A drawdown is already flowing. The reserve cannot sell the same barrels twice." };
  const causes = shortageCauses(campaign);
  if (causes.length === 0) return { ok: false, reason: "A limited drawdown answers an energy supply shortage, and no supply is being lost." };
  if (causes.some((cause) => campaign.markets?.reserve?.limitedFor?.includes(cause))) {
    return { ok: false, reason: "The law allows one limited drawdown of 30 million barrels for each shortage, and this one has had it." };
  }
  const barrels = reserveFill(campaign) * SPR_OPENING_BARRELS;
  if (barrels - LIMITED_DRAWDOWN.barrels < LIMITED_DRAWDOWN.floor) {
    return { ok: false, reason: "A limited drawdown may not take the reserve below 252.4 million barrels." };
  }
  return {
    ok: true,
    cost: {},
    risks: [{ id: "reserve-depleted", chance: 1, description: `The reserve falls to ${Math.round((barrels - LIMITED_DRAWDOWN.barrels) / 1_000_000)} million barrels.` }],
    until: addDays(campaign.calendar, LIMITED_DRAWDOWN.days),
  };
}

/** Order a limited drawdown: 30 million barrels over 60 days, no severe-interruption finding needed. */
export function releaseLimitedReserve(campaign: Campaign): LeverResult {
  const projection = projectLimitedRelease(campaign);
  if (!projection.ok) return projection;
  const fill = Math.round((reserveFill(campaign) - LIMITED_DRAWDOWN.barrels / SPR_OPENING_BARRELS) * 1000) / 1000;
  const reserve = { fill, release: { from: campaign.calendar, until: projection.until, share: LIMITED_RELEASE_SHARE }, limitedFor: shortageCauses(campaign) };
  return {
    ok: true,
    packet: {
      source: "action",
      actor: "player",
      turn: campaign.turn,
      provenance: { origin: "decision", systems: ["markets"], entities: ["INST-DOE"] },
      narration: { summary: "The President orders a limited drawdown of the Strategic Petroleum Reserve." },
      effects: [
        { kind: "markets", set: withMarkets(campaign, { reserve }) },
        { kind: "feed", items: [{ turn: campaign.turn, kind: "press", visibility: "public", headline: "The administration releases 30 million barrels from the Strategic Petroleum Reserve.", facts: { subject: "the Strategic Petroleum Reserve", topicTags: ["markets", "energy"], sceneFacet: { kind: "economy" } } }] },
      ],
    },
  };
}

/** What an emergency fuel waiver would do, before it is issued. */
export function projectFuelWaiver(campaign: Campaign): LeverProjection {
  if (fuelWaiverStanding(campaign)) return { ok: false, reason: "An emergency fuel waiver is already in force." };
  if (selectPumpPrice(campaign) < oathPumpPrice() * (1 + SEVERE_INTERRUPTION) && !severeInterruption(campaign)) {
    return { ok: false, reason: "The waiver answers an emergency fuel shortage, and the pump is near where it stood at the oath." };
  }
  return {
    ok: true,
    cost: { standing: -WAIVER_STANDING_COST },
    risks: [{ id: "waiver-objection", chance: 1, description: `Clean-air groups object, and the waiver lapses after ${WAIVER_WEEKS} weeks.` }],
    until: addDays(campaign.calendar, WAIVER_WEEKS * 7),
  };
}

/** Issue an emergency fuel waiver. */
export function issueFuelWaiver(campaign: Campaign): LeverResult {
  const projection = projectFuelWaiver(campaign);
  if (!projection.ok) return projection;
  return {
    ok: true,
    packet: {
      source: "action",
      actor: "player",
      turn: campaign.turn,
      provenance: { origin: "decision", systems: ["markets"], entities: ["INST-EPA"] },
      narration: { summary: "The administration issues an emergency fuel waiver." },
      effects: [
        { kind: "markets", set: withMarkets(campaign, { fuelWaiver: { until: projection.until } }) },
        { kind: "metric", deltas: projection.cost },
        {
          kind: "feed",
          items: [
            {
              turn: campaign.turn,
              kind: "press",
              visibility: "public",
              headline: "The administration waives summer fuel rules to bring the pump price down.",
              facts: { subject: "the pump price", topicTags: ["markets", "energy"], sceneFacet: { kind: "economy" } },
            },
          ],
        },
      ],
    },
  };
}
