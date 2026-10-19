import type { QuantityKind, WritePolicy } from "@admin/world";
import { type InstrumentId } from "./instrument-ids.js";
export type MetricNodeId = string;
export type MetricNode = {
    readonly id: MetricNodeId;
    readonly label: string;
    readonly definition: string;
    readonly unit: "ratio" | "usd" | "count" | "band" | "composite";
    readonly parents: readonly MetricNodeId[];
    readonly children: readonly MetricNodeId[];
    /** Engine export name for the weight table if any */
    readonly weightsExport?: string;
    readonly provenance: string;
    readonly updateCadence: "derived" | "per-turn" | "per-effect" | "founding";
    /** What kind of quantity it is, in the vocabulary the world registries share. A container of other nodes has none. */
    readonly kind?: QuantityKind;
    /** Who may change it once a campaign runs (`WritePolicy` in the world registry). */
    readonly writePolicy: WritePolicy;
    /**
     * Where it is stored, as `Type.field`, for a node the campaign keeps rather
     * than recomputes. `scripts/report-metric-registry.mjs` lists the readers and
     * writers of the field it names.
     */
    readonly field?: `${"MetricSet" | "PublicMood"}.${string}`;
};
/** Player-visible metrics that must stay connected in the dependency graph. */
export declare const CORE_METRIC_NODE_IDS: readonly ["approval", "treasury", "treasuryHealth", "stability", "militaryReadiness", "standing", "removalPressure", "polarization", ...(import("./opinion-drivers.js").OpinionDriver | InstrumentId | "instruments" | "congressHostility")[]];
export declare const METRIC_REGISTRY: readonly MetricNode[];
export declare function metricNode(id: MetricNodeId): MetricNode | undefined;
export declare function metricChildren(id: MetricNodeId): readonly MetricNode[];
export declare function metricParents(id: MetricNodeId): readonly MetricNode[];
