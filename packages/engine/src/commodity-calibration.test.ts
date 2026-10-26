/**
 * Crude's kernel against the 2026 closure of Hormuz, fed as net supply lost.
 *
 * EIA Short-Term Energy Outlook (opened 2026-10-13): Brent $71 on February 27,
 * the day before the closure (March 2026 edition); a March average of $103
 * (April edition) and an April average of $117 (July edition); production shut
 * in at 8.89 Mb/d in March and 10.4 in April (July edition, Table 1) against
 * world production of 108.42 Mb/d in 4Q25 (October edition, Table 3a). The
 * tolerance is 10% of each month's average, read at weeks 4 and 8.
 */
import { describe, expect, it } from "vitest";
import { COMMODITY_DEFS } from "./commodity-registry.js";
import { stepMarket, type MarketQuote } from "./commodity-kernel.js";
import { ROUTE_RISK } from "./commodity-shocks.js";

const BEFORE = 71;
const MARCH = 103;
const APRIL = 117;
const WORLD = 108.42;
const SHUT_IN = { march: 8.89, april: 10.4 } as const;

// The model's own premium for a Hormuz route contested at full intensity, net of the pipelines: 0.2 × (1 − 0.124).
const HORMUZ_RISK = 0.2 * (1 - 0.124) * ROUTE_RISK;

function path(weeks: number): readonly number[] {
  const params = COMMODITY_DEFS.crude.params;
  let quote: MarketQuote = { index: 1, norm: 1, inventory: 1 };
  const out: number[] = [];
  for (let week = 1; week <= weeks; week += 1) {
    const loss = (week <= 4 ? SHUT_IN.march : SHUT_IN.april) / WORLD;
    quote = stepMarket({ quote, reference: 1, params, loss, risk: HORMUZ_RISK, inputPush: 0, draw: 0.5 });
    out.push(quote.index);
  }
  return out;
}

describe("crude against the 2026 Hormuz closure", () => {
  const indexes = path(8);

  it("reads the March average at week 4 within ten percent", () => {
    const brent = BEFORE * indexes[3]!;
    expect(Math.abs(brent - MARCH) / MARCH).toBeLessThan(0.1);
  });

  it("reads the April average at week 8 within ten percent", () => {
    const brent = BEFORE * indexes[7]!;
    expect(Math.abs(brent - APRIL) / APRIL).toBeLessThan(0.1);
  });
});

// EIA weekly Brent spot (RBRTE, weekly, release of 2026-10-21, opened
// 2026-10-25): $71.36 the week of February 27, the week before the closure,
// peaking at $124.61 the week of April 10. A weekly peak is compared with a
// weekly peak, never with a monthly or annual average; the band is a quarter
// of the causal change either side (METHODOLOGY).
const WEEK_BEFORE = 71.36;
const WEEKLY_PEAK = 124.61;

describe("crude against the 2026 closure, week by week", () => {
  it("peaks within a quarter of the weekly peak's rise when fed the sourced shut-ins", () => {
    const peak = Math.max(...path(8));
    const causal = WEEKLY_PEAK / WEEK_BEFORE - 1;
    expect(Math.abs(peak - 1 - causal)).toBeLessThanOrEqual(0.25 * causal);
  });
});
