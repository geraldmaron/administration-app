export type UsSeriesPoint = {
    readonly date: string;
    readonly value: number;
};
export declare const US_SERIES: Readonly<Record<string, readonly UsSeriesPoint[]>>;
export declare const US_SERIES_SOURCES: Readonly<Record<string, string>>;
/** The publication date of each series' latest release. */
export declare const US_SERIES_RELEASES: Readonly<Record<string, string>>;
export declare const US_SERIES_VINTAGE: string | undefined;
