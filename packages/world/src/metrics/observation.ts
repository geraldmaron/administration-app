import { z } from "zod";

/** A missing value says why. Zero is a value; none of these are. */
export const ObservationValue = z.discriminatedUnion("status", [
  z.object({ status: z.literal("value"), value: z.number().finite() }),
  z.object({ status: z.literal("missing") }),
  z.object({ status: z.literal("not-applicable") }),
  z.object({ status: z.literal("not-modeled") }),
  z.object({ status: z.literal("suppressed") }),
  z.object({ status: z.literal("not-yet-observed") }),
]);
export type ObservationValue = z.infer<typeof ObservationValue>;

export const EvidenceClass = z.enum([
  "observed-reference",
  "estimated-reference",
  "simulated",
  "forecast",
]);

/** "2026-08", "2026-Q2" or "2026": the period an observation covers. */
export const PeriodKey = z.string().regex(/^\d{4}(-(\d{2}|Q[1-4]))?$/);

export const MetricObservation = z.object({
  id: z.string(),
  metric: z.string(),
  entity: z.string(),
  period: PeriodKey,
  /** The day it was released; absent for a simulated week with no release. */
  released: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  vintage: z.number().int().positive(),
  evidence: EvidenceClass,
  provenance: z.string(),
  result: ObservationValue,
});
export type MetricObservation = z.infer<typeof MetricObservation>;

export const ReferenceDatasetManifest = z.object({
  id: z.string(),
  version: z.string(),
  provider: z.string(),
  /** The entities the dataset holds, when it holds more than one. */
  entities: z.array(z.string()).optional(),
  retrieved: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  license: z.string(),
  series: z.array(
    z.object({
      metric: z.string(),
      sourceId: z.string(),
      sourceUrl: z.string().url(),
      transformation: z.string(),
      coverage: z.object({ first: PeriodKey, last: PeriodKey }),
    }),
  ),
});
export type ReferenceDatasetManifest = z.infer<typeof ReferenceDatasetManifest>;

export const valueOf = (o: MetricObservation): number | undefined =>
  o.result.status === "value" ? o.result.value : undefined;
