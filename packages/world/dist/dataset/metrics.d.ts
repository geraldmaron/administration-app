import { type SchemaLeafType } from "./schema-walk.js";
import { type UnitSpec } from "./units.js";
import { type ReaderSite, type WritePolicy } from "./stat-consumers.js";
import type { QuantityKind } from "../metrics/definitions.js";
export declare const METRIC_SURFACES: readonly ["record", "identity", "geo", "stats", "traits", "doctrine", "bands", "person", "relationship"];
export type MetricSurface = (typeof METRIC_SURFACES)[number];
/**
 * Where a value comes from. `authored` is written in packages/world source
 * and is what the console edits; `derived` is computed at dataset assembly
 * from authored fields and cannot be edited without being overwritten;
 * `runtime` exists only inside a campaign — generated from a seed or built at
 * founding — and is never on the dataset at all.
 */
export type MetricProvenance = "authored" | "derived" | "runtime";
export type MetricSpec = {
    readonly surface: MetricSurface;
    /** The path within the surface: `economy.gdp` on `stats`, `lat` on `geo`. */
    readonly path: string;
    /** The path on the record the surface belongs to: `stats.economy.gdp`, `geo.lat`, `person.age`. */
    readonly recordPath: string;
    /** The heading a page groups the metric under. */
    readonly group: string;
    readonly label: string;
    readonly description: string;
    readonly valueType: SchemaLeafType;
    readonly optional: boolean;
    readonly unit?: UnitSpec;
    readonly min?: number;
    readonly max?: number;
    readonly options?: readonly string[];
    /** What the two ends of a relative scale mean, for every reading without a natural unit. */
    readonly scale?: {
        readonly low: string;
        readonly high: string;
    };
    readonly provenance: MetricProvenance;
    /** Which assembly step or runtime writes a derived or runtime value. */
    readonly derivedBy?: string;
    /** What kind of quantity it is, where the consumer registry says. */
    readonly kind?: QuantityKind;
    /** Who may change it once a campaign runs, where the consumer registry says. */
    readonly writePolicy?: WritePolicy;
    /** The declarations that read it, as `path#declaration` sites. */
    readonly readBy?: readonly ReaderSite[];
    /** What those readers do with it, in words. */
    readonly purpose?: string;
    readonly owedBy?: string;
    /** Whether the console may write it: an authored scalar that is not the record's id. */
    readonly editable: boolean;
};
/** Every metric the game keeps, surface by surface, in schema order. */
export declare const METRICS: readonly MetricSpec[];
/** The metric at a record path — `stats.economy.gdp`, `geo.lat`, `person.age` — or nothing. */
export declare function metricFor(recordPath: string): MetricSpec | undefined;
export declare function metricsOf(surface: MetricSurface): readonly MetricSpec[];
/** Whether a reading has no natural unit and so must say what its ends mean. */
export declare function needsScale(metric: MetricSpec): boolean;
/**
 * Why a proposed value may not be written, judged against the schema's own
 * bounds and the closed options an enum admits. Undefined means it may.
 */
export declare function metricRejection(metric: MetricSpec, value: unknown): string | undefined;
