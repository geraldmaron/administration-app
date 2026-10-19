import { ReferenceDatasetManifest, type MetricObservation } from "./observation.js";
/** The offline United States reference pack: observed, latest vintage only. */
export declare const US_REFERENCE_OBSERVATIONS: Readonly<Record<string, readonly MetricObservation[]>>;
export declare const US_REFERENCE_MANIFEST: ReferenceDatasetManifest;
/**
 * The observations of a metric whose period lies wholly inside [first, last]
 * (months, "YYYY-MM"), or why the request cannot be answered. Periods are
 * ordered by the months they cover, so a quarter sits among its months.
 */
export declare function referenceWindow(metric: string, first: string, last: string): {
    readonly ok: true;
    readonly observations: readonly MetricObservation[];
} | {
    readonly ok: false;
    readonly reason: string;
};
