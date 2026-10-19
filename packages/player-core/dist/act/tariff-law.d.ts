import { type Campaign, type TariffStatute, type TradeSectorId } from "@admin/engine";
import type { NationId } from "@admin/world";
export type TariffLawRow = {
    readonly statute: TariffStatute;
    readonly name: string;
    readonly cite: string;
    readonly purpose: string;
    readonly available: boolean;
    readonly reason: string;
    /** Pressing the act orders this law's investigation rather than a tariff. */
    readonly orders: "tariff" | "investigation" | "wait" | "nothing";
    /** Whole percent this law still allows on these goods from this country. */
    readonly roomPercent: number;
    /** The cap and the clock, in a few words. */
    readonly limits: string;
    readonly courts: string;
    /** Who investigates and for how long, where the law needs a finding. */
    readonly investigation?: {
        readonly by: string;
        readonly weeks: number;
        readonly subject: "goods" | "partner";
    };
};
export declare function tariffLaw(campaign: Campaign, nation: NationId, sector: TradeSectorId, statute: TariffStatute): TariffLawRow;
export declare function tariffLaws(campaign: Campaign, nation: NationId, sector: TradeSectorId): readonly TariffLawRow[];
/** The law a draft uses: the one asked for, or the first that can carry a tariff now, or the first whose investigation can be ordered. */
export declare function chosenTariffLaw(campaign: Campaign, nation: NationId, sector: TradeSectorId, requested?: TariffStatute): TariffLawRow;
