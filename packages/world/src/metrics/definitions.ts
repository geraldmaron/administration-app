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
export type QuantityKind =
  "stock" | "flow" | "rate" | "index" | "count" | "modeled-score" | "level" | "ordinal";

export type MetricUnit =
  "percent" | "fraction" | "index" | "usd-millions" | "count";

/** How one observation relates to the time it covers. */
export type ReferenceMeaning =
  | "point"
  | "period-total"
  | "change-on-year-earlier"
  /** The mean of the readings inside the period, as an agency publishes an annual average. */
  | "period-average"
  /** A calendar year's total or average set against the previous calendar year's. */
  | "annual-change"
  /** A rate expressed per year, computed over the period it is read at. */
  | "annual-rate";

export type Adjustment =
  "seasonally-adjusted" | "not-adjusted" | "not-applicable";

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

const UNEMPLOYMENT = {
  concept: "unemployment-rate",
  kind: "rate",
  denominator: "civilian labor force",
  priceBasis: "not-applicable",
  scope: "national",
} as const;

/** The vendored United States series, as the agencies publish them. */
export const REFERENCE_DEFINITIONS: Readonly<Record<string, MetricDefinition>> =
  {
    "us.unemployment": {
      ...UNEMPLOYMENT,
      id: "us.unemployment",
      label: "Unemployment rate",
      definition:
        "Share of the civilian labor force without work and looking for it, seasonally adjusted (BLS LNS14000000).",
      unit: "percent",
      frequency: "monthly",
      reference: "point",
      adjustment: "seasonally-adjusted",
      origin: "reference",
    },
    "us.cpi": {
      id: "us.cpi",
      label: "Consumer price index",
      concept: "consumer-price-level",
      definition:
        "CPI-U all items, U.S. city average, not seasonally adjusted (BLS CUUR0000SA0).",
      kind: "index",
      unit: "index",
      frequency: "monthly",
      reference: "point",
      adjustment: "not-adjusted",
      priceBasis: "nominal",
      scope: "national",
      indexBase: "1982-84=100",
      origin: "reference",
    },
    "us.inflation": {
      id: "us.inflation",
      label: "Inflation, twelve months",
      concept: "consumer-inflation",
      definition:
        "Twelve-month change in CPI-U, computed only where both months were published.",
      kind: "rate",
      unit: "percent",
      frequency: "monthly",
      reference: "change-on-year-earlier",
      adjustment: "not-adjusted",
      priceBasis: "nominal",
      scope: "national",
      origin: "reference",
    },
    "us.gdp-growth": {
      id: "us.gdp-growth",
      label: "Real GDP growth, four quarters",
      concept: "output-growth",
      definition:
        "Real GDP, percent change from the same quarter a year earlier (BEA NIPA Table 1.1.11 line 1).",
      kind: "rate",
      unit: "percent",
      denominator: "real GDP, same quarter a year earlier",
      frequency: "quarterly",
      reference: "change-on-year-earlier",
      adjustment: "seasonally-adjusted",
      priceBasis: "real",
      scope: "national",
      origin: "reference",
    },
  };

const WORLD = {
  scope: "national",
  frequency: "annual",
  origin: "reference",
} as const;

/**
 * The World Bank's annual series. Their reading differs from the monthly agency
 * series they resemble (an annual average, a calendar-year change), so a United
 * States agency line and a World Bank line are not interchangeable: set
 * countries beside each other in these, the United States included.
 */
export const WORLD_DEFINITIONS: Readonly<Record<string, MetricDefinition>> = {
  "wb.unemployment": {
    ...UNEMPLOYMENT,
    id: "wb.unemployment",
    label: "Unemployment rate",
    denominator: "total labor force",
    definition:
      "Share of the labor force without work and available for it, annual, modeled ILO estimate (SL.UEM.TOTL.ZS).",
    unit: "percent",
    frequency: WORLD.frequency,
    reference: "period-average",
    adjustment: "not-applicable",
    scope: WORLD.scope,
    origin: WORLD.origin,
  },
  "wb.inflation": {
    id: "wb.inflation",
    label: "Inflation",
    concept: "consumer-inflation",
    definition:
      "Annual percent change in the consumer price index (FP.CPI.TOTL.ZG).",
    kind: "rate",
    unit: "percent",
    frequency: WORLD.frequency,
    reference: "annual-change",
    adjustment: "not-adjusted",
    priceBasis: "nominal",
    scope: WORLD.scope,
    origin: WORLD.origin,
  },
  "wb.population-growth": {
    id: "wb.population-growth",
    label: "Population growth",
    concept: "population-growth",
    definition:
      "Exponential growth rate of midyear population over the year, de facto residents (SP.POP.GROW).",
    kind: "rate",
    unit: "percent",
    denominator: "midyear population, previous year",
    frequency: WORLD.frequency,
    reference: "annual-change",
    adjustment: "not-applicable",
    priceBasis: "not-applicable",
    scope: WORLD.scope,
    origin: WORLD.origin,
  },
  "wb.gdp-growth": {
    id: "wb.gdp-growth",
    label: "Real GDP growth",
    concept: "output-growth",
    definition:
      "Annual percent change in constant-price GDP (NY.GDP.MKTP.KD.ZG).",
    kind: "rate",
    unit: "percent",
    denominator: "real GDP, previous calendar year",
    frequency: WORLD.frequency,
    reference: "annual-change",
    adjustment: "not-applicable",
    priceBasis: "real",
    scope: WORLD.scope,
    origin: WORLD.origin,
  },
};

/** The same measures as the running campaign holds them: fractions, one value a week, no seasonal pattern simulated. */
export const SIMULATED_DEFINITIONS: Readonly<Record<string, MetricDefinition>> =
  {
    "sim.unemployment": {
      ...UNEMPLOYMENT,
      id: "sim.unemployment",
      label: "Unemployment rate",
      definition:
        "The campaign's unemployment rate, a fraction of the labor force.",
      unit: "fraction",
      frequency: "weekly",
      reference: "point",
      adjustment: "seasonally-adjusted",
      origin: "simulated",
    },
    "sim.inflation": {
      id: "sim.inflation",
      label: "Inflation",
      concept: "consumer-inflation",
      definition: "The campaign's inflation rate, a fraction per year.",
      kind: "rate",
      unit: "fraction",
      frequency: "weekly",
      reference: "annual-rate",
      adjustment: "not-adjusted",
      priceBasis: "nominal",
      scope: "national",
      origin: "simulated",
    },
    "sim.growth": {
      id: "sim.growth",
      label: "Real growth",
      concept: "output-growth",
      definition: "The campaign's real output growth, a fraction per year.",
      kind: "rate",
      unit: "fraction",
      denominator: "real GDP, same quarter a year earlier",
      frequency: "weekly",
      reference: "annual-rate",
      adjustment: "seasonally-adjusted",
      priceBasis: "real",
      scope: "national",
      origin: "simulated",
    },
  };

export const ALL_METRIC_DEFINITIONS: Readonly<
  Record<string, MetricDefinition>
> = {
  ...REFERENCE_DEFINITIONS,
  ...WORLD_DEFINITIONS,
  ...SIMULATED_DEFINITIONS,
};
