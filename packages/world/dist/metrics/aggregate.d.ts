import type { Frequency, MetricDefinition } from "./definitions.js";
import type { MetricObservation } from "./observation.js";
/** The first and last month index a period of any cadence covers. */
export declare const periodStart: (period: string) => number;
export declare const periodEnd: (period: string) => number;
/** The month index (year × 12 + month) a monthly period names. */
export declare const monthIndex: (period: string) => number;
export declare const monthPeriod: (index: number) => string;
/**
 * Bring monthly observations to a coarser cadence by the definition's own rule.
 * A period with any constituent not carrying a value is itself missing: a sum
 * over a gap, or a last reading that was never published, is not an observation.
 * A period the series does not fully cover is dropped rather than reported short.
 */
export declare function resample(def: MetricDefinition, observations: readonly MetricObservation[], to: Frequency): readonly MetricObservation[];
