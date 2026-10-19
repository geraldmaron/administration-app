import { FORCE_COST_ANCHORS, US_ID } from "@admin/world";
import { specForRung } from "./force-packages.js";
import { selectNation } from "./state.js";
// What a force act costs, priced from what the United States has paid for
// operations of its kind (`FORCE_COST_ANCHORS`), in the world's own dollars.
//
// A force act used to cost a share of the acting government's output times a
// rung weight, which put a limited strike on Venezuela at about $35 billion,
// over a hundred times what the strike's sorties cost at the last count. The
// sorties, the hulls and the brigades are what the money buys, so they are what
// the price counts.
/** The year the world is set in, whose dollars every price is stated in. */
const WORLD_YEAR = 2026;
/** One anchor's figure, in the table's own unit and dollar year. */
function figure(anchor) {
    const row = FORCE_COST_ANCHORS.find((entry) => entry.anchor === anchor);
    if (!row)
        throw new Error(`force-costs: no anchor "${anchor}" in FORCE_COST_ANCHORS`);
    return row.value;
}
/** An anchor in the world's dollars, carried forward by the consumer price index. */
function inWorldDollars(anchor) {
    const row = FORCE_COST_ANCHORS.find((entry) => entry.anchor === anchor);
    if (row?.dollarYear === undefined)
        throw new Error(`force-costs: anchor "${anchor}" carries no dollar year`);
    return row.value * (figure(`cpi-${WORLD_YEAR}`) / figure(`cpi-${row.dollarYear}`));
}
const DAYS_PER_YEAR = 365;
const DAYS_PER_WEEK = 7;
const WEEKS_PER_YEAR = 52;
function usRungPrices() {
    const destroyerDay = inWorldDollars("destroyer-year-direct") / DAYS_PER_YEAR;
    const groupDay = (inWorldDollars("carrier-year-direct") + inWorldDollars("air-wing-year-direct")) / DAYS_PER_YEAR +
        destroyerDay * figure("strike-group-escorts");
    const strikeSortie = inWorldDollars("odyssey-dawn-cost") / figure("odyssey-dawn-strike-sorties");
    return {
        1: { upFront: inWorldDollars("exercise-cost"), weekly: 0 },
        2: { upFront: groupDay * figure("transit-days"), weekly: groupDay * DAYS_PER_WEEK },
        3: { upFront: destroyerDay * figure("transit-days"), weekly: destroyerDay * DAYS_PER_WEEK },
        4: { upFront: strikeSortie * figure("strike-sorties-per-aircraft"), weekly: 0 },
        5: { upFront: inWorldDollars("brigade-shipping"), weekly: inWorldDollars("brigade-year-in-theater") / WEEKS_PER_YEAR },
    };
}
export const US_FORCE_PRICES = usRungPrices();
/**
 * What a unit of force costs this government against what it costs the United
 * States: its military spending per active service member over the US figure.
 *
 * Derived, not measured. Spending per service member carries pay, equipment
 * and upkeep together, which is what an operation draws on; the price level
 * of a conscript army is not the price level of an all-volunteer one. A
 * government with no standing force has no figure of its own and buys at the
 * only price sourced, the US one.
 */
export function militaryCostIndex(actor, us) {
    const own = spendPerServiceMember(actor);
    const theirs = spendPerServiceMember(us);
    return own === undefined || theirs === undefined ? 1 : own / theirs;
}
function spendPerServiceMember(stats) {
    const { budget, activeHeadcount } = stats.military;
    return budget > 0 && activeHeadcount > 0 ? budget / activeHeadcount : undefined;
}
/**
 * The index read off the authored figures rather than the live ones, so a
 * government's price of force does not drift with a budget the campaign moves
 * and the yardstick, the US figure, stays where it was sourced.
 */
export function campaignCostIndex(campaign, actor) {
    if (actor === US_ID)
        return 1;
    const own = selectNation(campaign, actor)?.base.stats;
    const us = selectNation(campaign, US_ID)?.base.stats;
    return own && us ? militaryCostIndex(own, us) : 1;
}
const round2 = (value) => Math.round(value * 100) / 100;
export function forceCostBasis(rung, units, costIndex, reach, unitType) {
    const price = US_FORCE_PRICES[rung];
    return {
        rung,
        ...(unitType ? { unitType } : {}),
        units,
        perUnit: price.upFront,
        costIndex,
        reach,
        upFront: round2(price.upFront * units * costIndex * reach),
        weekly: round2(price.weekly * units * costIndex),
    };
}
/**
 * The basis for a military rung as ordered: the package's own count, or with
 * none named the count the rung's package is drawn at (its preferred size,
 * the size an unscaled order commits). An exercise sends no package.
 */
export function forceActBasis(campaign, actor, rung, force, reach) {
    const spec = rung === 1 ? undefined : specForRung(rung);
    const units = spec ? force?.count ?? spec.preferred : 1;
    return forceCostBasis(rung, units, campaignCostIndex(campaign, actor.id), reach, spec ? force?.unitType ?? spec.unitType : undefined);
}
