import { type Campaign } from "@admin/engine";
/** A consumer-price step in points of the price level: "+0.03 pts". */
export declare function priceStep(step: number): string;
export type AppliedTariffPrice = {
    readonly measure: string;
    readonly label: string;
    readonly figure: string;
    /** "12 of 26 weeks in", or "fully passed through". */
    readonly progress: string;
};
/** Every administration tariff in force, with the consumer-price step it carries. */
export declare function appliedTariffPrices(campaign: Campaign): readonly AppliedTariffPrice[];
