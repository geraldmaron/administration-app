/** Planning value: how much of a stock shortfall producers answer with more output each week. */
export const RESTOCK_RESPONSE = 0.2;
/** Planning value: how hard thin stocks push the price, per unit of normal cover missing. */
export const STOCKS_WEIGHT = 0.3;
/** A year: how long buyers take to treat a new price as the normal one. */
export const NORM_WEEKS = 52;
const INVENTORY_BOUNDS = { min: 0.1, max: 1.5 };
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
function supplyAndDemand(input) {
    const { quote, params, loss, reference } = input;
    const spareUsed = clamp(loss, 0, params.spare);
    const restock = RESTOCK_RESPONSE * (1 - quote.inventory);
    const supply = 1 - loss + spareUsed + restock;
    const demand = 1 - params.elasticity * Math.log(quote.index / reference);
    return { supply, demand };
}
/** One week of one market. Pure: the same quote, shocks and draw give the same week. */
export function stepMarket(input) {
    const { quote, params, reference } = input;
    const { supply, demand } = supplyAndDemand(input);
    const gap = demand - supply;
    const inventory = clamp(quote.inventory - gap / params.coverWeeks, INVENTORY_BOUNDS.min, INVENTORY_BOUNDS.max);
    const terms = {
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
const round6 = (value) => Math.round(value * 1_000_000) / 1_000_000;
