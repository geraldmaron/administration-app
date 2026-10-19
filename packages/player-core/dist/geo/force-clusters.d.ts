import { type Campaign } from "@admin/engine";
import type { LonLat, NationId } from "@admin/world";
import type { ForcePlacement, ForcePrecision } from "./force-placement.js";
export type ForceZoom = "world" | "region" | "close";
export type ForceCluster = {
    readonly key: string;
    readonly zoom: ForceZoom;
    readonly label: string;
    readonly point: LonLat;
    /** The commitments inside, in id order. */
    readonly members: readonly string[];
    readonly personnel: number;
    /** Exact only for a single sourced installation seen up close. */
    readonly precision: ForcePrecision;
    readonly actor: NationId;
};
export declare function clusterForces(campaign: Campaign, placements: readonly ForcePlacement[], zoom: ForceZoom): readonly ForceCluster[];
