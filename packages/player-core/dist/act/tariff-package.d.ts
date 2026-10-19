import { type Campaign, type EffectPacket, type TariffStatute } from "@admin/engine";
import type { NationId } from "@admin/world";
import { type BuiltLine } from "./build";
import { type OddsStance } from "./preview";
export type TariffGood = {
    readonly sector: string;
    readonly rate: number;
};
export type TariffGoodReading = {
    readonly sector: string;
    readonly name: string;
    readonly rate: number;
    /** The tariff on these goods now, in whole percent, before this order. */
    readonly standing: number;
    /** How much more the law lets this order add, in whole percent. */
    readonly room: number;
    readonly law: string;
    /** Ordered as a tariff, as the law's investigation, or left out with the engine's reason. */
    readonly status: "tariff" | "investigation" | "refused";
    readonly reason?: string;
    /** Customs revenue a year, USD millions, as the preview prices it. */
    readonly revenue?: number;
    /** Fractional rise in the US shelf price within a year. */
    readonly shelfPriceRise?: number;
    /** Fractional fall in what we import of it from them. */
    readonly importFall?: number;
    readonly retaliation?: {
        readonly word: string;
        readonly stance: OddsStance;
    };
};
export type TariffPackageReading = {
    readonly goods: readonly TariffGoodReading[];
    /** Revenue a year across every good that is ordered as a tariff. */
    readonly revenue: number;
    /** How many goods the order would actually cover. */
    readonly ordered: number;
};
/** Each good as the order would take it, priced on the world the goods before it leave. */
export declare function readTariffPackage(campaign: Campaign, nation: NationId, goods: readonly TariffGood[], statute?: TariffStatute): TariffPackageReading;
export type TariffPackageBuild = {
    readonly ok: true;
    readonly packet: readonly EffectPacket[];
    readonly title: string;
    readonly lines: readonly BuiltLine[];
    readonly charged: 0;
} | {
    readonly ok: false;
    readonly reason: string;
};
/**
 * The packets for every good the order covers, in order, for one review and
 * one commit. A good the engine refuses is left out and named on the receipt;
 * an order that covers nothing is refused.
 */
export declare function buildTariffPackage(campaign: Campaign, nation: NationId, goods: readonly TariffGood[], statute?: TariffStatute): TariffPackageBuild;
