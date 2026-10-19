export type WorldSeriesPoint = {
    readonly date: string;
    readonly value: number | null;
};
export declare const WORLD_SERIES: Readonly<Record<string, Readonly<Record<string, readonly WorldSeriesPoint[]>>>>;
export declare const WORLD_SERIES_SOURCES: Readonly<Record<string, string>>;
export declare const WORLD_SERIES_COUNTRIES: Readonly<Record<string, string>>;
export declare const WORLD_SERIES_LICENSE = "Creative Commons Attribution 4.0 (World Bank Data Catalog, World Development Indicators); attribute The World Bank Group and the original providers named in each series";
/** The World Bank's last-updated date for the database these rows came from. */
export declare const WORLD_SERIES_VINTAGE = "2026-10-08";
export declare const WORLD_SERIES_OPENED = "2026-10-11";
