import { ReferenceDatasetManifest, type MetricObservation } from "./observation.js";
export declare const WORLD_REFERENCE_COUNTRIES: Readonly<Record<string, string>>;
/** Observations by metric then country (ISO-3), oldest first, a year the source did not publish an explicit gap. */
export declare const WORLD_REFERENCE_OBSERVATIONS: Readonly<Record<string, Readonly<Record<string, readonly MetricObservation[]>>>>;
export declare const WORLD_REFERENCE_MANIFEST: ReferenceDatasetManifest;
/** One country's observations of a metric inside [first, last] (years or months), or why they cannot be answered. */
export declare function worldWindow(metric: string, country: string, first: string, last: string): {
    readonly ok: true;
    readonly observations: readonly MetricObservation[];
} | {
    readonly ok: false;
    readonly reason: string;
};
