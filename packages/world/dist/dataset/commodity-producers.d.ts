export type CommodityProducerMetric = "production" | "exports";
export type CommodityProducerRow = {
    readonly commodity: string;
    /** Output, or the traded share: a world price is set by what crosses borders, so a grain exporter can matter more than a larger grower. */
    readonly metric: CommodityProducerMetric;
    readonly nation: string;
    /** 0..1 of the world total the metric names. */
    readonly share: number;
    readonly source: string;
    readonly opened: string;
};
export declare const COMMODITY_PRODUCERS: readonly CommodityProducerRow[];
