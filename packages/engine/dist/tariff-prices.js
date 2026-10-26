/**
 * A tariff's shelf rise as a temporary inflation-target shift.
 *
 * A tariff raises the price of what the United States buys from one partner in
 * one sector, once. What that does to the consumer price level is the shelf
 * rise on those goods, times the partner's share of what the country imports
 * in the sector, times the sector's weight in the household basket (the BLS
 * relative-importance table, in `trade-sectors.ts`). That step is spread over
 * half a year of weekly pressure on the inflation target and then it stops. It
 * is not a standing inflation rate, and nothing here writes the price level.
 *
 * Lifting the tariff takes the wedge back out the same way: whatever share of
 * the step had passed through by the lift phases back out over the next half
 * year, as the shelf price itself returns (`trade-effects.ts#liftPriceMove`).
 * So a tariff imposed and lifted, however many times, leaves the price level
 * where it started, and one that stands keeps its wedge.
 *
 * Both halves of the partner share are read off the recorded trade table, not
 * the live volumes: the live volumes fall under the tariff itself, so a step
 * read off them would print one figure in the preview and another once signed.
 */
import { US_GOODS_TRADE } from "@admin/world";
import { householdShare, tradeSector } from "./trade-sectors.js";
/** About six months. After this the pressure is gone even if the tariff stands. */
export const TARIFF_PHASE_WEEKS = 26;
const WEEKS_PER_YEAR = 52;
const round6 = (value) => Math.round(value * 1_000_000) / 1_000_000 + 0;
const round3 = (value) => Math.round(value * 1000) / 1000;
const recordedImportsBySector = new Map();
/** What the United States imported in one sector from everyone, in the recorded year. */
function recordedSectorImports(sector) {
    const known = recordedImportsBySector.get(sector);
    if (known !== undefined)
        return known;
    const total = Object.values(US_GOODS_TRADE).reduce((sum, partner) => sum + (partner.imports[sector] ?? 0), 0);
    recordedImportsBySector.set(sector, total);
    return total;
}
/**
 * What a tariff at this rate on this partner and sector adds to the consumer
 * price level, once phased in. The one function the tariff form's preview and
 * the economy room's applied reading both print, so the two cannot disagree.
 */
export function tariffPriceStep(partner, sector, rate) {
    const def = tradeSector(sector);
    const total = recordedSectorImports(sector);
    if (!def || total <= 0 || rate <= 0)
        return 0;
    const shelfRise = round3(rate * def.borderPassThrough * def.shelfPassThrough);
    const partnerShare = (US_GOODS_TRADE[partner]?.imports[sector] ?? 0) / total;
    return round6(shelfRise * partnerShare * householdShare(sector));
}
function isPricedTariff(measure) {
    return measure.kind === "tariff" && measure.origin === "us";
}
/** What a lifted tariff had passed through by its lift, and whether this week is still inside the half year it takes to come back out. */
function unwound(campaign, measure, step) {
    const lifted = measure.liftedTurn;
    const sinceLift = campaign.turn - lifted;
    if (sinceLift < 0 || sinceLift >= TARIFF_PHASE_WEEKS)
        return 0;
    const weeksIn = Math.max(0, Math.min(lifted - measure.imposedTurn, TARIFF_PHASE_WEEKS));
    return (step * weeksIn) / TARIFF_PHASE_WEEKS;
}
export function projectTariffPrices(campaign) {
    const measures = [];
    let phasing = 0;
    let unwinding = 0;
    for (const measure of Object.values(campaign.trade.measures)) {
        if (!isPricedTariff(measure))
            continue;
        const age = campaign.turn - measure.imposedTurn;
        if (age < 0)
            continue;
        const step = tariffPriceStep(measure.target, measure.sector, measure.rate);
        if (measure.liftedTurn !== undefined) {
            unwinding += unwound(campaign, measure, step);
            continue;
        }
        measures.push({ measure: measure.id, step, weeksIn: Math.min(age, TARIFF_PHASE_WEEKS) });
        if (age < TARIFF_PHASE_WEEKS)
            phasing += step;
    }
    const step = round6(phasing);
    return { step, thisWeek: round6(((phasing - unwinding) * WEEKS_PER_YEAR) / TARIFF_PHASE_WEEKS), measures, unwinding: round6(unwinding) };
}
