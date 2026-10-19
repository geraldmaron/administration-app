import { Nation, NationBands, NationStats, NationTraits, Person, Relationship } from "../schemas/index.js";
import { schemaLeaves, type SchemaLeaf, type SchemaLeafType, type SchemaNode } from "./schema-walk.js";
import { STAT_UNITS, type UnitSpec } from "./units.js";
import {
  BAND_CONSUMERS,
  GEO_CONSUMERS,
  PERSON_CONSUMERS,
  STAT_CONSUMERS,
  TRAIT_CONSUMERS,
  type ReaderSite,
  type StatConsumer,
  type WritePolicy,
} from "./stat-consumers.js";
import type { QuantityKind } from "../metrics/definitions.js";
import { METRIC_COPY, type MetricCopy } from "./metric-copy.js";

// The metric registry: one record per figure the game keeps, saying what it
// is, what it is measured in, what values it may take, where it comes from and
// who reads it.
//
// Three registries already answered one question each — units.ts what a stat
// is measured in, stat-consumers.ts who reads it, and the zod schema what
// values it admits — and a fourth answer, what the figure *means*, lived in
// the player app as copy. An operator looking at a nation record could see a
// number and none of the four. This module is the join: every field is
// derived from the schema (so a field cannot be listed here that the schema
// does not have), the unit and consumer come from their own registries (so
// this cannot disagree with them), and only the description and the meaning
// of a scale's two ends are authored, in metric-copy.ts, where a completeness
// test holds them to the same standard the unit registry holds units to.

export const METRIC_SURFACES = ["record", "identity", "geo", "stats", "traits", "doctrine", "bands", "person", "relationship"] as const;
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
  readonly scale?: { readonly low: string; readonly high: string };
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

const DERIVED: Readonly<Record<string, string>> = {
  "stats.demography.growthRate": "applyVitalRates — birthRate − deathRate + netMigration, held to the identity by the validator",
  "stats.trade.topPartners": "applyTrade — the trade gravity model over GDP, distance, shared region and memberships",
  "stats.trade.tradeDependence": "applyTrade — each partner's share of modeled trade attraction, dropping shares that round to nothing",
  "geo.neighbors": "applyGeography — the neighbor list authored in geography.ts, so adjacency is symmetric by construction",
  "geo.chokepoints": "applyGeography — the chokepoints a nation's trade depends on, from geography.ts",
  "geo.chokepointDependence": "applyGeography — how much each of those chokepoints weighs on the nation, the authored row or its region's prior",
  memberships: "applyMemberships — mirrored from the organization registry's member lists",
  "bands.archetype": "bands.archetype — a decision list over population, stability, trade intensity, energy balance, reach and power tier",
  "bands.powerTier": "bands.powerTier — powerScore (GDP, military score, reach, aid leverage, population) cut at 0.5 / 0.63 / 0.75 / 0.93",
  "bands.wealthTier": "bands.wealthTier — GDP per capita discounted by sovereign rating, debt burden and reserves, cut at $3K / $12K / $28K / $50K",
  "bands.alignmentBand": "bands.alignmentBand — memberships in aligned or opposed compacts plus alignment pulls toward the poles",
  "bands.stabilityBand": "bands.stabilityBand — stabilityScore (regime hold, writ, friction, economic strain) cut at 0.56 / 0.34 / 0.21",
  "bands.militaryTier": "bands.militaryTier — militaryScore (mass, usability, branches, reach, arsenal) cut at 0.7 / 1.3 / 1.9 / 2.6",
  "bands.militaryMetrics.forceIndex": "bands.computeMilitaryMetrics — the military score clamped to 0..1",
  "bands.militaryMetrics.mobilizationCap": "bands.computeMilitaryMetrics — mass × usability plus branch strength",
  "bands.militaryMetrics.sustainability.warDuration": "bands.computeMilitaryMetrics — defense burden, usability and the share of the population under arms",
  "bands.militaryMetrics.sustainability.industrialMobilization": "bands.computeMilitaryMetrics — economic mass plus usability",
  "bands.militaryMetrics.downtime": "bands.computeMilitaryMetrics — one minus readiness, doctrine and usability weighted",
};

const RUNTIME: Readonly<Record<MetricSurface, string | undefined>> = {
  record: undefined,
  identity: undefined,
  geo: undefined,
  stats: undefined,
  traits: undefined,
  doctrine: undefined,
  bands: undefined,
  person: "engine.people.generateWorldPool — rolled per campaign from the nation's name bank and the role profiles",
  relationship: "engine.relationship-graph — built at founding from memberships, compacts, trade and doctrine, then moved by play",
};

const SCALAR: ReadonlySet<SchemaLeafType> = new Set(["number", "integer", "boolean", "enum", "text"]);

const humanize = (key: string): string => key.replace(/([A-Z])/g, " $1").replace(/[-_]/g, " ").replace(/^./, (c) => c.toUpperCase()).trim();

function consumerFor(surface: MetricSurface, path: string): StatConsumer | undefined {
  const registry: Readonly<Record<MetricSurface, readonly StatConsumer[]>> = {
    record: [],
    identity: [],
    geo: GEO_CONSUMERS,
    stats: STAT_CONSUMERS,
    traits: TRAIT_CONSUMERS,
    doctrine: [],
    bands: BAND_CONSUMERS,
    person: PERSON_CONSUMERS,
    relationship: [],
  };
  return registry[surface].find((entry) => entry.path === path);
}

