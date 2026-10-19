import { z } from "zod";
/** A missing value says why. Zero is a value; none of these are. */
export declare const ObservationValue: z.ZodDiscriminatedUnion<[z.ZodObject<{
    status: z.ZodLiteral<"value">;
    value: z.ZodNumber;
}, z.core.$strip>, z.ZodObject<{
    status: z.ZodLiteral<"missing">;
}, z.core.$strip>, z.ZodObject<{
    status: z.ZodLiteral<"not-applicable">;
}, z.core.$strip>, z.ZodObject<{
    status: z.ZodLiteral<"not-modeled">;
}, z.core.$strip>, z.ZodObject<{
    status: z.ZodLiteral<"suppressed">;
}, z.core.$strip>, z.ZodObject<{
    status: z.ZodLiteral<"not-yet-observed">;
}, z.core.$strip>], "status">;
export type ObservationValue = z.infer<typeof ObservationValue>;
export declare const EvidenceClass: z.ZodEnum<{
    simulated: "simulated";
    forecast: "forecast";
    "observed-reference": "observed-reference";
    "estimated-reference": "estimated-reference";
}>;
/** "2026-08", "2026-Q2" or "2026": the period an observation covers. */
export declare const PeriodKey: z.ZodString;
export declare const MetricObservation: z.ZodObject<{
    id: z.ZodString;
    metric: z.ZodString;
    entity: z.ZodString;
    period: z.ZodString;
    released: z.ZodOptional<z.ZodString>;
    vintage: z.ZodNumber;
    evidence: z.ZodEnum<{
        simulated: "simulated";
        forecast: "forecast";
        "observed-reference": "observed-reference";
        "estimated-reference": "estimated-reference";
    }>;
    provenance: z.ZodString;
    result: z.ZodDiscriminatedUnion<[z.ZodObject<{
        status: z.ZodLiteral<"value">;
        value: z.ZodNumber;
    }, z.core.$strip>, z.ZodObject<{
        status: z.ZodLiteral<"missing">;
    }, z.core.$strip>, z.ZodObject<{
        status: z.ZodLiteral<"not-applicable">;
    }, z.core.$strip>, z.ZodObject<{
        status: z.ZodLiteral<"not-modeled">;
    }, z.core.$strip>, z.ZodObject<{
        status: z.ZodLiteral<"suppressed">;
    }, z.core.$strip>, z.ZodObject<{
        status: z.ZodLiteral<"not-yet-observed">;
    }, z.core.$strip>], "status">;
}, z.core.$strip>;
export type MetricObservation = z.infer<typeof MetricObservation>;
export declare const ReferenceDatasetManifest: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodString;
    provider: z.ZodString;
    entities: z.ZodOptional<z.ZodArray<z.ZodString>>;
    retrieved: z.ZodString;
    license: z.ZodString;
    series: z.ZodArray<z.ZodObject<{
        metric: z.ZodString;
        sourceId: z.ZodString;
        sourceUrl: z.ZodString;
        transformation: z.ZodString;
        coverage: z.ZodObject<{
            first: z.ZodString;
            last: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type ReferenceDatasetManifest = z.infer<typeof ReferenceDatasetManifest>;
export declare const valueOf: (o: MetricObservation) => number | undefined;
