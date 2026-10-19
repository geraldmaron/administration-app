export type MetricCopy = {
    /** A display label where the key's own words would mislead. */
    readonly label?: string;
    readonly description: string;
    /** What the low and high ends of a relative scale mean. */
    readonly scale?: {
        readonly low: string;
        readonly high: string;
    };
};
export declare const METRIC_COPY: Readonly<Record<string, MetricCopy>>;
