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
import { type NationId } from "@admin/world";
import type { Campaign } from "./state.js";
import type { TradeMeasureId } from "./trade.js";
import { type TradeSectorId } from "./trade-sectors.js";
/** About six months. After this the pressure is gone even if the tariff stands. */
export declare const TARIFF_PHASE_WEEKS = 26;
export type TariffStepInForce = {
    readonly measure: TradeMeasureId;
    /** The whole rise this tariff puts on the consumer price level, as a fraction. */
    readonly step: number;
    /** Weeks of the phase-in already behind it, 0 to TARIFF_PHASE_WEEKS. */
    readonly weeksIn: number;
};
export type TariffPriceMove = {
    /** The consumer-price rise still phasing in, summed over every tariff, as a fraction of the price level. */
    readonly step: number;
    /**
     * This week's shift in the annual inflation target. Held for the whole
     * phase-in, it adds up to `step`: a shift of s a year held for half a year is
     * s/2 on the level.
     */
    readonly thisWeek: number;
    /** Each administration tariff in force, with its step and how far it has phased in. */
    readonly measures: readonly TariffStepInForce[];
    /** The rise lifted tariffs had passed through that is still phasing back out, as a fraction of the price level. */
    readonly unwinding: number;
};
/**
 * What a tariff at this rate on this partner and sector adds to the consumer
 * price level, once phased in. The one function the tariff form's preview and
 * the economy room's applied reading both print, so the two cannot disagree.
 */
export declare function tariffPriceStep(partner: NationId, sector: TradeSectorId, rate: number): number;
export declare function projectTariffPrices(campaign: Campaign): TariffPriceMove;
