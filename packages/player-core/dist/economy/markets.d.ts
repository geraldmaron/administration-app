import { type Campaign, type CommodityFamily, type CommodityId, type CommodityReader } from "@admin/engine";
import { type MetricStance } from "../format/figures";
/** One point on a drawn line: a label a reader says, where it sits in weeks, and whether the week is still ahead. */
export type MarketPoint = {
    readonly label: string;
    readonly value: number;
    readonly at: number;
    readonly kind: "played" | "projected";
};
export declare const FAMILY_LABELS: Readonly<Record<CommodityFamily, string>>;
export declare const READER_LABELS: Readonly<Record<CommodityReader, string>>;
export type CommodityRow = {
    readonly id: CommodityId;
    readonly name: string;
    readonly reader: string;
    /** "$97.20 a barrel", or "Index 1.12" where no sourced price exists. */
    readonly figure: string;
    readonly sinceOath: string;
    readonly changeDirection: "up" | "down" | "flat";
    readonly stance: MetricStance;
    readonly points: readonly MarketPoint[];
    readonly cause?: string;
    /** Stocks against normal cover, 0..1.5; 1 is normal. */
    readonly stocks: number;
    /** The provenance line a planning value owes the reader. */
    readonly provenance: string;
};
/** A commodity at an index level, said as a price where a sourced anchor stands behind it and as an index where none does. */
export declare function commodityPriceFigure(id: CommodityId, index: number): string;
export type CommodityFamilyReading = {
    readonly family: CommodityFamily;
    readonly label: string;
    readonly rows: readonly CommodityRow[];
};
/** Every commodity by family, the order the registry keeps them in. */
export declare function commodityBoard(campaign: Campaign): readonly CommodityFamilyReading[];
export type HouseholdReading = {
    readonly key: "pump" | "grocery" | "home-energy";
    readonly label: string;
    readonly figure: string;
    readonly sinceOath: string;
    readonly stance: MetricStance;
    readonly points: readonly MarketPoint[];
    /** How far behind the markets the reading runs, in words. */
    readonly lag: string;
    /** What the drawn values are, for the chart's caption. */
    readonly unit: string;
    /** Where the bill lands in the price level, read in full. */
    readonly href: string;
};
/** The pump price, the grocery bill and the heating and power bill, each with the weeks its lag has already decided. */
export declare function householdReadings(campaign: Campaign): readonly HouseholdReading[];
export type EquityReading = {
    readonly level: number;
    readonly figure: string;
    readonly weekMove: string;
    readonly stance: MetricStance;
    readonly points: readonly MarketPoint[];
    /** Where this week's index would have to fall to for a crash, against last week's close. */
    readonly crashLine: number;
    readonly crashed: boolean;
};
/** The stock index against its own trend, 100 at the oath, with the week's crash line. */
export declare function equityReading(campaign: Campaign): EquityReading;
export type FedStep = {
    readonly date: string;
    readonly at: number;
    readonly rate: number;
    readonly target: number;
};
export type FedReading = {
    readonly rate: string;
    readonly chair: string;
    /** The chair's lean in words, from the tilt the rule uses. */
    readonly lean: string;
    readonly nextMeeting: string;
    /** The decisions on the record, oldest first, each a step on the chart. */
    readonly steps: readonly FedStep[];
    /** A public lean standing on the next meeting, if the President made one. */
    readonly pressure?: string;
};
/** The Federal Reserve as the President reads it: the rate, the chair, the next meeting and the steps so far. */
export declare function fedReading(campaign: Campaign): FedReading;
/** Where a commodity is read in full. */
export declare function commodityHref(id: CommodityId): string;
/** Where the Federal Reserve is read in full. */
export declare const FED_HREF: string;
export declare function isCommodityKey(id: string): id is CommodityId;
export type CommodityDetail = {
    readonly row: CommodityRow;
    readonly exposureHref?: string;
    readonly family: string;
    /** What is moving it this week, heaviest first, each with its share of world supply lost. */
    readonly shocks: readonly {
        readonly cause: string;
        readonly share: string;
    }[];
    /** Who supplies the world market, largest first, as shares of the world total. */
    readonly suppliers: readonly {
        readonly nation: string;
        readonly name: string;
        readonly share: number;
    }[];
    /** What goes into it, felt after a lag. */
    readonly inputs: readonly {
        readonly id: CommodityId;
        readonly text: string;
        readonly lagWeeks: number;
    }[];
};
/** One commodity in full: its line, what moves it this week, who supplies it and what goes into it. */
export declare function commodityDetail(campaign: Campaign, id: CommodityId): CommodityDetail;
