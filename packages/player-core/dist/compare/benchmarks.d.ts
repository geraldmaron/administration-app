import { type Campaign } from "@admin/engine";
import type { CompareMetric } from "./metrics.js";
import type { CompareBenchmark } from "./types.js";
/** Every defined line for a reading, on the reading's own scale, ascending. */
export declare function compareBenchmarks(campaign: Campaign, metric: CompareMetric): readonly CompareBenchmark[];
