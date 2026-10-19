import type { NationId } from "@admin/world";
import { type CausalId } from "./causality.js";
import type { Campaign } from "./state.js";
import type { EffectPacket } from "./effects.js";
import type { RngStreams } from "./rng.js";
type IncidentPressure = {
    readonly tensionBefore: number;
    readonly militaryThreatBefore: number;
    readonly tensionAdded: number;
    readonly militaryThreatAdded: number;
};
/** A bilateral hazard, kept separately from a government's deliberate border-clash decision. */
export type BorderIncident = {
    readonly id: string;
    readonly parties: readonly [NationId, NationId];
    readonly openedTurn: number;
    readonly revision: number;
    /** Exact increment each directed edge received after clamping, in parties order. */
    readonly pressure: readonly [IncidentPressure, IncidentPressure];
    readonly causedBy?: CausalId;
    readonly assessment?: {
        readonly turn: number;
        readonly finding: "likely-inadvertent" | "undetermined";
        readonly confidence: "low" | "moderate";
        readonly evidence: readonly string[];
    };
};
export type BorderIncidentEffect = {
    readonly kind: "borderIncident";
    readonly incident: BorderIncident;
    readonly expectedRevision: number | null;
};
export declare function applyBorderIncident(campaign: Campaign, effect: BorderIncidentEffect): Campaign;
export declare const borderIncidentPairKey: (a: NationId, b: NationId) => string;
/** One independent hazard draw per real, unsettled border; a deliberate clash is decided elsewhere. */
export declare function borderIncidentPackets(campaign: Campaign, streams: RngStreams): readonly EffectPacket[];
/** Evidence is gathered after the incident, not inferred from a government's general intent score. */
export declare function borderIncidentAssessmentPackets(campaign: Campaign, streams: RngStreams): readonly EffectPacket[];
export {};
