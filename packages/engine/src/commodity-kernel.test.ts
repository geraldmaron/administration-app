/**
 * One market's week: a loss draws stocks and lifts the price, a market at rest
 * stays at rest, the same inputs give the same week, and recovery is supply
 * coming back rather than a timer.
 */
import { describe, expect, it } from "vitest";
import { COMMODITY_DEFS } from "./commodity-registry.js";
import { RESTOCK_RESPONSE, stepMarket, type KernelInput, type MarketQuote } from "./commodity-kernel.js";

const CRUDE = COMMODITY_DEFS.crude.params;
const REST: MarketQuote = { index: 1, norm: 1, inventory: 1 };
/** A draw of one half is no residual at all. */
const CALM = 0.5;

const input = (patch: Partial<KernelInput> = {}): KernelInput => ({ quote: REST, reference: 1, params: CRUDE, loss: 0, risk: 0, inputPush: 0, draw: CALM, ...patch });

function run(weeks: number, patch: Partial<KernelInput>, from: MarketQuote = REST): MarketQuote[] {
  const path: MarketQuote[] = [];
  let quote = from;
  for (let week = 0; week < weeks; week += 1) {
    const step = stepMarket(input({ ...patch, quote }));
    quote = { index: step.index, norm: step.norm, inventory: step.inventory };
    path.push(quote);
  }
  return path;
}

describe("the market kernel", () => {
  it("holds a market at rest on its reference level with full stocks", () => {
    const step = stepMarket(input());
    expect(step.index).toBe(1);
    expect(step.inventory).toBe(1);
    expect(step.terms).toEqual({ shortfall: 0, stocks: 0, risk: 0, inputs: 0 });
  });

  it("reproduces the same week from the same quote, shocks and draw", () => {
    const a = stepMarket(input({ loss: 0.08, risk: 0.02, draw: 0.83 }));
    const b = stepMarket(input({ loss: 0.08, risk: 0.02, draw: 0.83 }));
    expect(a).toEqual(b);
  });

  it("draws stocks down by the week's shortfall over normal cover, and nothing else writes them", () => {
    const loss = 0.08;
    const step = stepMarket(input({ loss }));
    const spareUsed = Math.min(loss, CRUDE.spare);
    const shortfall = loss - spareUsed;
    expect(step.inventory).toBeCloseTo(1 - shortfall / CRUDE.coverWeeks, 6);
    expect(RESTOCK_RESPONSE).toBeGreaterThan(0);
  });

  it("lifts the price on a supply loss, never by more than the weekly cap", () => {
    const path = run(12, { loss: 0.1, risk: 0.04 });
    expect(path[0]!.index).toBeGreaterThan(1);
    for (let week = 1; week < path.length; week += 1) {
      // The index is stored to six places, so a capped step can read a hair over the cap.
      expect(Math.abs(Math.log(path[week]!.index / path[week - 1]!.index))).toBeLessThanOrEqual(CRUDE.weeklyCap + 1e-6);
    }
    expect(path.at(-1)!.index).toBeGreaterThan(path[0]!.index);
  });

  it("uses spare capacity first: a loss inside spare output barely moves the price", () => {
    const inside = run(8, { loss: CRUDE.spare * 0.9 }).at(-1)!.index;
    const beyond = run(8, { loss: CRUDE.spare * 3 }).at(-1)!.index;
    expect(inside).toBeLessThan(1.02);
    expect(beyond).toBeGreaterThan(inside);
  });

  it("settles back toward its reference once the loss ends, as stocks rebuild", () => {
    const shocked = run(20, { loss: 0.08, risk: 0.03 }).at(-1)!;
    const recovered = run(80, {}, shocked);
    expect(recovered.at(-1)!.index).toBeLessThan(shocked.index);
    expect(Math.abs(recovered.at(-1)!.index - 1)).toBeLessThan(0.05);
    expect(recovered.at(-1)!.inventory).toBeGreaterThan(shocked.inventory);
  });

  it("stays bounded under a shock held for four years", () => {
    const held = run(208, { loss: 0.6, risk: 0.2 });
    for (const week of held) {
      expect(Number.isFinite(week.index)).toBe(true);
      expect(week.inventory).toBeGreaterThanOrEqual(0.1);
      expect(week.inventory).toBeLessThanOrEqual(1.5);
    }
  });
});