function recordPathOf(surface: MetricSurface, path: string): string {
  return surface === "record" ? path : `${surface}.${path}`;
}

function build(surface: MetricSurface, leaf: SchemaLeaf): MetricSpec {
  const recordPath = recordPathOf(surface, leaf.path);
  const copy: MetricCopy | undefined = METRIC_COPY[recordPath];
  const consumer = consumerFor(surface, leaf.path);
  const derivedBy = DERIVED[recordPath] ?? (RUNTIME[surface] !== undefined ? RUNTIME[surface] : undefined);
  const provenance: MetricProvenance = DERIVED[recordPath] ? "derived" : RUNTIME[surface] ? "runtime" : "authored";
  const unit = surface === "stats" ? STAT_UNITS[leaf.path] : undefined;
  const last = leaf.path.split(".").pop() ?? leaf.path;
  const group = leaf.path.includes(".") ? (leaf.path.split(".")[0] ?? surface) : surface;
  return {
    surface,
    path: leaf.path,
    recordPath,
    group,
    label: copy?.label ?? humanize(last),
    description: copy?.description ?? "",
    valueType: leaf.type,
    optional: leaf.optional,
    ...(unit ? { unit } : {}),
    ...(leaf.min !== undefined ? { min: leaf.min } : {}),
    ...(leaf.max !== undefined ? { max: leaf.max } : {}),
    ...(leaf.options ? { options: leaf.options } : {}),
    ...(copy?.scale ? { scale: copy.scale } : {}),
    provenance,
    ...(derivedBy ? { derivedBy } : {}),
    ...(consumer?.kind ? { kind: consumer.kind } : {}),
    ...(consumer?.writePolicy ? { writePolicy: consumer.writePolicy } : {}),
    ...(consumer && "readBy" in consumer ? { readBy: consumer.readBy, purpose: consumer.purpose } : {}),
    ...(consumer && "owedBy" in consumer ? { owedBy: consumer.owedBy } : {}),
    editable: provenance === "authored" && SCALAR.has(leaf.type) && recordPath !== "id",
  };
}

const nationShape = (Nation as unknown as { def: { shape: Record<string, SchemaNode> } }).def.shape;

const rootLeaf = (key: string): readonly SchemaLeaf[] => schemaLeaves(nationShape[key]!, key);

/** Every metric the game keeps, surface by surface, in schema order. */
export const METRICS: readonly MetricSpec[] = [
  ...["id", "playable", "sectors", "memberships", "partySystem"].flatMap((key) => rootLeaf(key).map((leaf) => build("record", leaf))),
  ...schemaLeaves(nationShape.identity!).map((leaf) => build("identity", leaf)),
  ...schemaLeaves(nationShape.geo!).map((leaf) => build("geo", leaf)),
  ...schemaLeaves(NationStats).map((leaf) => build("stats", leaf)),
  ...schemaLeaves(NationTraits).map((leaf) => build("traits", leaf)),
  ...schemaLeaves(nationShape.doctrine!).map((leaf) => build("doctrine", leaf)),
  ...schemaLeaves(NationBands).map((leaf) => build("bands", leaf)),
  ...schemaLeaves(Person).map((leaf) => build("person", leaf)),
  ...schemaLeaves(Relationship).map((leaf) => build("relationship", leaf)),
];

const byRecordPath: ReadonlyMap<string, MetricSpec> = new Map(METRICS.map((metric) => [metric.recordPath, metric]));

/** The metric at a record path — `stats.economy.gdp`, `geo.lat`, `person.age` — or nothing. */
export function metricFor(recordPath: string): MetricSpec | undefined {
  return byRecordPath.get(recordPath);
}

export function metricsOf(surface: MetricSurface): readonly MetricSpec[] {
  return METRICS.filter((metric) => metric.surface === surface);
}

/** Whether a reading has no natural unit and so must say what its ends mean. */
export function needsScale(metric: MetricSpec): boolean {
  if (metric.unit) return metric.unit.kind === "index";
  if (metric.valueType !== "number") return false;
  return metric.min !== undefined && metric.max !== undefined && metric.min >= -1 && metric.max <= 1;
}

/**
 * Why a proposed value may not be written, judged against the schema's own
 * bounds and the closed options an enum admits. Undefined means it may.
 */
export function metricRejection(metric: MetricSpec, value: unknown): string | undefined {
  if (!metric.editable) return `${metric.recordPath} is ${metric.provenance}, not authored — it cannot be edited here`;
  switch (metric.valueType) {
    case "number":
    case "integer": {
      if (typeof value !== "number" || !Number.isFinite(value)) return `${metric.recordPath} must be a finite number`;
      if (metric.valueType === "integer" && !Number.isInteger(value)) return `${metric.recordPath} must be a whole number`;
      if (metric.min !== undefined && value < metric.min) return `${metric.recordPath} must be at least ${metric.min}`;
      if (metric.max !== undefined && value > metric.max) return `${metric.recordPath} must be at most ${metric.max}`;
      return undefined;
    }
    case "boolean":
      return typeof value === "boolean" ? undefined : `${metric.recordPath} must be true or false`;
    case "enum":
      return typeof value === "string" && metric.options?.includes(value) ? undefined : `${metric.recordPath} must be one of ${metric.options?.join(", ")}`;
    case "text":
      return typeof value === "string" && value.trim().length > 0 ? undefined : `${metric.recordPath} must be non-empty text`;
    default:
      return `${metric.recordPath} is a ${metric.valueType}, which is not edited one value at a time`;
  }
}
