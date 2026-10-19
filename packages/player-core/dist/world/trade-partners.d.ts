import { type Campaign, type TradeMeasureKind } from "@admin/engine";
import type { NationId, SectorId } from "@admin/world";
export type TradePartnerRow = {
    readonly nation: NationId;
    readonly name: string;
    /** Share of the country's own trade that runs to this partner, 0..1. */
    readonly share: number;
    readonly shareText: string;
    readonly href: string;
};
export type TradeSectorRow = {
    readonly sector: string;
    readonly name: string;
    /** The dataset sector this one rolls into, which names its glyph. */
    readonly rollup: SectorId;
    /** What the United States buys from this government in these goods, a year, in USD millions. */
    readonly imports: number;
    /** What the United States sells it in these goods, a year, in USD millions. */
    readonly exports: number;
    readonly importsText: string;
    readonly exportsText: string;
    /** Whether a tariff is the instrument for these goods; others are licensed or controlled. */
    readonly tariffable: boolean;
    /** Whole percent of tariff in force on the goods the United States buys. */
    readonly tariffPercent: number;
};
export type MeasureRow = {
    readonly id: string;
    readonly kind: TradeMeasureKind;
    readonly kindWord: string;
    readonly sectorName: string;
    /** "25%" for a tariff; absent for a prohibition, which has no rate. */
    readonly rateText?: string;
    readonly since: string;
    /** The administration's own measure, which it can lift; the partner's answer is not its to lift. */
    readonly ours: boolean;
    /** The trade law an American tariff was imposed under, where the save recorded one. */
    readonly statute?: string;
};
export type BilateralTrade = {
    readonly nation: NationId;
    readonly name: string;
    /** This country's share of all US goods trade, 0..1; absent when the United States trades no goods. */
    readonly usShare?: number;
    readonly usShareText?: string;
    /** All goods the United States buys from it and sells it, a year, in USD millions. */
    readonly imports: number;
    readonly exports: number;
    readonly importsText: string;
    readonly exportsText: string;
    /** The gap between the two, in a sentence a reader can use. */
    readonly balanceLine: string;
    readonly sectors: readonly TradeSectorRow[];
    readonly measures: readonly MeasureRow[];
    readonly partners: readonly TradePartnerRow[];
};
/** A share of trade as a reader says it: whole percents once it is large, a tenth of a point while it is small. */
export declare function formatShare(share: number): string;
/**
 * One country's trade with the United States and with the world. Undefined for
 * the President's own country and for an id the board does not carry.
 */
export declare function bilateralTradePartners(campaign: Campaign, nation: NationId): BilateralTrade | undefined;
