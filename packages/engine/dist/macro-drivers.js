import { cycleOffset, NO_CYCLE } from "./business-cycle.js";
import { conditionMacroPressure } from "./conditions.js";
import { externalMacroPressure } from "./external-pressure.js";
import { fiscalImpulse } from "./fiscal-impulse.js";
import { macroBaseline } from "./macro-baseline.js";
import { restingProgram } from "./governance.js";
import { FED_RATE_ADJUSTMENT, fedRule, usFedInput } from "./monetary.js";
import { gapBetween, gapClosingSpeed, openingMacroState, policyRule, POLICY_RATE_ADJUSTMENT } from "./macro-state.js";
import { selectNation } from "./state.js";
import { shockPressure } from "./external-shocks.js";
/**
 * How much of an inflation target is what the public already expects, the
 * rest being the country's own anchor. At a half, a price shock that lasts
 * long enough to be believed lasts longer than the shock.
 */
export const INFLATION_EXPECTATIONS_WEIGHT = 0.5;
/** Points of inflation per unit of output gap: a flat curve, the post-2000 reading. */
export const PHILLIPS_SLOPE = 0.03;
/**
 * How far unemployment moves against a unit of output gap. The United
 * States' is the published estimate; other rich economies run a little
 * flatter and poorer ones, with large informal sectors, much flatter.
 */
export const OKUN = { unitedStates: 0.45, rich: 0.4, other: 0.25 };
/** The span a budget's push is spent over, in years: a push of F delivers F of output across it. */
export const IMPULSE_SPAN_YEARS = 26 / 52;
export function okunCoefficient(runtime, playerNation) {
    if (runtime.base.id === playerNation)
        return OKUN.unitedStates;
    return runtime.base.bands.wealthTier >= 4 ? OKUN.rich : OKUN.other;
}
const d = (source, amount) => ({ source, amount });
/**
 * One nation's targets for the week, and why. `program` is passed in because
 * the drift phase reads it for the politics too; everyone else reaches this
 * through `selectMacroDrivers`.
 */
export function macroStep(campaign, runtime, nation, program) {
    const player = campaign.founding.nation;
    const state = campaign.macro?.[nation] ?? openingMacroState(runtime, player);
    const economy = runtime.stats.economy;
    const rest = macroBaseline(runtime, NO_CYCLE);
    const gap = gapBetween(economy.gdp, state.potential);
    // The decision window is anchored to the week's open, not to the day the
    // phase happens to run on (`usFedInput`). The office-day cut runs this on
    // day 4 and the flat week runs it at the close, so reading today's date gave
    // the two layouts different seven-day spans, a decision near a boundary fell
    // in a different week, and the rate path drifted apart.
    const rule = nation === player
        ? fedRule(usFedInput(campaign, state.policyRate, state.expectedInflation))
        : policyRule(runtime, player, state.expectedInflation, economy.inflation, gap);
    const impulse = fiscalImpulse(campaign, nation);
    const pressure = conditionMacroPressure(campaign, nation);
    const world = externalMacroPressure(campaign, nation);
    const jobs = shockPressure(campaign, nation).unemployment;
    const lambda = INFLATION_EXPECTATIONS_WEIGHT;
    const drivers = {
        growth: [
            d("rest", rest.growth),
            d("cycle", cycleOffset(campaign.cycles[nation] ?? NO_CYCLE)),
            d("program", program["economy.growth"]),
            d("impulse", impulse / IMPULSE_SPAN_YEARS),
            d("conditions", -pressure.growth),
            d("world", world.growth - (world.commodities?.growth ?? 0)),
            ...(world.commodities ? [d("commodities", world.commodities.growth)] : []),
            d("gap", -gapClosingSpeed(rule) * gap),
        ],
        // A condition's pressure is authored as harm, and harm is a higher price
        // level and more people out of work, so both enter with their own sign.
        inflation: [
            d("rest", (1 - lambda) * rest.inflation + lambda * state.expectedInflation),
            d("program", (1 - lambda) * program["economy.inflation"]),
            d("conditions", pressure.inflation),
            d("world", world.inflation - (world.commodities?.inflation ?? 0)),
            ...(world.commodities ? [d("commodities", world.commodities.inflation)] : []),
            d("gap", PHILLIPS_SLOPE * gap),
        ],
        unemployment: [
            d("rest", rest.unemployment),
            d("program", program["economy.unemployment"]),
            d("conditions", pressure.unemployment),
            ...(jobs === 0 ? [] : [d("world", jobs)]),
            d("gap", -okunCoefficient(runtime, player) * gap),
        ],
    };
    const rateAdjustment = nation === player ? FED_RATE_ADJUSTMENT : POLICY_RATE_ADJUSTMENT;
    return { drivers, gap, impulse, rule, rateAdjustment, trendGrowth: rest.growth + program["economy.growth"], state };
}
/** The target a rate reverts toward this week: the sum of its drivers. */
export function driversTarget(drivers) {
    return drivers.reduce((sum, driver) => sum + driver.amount, 0);
}
/** What is setting each of a nation's three rates this week. */
export function selectMacroDrivers(campaign, nation) {
    const runtime = selectNation(campaign, nation);
    if (!runtime)
        return { growth: [], inflation: [], unemployment: [] };
    return macroStep(campaign, runtime, nation, restingProgram(campaign, nation)).drivers;
}
