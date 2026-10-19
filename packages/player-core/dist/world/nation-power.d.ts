import { type Campaign } from "@admin/engine";
import type { NationId } from "@admin/world";
export type NationPower = {
    /** Residents, a headcount. */
    readonly population: number;
    /** Gross domestic product, USD millions. */
    readonly gdpUsdMillions: number;
    /** GDP per resident, whole USD, as the dataset states it. */
    readonly gdpPerCapitaUsd: number;
    /**
     * Defense spending, USD millions. Absent where the services have no read on
     * the government: its budget is not a published figure.
     */
    readonly militarySpendUsdMillions?: number;
    /** Military spending as a share of GDP, 0..1, where the budget is read. */
    readonly militarySpendShareOfGdp?: number;
};
/** A foreign government's size, or undefined for an id the board does not carry. */
export declare function nationPower(campaign: Campaign, nation: NationId): NationPower | undefined;
