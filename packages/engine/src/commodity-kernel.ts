import type { KernelParams } from "./commodity-registry.js";

// One market's week: supply against demand, stocks between them, and the
// price that clears what stocks cannot.
//
// The price is a partial adjustment toward a target the market's pressure
// sets, never a random walk and never a written delta. A supply loss first
// draws stocks down; thin stocks call more output from producers and raise the
// target; a higher price destroys some demand. A market with nothing moving it
// settles back on its reference level through the same stocks, so recovery is
// the supply coming back, not a timer.

/** The part of a market the week carries forward. */
export type MarketQuote = {
  readonly index: number;
  readonly norm: number;
  readonly inventory: number;
};

export type KernelInput = {
  readonly quote: MarketQuote;
  /** Where the market rests with nothing moving it. */
  readonly reference: number;
  readonly params: KernelParams;
  /** Share of world supply lost this week, net of any added. */
  readonly loss: number;
  /** Log-price premium for a threat not yet in the supply. */
  readonly risk: number;
  /** Log-price push from the inputs' own prices. */
  readonly inputPush: number;
  /** A seeded draw in [0, 1). */
  readonly draw: number;
};

/** What set this week's price, each in log-price units at the target, for the Record's "why". */
export type KernelTerms = {
  readonly shortfall: number;
  readonly stocks: number;
  readonly risk: number;
  readonly inputs: number;
};

export type KernelStep = MarketQuote & { readonly target: number; readonly terms: KernelTerms };

/** Planning value: how much of a stock shortfall producers answer with more output each week. */
export const RESTOCK_RESPONSE = 0.2;

/** Planning value: how hard thin stocks push the price, per unit of normal cover missing. */
export const STOCKS_WEIGHT = 0.3;

/** A year: how long buyers take to treat a new price as the normal one. */
export const NORM_WEEKS = 52;

const INVENTORY_BOUNDS = { min: 0.1, max: 1.5 } as const;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function supplyAndDemand(input: KernelInput): { readonly supply: number; readonly demand: number } {
  const { quote, params, loss, reference } = input;
  const spareUsed = clamp(loss, 0, params.spare);
  const restock = RESTOCK_RESPONSE * (1 - quote.inventory);
  const supply = 1 - loss + spareUsed + restock;
  const demand = 1 - params.elasticity * Math.log(quote.index / reference);
  return { supply, demand };
}

/** One week of one market. Pure: the same quote, shocks and draw give the same week. */
export function stepMarket(input: KernelInput): KernelStep {
  const { quote, params, reference } = input;
  const { supply, demand } = supplyAndDemand(input);
  const gap = demand - supply;
  const inventory = clamp(quote.inventory - gap / params.coverWeeks, INVENTORY_BOUNDS.min, INVENTORY_BOUNDS.max);
  const terms: KernelTerms = {
    shortfall: params.sensitivity * gap,
    stocks: params.sensitivity * STOCKS_WEIGHT * (1 - inventory),
    risk: params.sensitivity * input.risk,
    inputs: input.inputPush,
  };
  const target = Math.log(reference) + terms.shortfall + terms.stocks + terms.risk + terms.inputs;
  const logIndex = Math.log(quote.index);
  const residual = params.residual * (2 * input.draw - 1);
  const step = clamp(params.speed * (target - logIndex) + residual, -params.weeklyCap, params.weeklyCap);
  const index = round6(Math.exp(logIndex + step));
  return { index, norm: round6(quote.norm + (index - quote.norm) / NORM_WEEKS), inventory: round6(inventory), target: round6(Math.exp(target)), terms };
}

const round6 = (value: number) => Math.round(value * 1_000_000) / 1_000_000;
