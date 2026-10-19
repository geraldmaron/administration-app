/**
 * What a comparable series measures, stated precisely enough that two of them
 * can be checked against each other. This is the vocabulary comparison needs;
 * the engine's causal metric graph (`metric-registry.ts`) answers a different
 * question (what moves what) and is not duplicated here.
 */
export type Frequency = "weekly" | "monthly" | "quarterly" | "annual";
/**
 * What kind of quantity a figure is. Shared by the comparable series here and
 * by the game's own registries (`stat-consumers.ts`, the engine's
 * `metric-registry.ts`), so a figure is never one kind to the comparison and
 * another to the registry.
 *
 * `level` is a reading in its own unit that is neither summed like a stock or
 * flow nor a share of anything: a median age, output per person. `ordinal` is
 * a step on an ordered scale, a credit grade or an instrument's rung, compared
 * by order and never by difference. The registries need both and none of the
 * other six fits either.
 */
export type QuantityKind = "stock" | "flow" | "rate" | "index" | "count" | "modeled-score" | "level" | "ordinal";
export type MetricUnit = "percent" | "fraction" | "index" | "usd-millions" | "count";
/** How one observation relates to the time it covers. */
export type ReferenceMeaning = "point" | "period-total" | "change-on-year-earlier"
/** The mean of the readings inside the period, as an agency publishes an annual average. */
 | "period-average"
/** A calendar year's total or average set against the previous calendar year's. */
 | "annual-change"
/** A rate expressed per year, computed over the period it is read at. */
 | "annual-rate";
export type Adjustment = "seasonally-adjusted" | "not-adjusted" | "not-applicable";
export type PriceBasis = "real" | "nominal" | "not-applicable";
export type Scope = "national" | "federal" | "general-government";
export type MetricOrigin = "reference" | "simulated";
export type MetricDefinition = {
    readonly id: string;
    readonly label: string;
    /** The thing measured, shared by every series of it: "unemployment-rate", not "BLS table A-1". */
    readonly concept: string;
    readonly definition: string;
    readonly kind: QuantityKind;
    readonly unit: MetricUnit;
    readonly denominator?: string;
    readonly frequency: Frequency;
    readonly reference: ReferenceMeaning;
    readonly adjustment: Adjustment;
    readonly priceBasis: PriceBasis;
    readonly scope: Scope;
    /** For an index: what it equals at its base, e.g. "1982-84=100". Two different bases are not level-comparable. */
    readonly indexBase?: string;
    readonly origin: MetricOrigin;
};
/** The vendored United States series, as the agencies publish them. */
export declare const REFERENCE_DEFINITIONS: Readonly<Record<string, MetricDefinition>>;
/**
 * The World Bank's annual series. Their reading differs from the monthly agency
 * series they resemble (an annual average, a calendar-year change), so a United
 * States agency line and a World Bank line are not interchangeable: set
 * countries beside each other in these, the United States included.
 */
export declare const WORLD_DEFINITIONS: Readonly<Record<string, MetricDefinition>>;
/** The same measures as the running campaign holds them: fractions, one value a week, no seasonal pattern simulated. */
export declare const SIMULATED_DEFINITIONS: Readonly<Record<string, MetricDefinition>>;
export declare const ALL_METRIC_DEFINITIONS: Readonly<Record<string, MetricDefinition>>;
