import type { NationId } from "@admin/world";
import type { RngStream } from "./rng.js";
import type { Effect } from "./effects.js";
import type { RelationshipScalars } from "./effects.js";
import { type Campaign, type FlagId } from "./state.js";
import type { MetricDeltas } from "./effect-types.js";
import type { InstrumentId, RungLevel } from "./instruments.js";
export type ConsequenceValence = "success" | "partial" | "failure";
export type RungBand = "low" | "mid" | "high";
export declare function rungBand(rung: RungLevel): RungBand;
export type ConsequenceParties = {
    readonly actor: string;
    readonly target: string;
};
export type ConsequenceConditions = {
    readonly scenarioClass?: readonly string[];
    readonly tone?: readonly string[];
    readonly flagsSet?: readonly FlagId[];
    readonly flagsClear?: readonly FlagId[];
    readonly minTension?: number;
    readonly maxTrust?: number;
    readonly intelFalse?: boolean;
};
export type ConsequenceRecipe = {
    readonly kind: "metric";
    readonly deltas: MetricDeltas;
    readonly scaleBySeverity?: boolean;
} | {
    readonly kind: "relationship";
    readonly direction: "actor-to-target" | "target-to-actor";
    readonly deltas: Partial<RelationshipScalars>;
} | {
    readonly kind: "grudge";
    readonly cause: string;
    readonly weight: number;
} | {
    readonly kind: "feed";
    readonly headline: string;
};
export type ConsequenceCard = {
    readonly id: string;
    readonly instrument: InstrumentId;
    readonly rungBands: readonly RungBand[];
    readonly valence: ConsequenceValence;
    readonly riskAffinity?: readonly string[];
    readonly conditions?: ConsequenceConditions;
    readonly weight: number;
    readonly once?: boolean;
    readonly beats: readonly string[];
    readonly effects: readonly ConsequenceRecipe[];
    readonly sets?: readonly FlagId[];
    readonly remembered?: string;
};
export type ConsequenceContext = {
    readonly scenarioClass?: string;
    readonly tone?: string;
    readonly intelFalse?: boolean;
};
export type ConsequenceSituation = {
    readonly actor: NationId;
    readonly target: NationId;
    readonly instrument: InstrumentId;
    readonly rung: RungLevel;
    readonly valence: ConsequenceValence;
    readonly riskId?: string;
    readonly context?: ConsequenceContext;
};
export type ConsequenceScene = {
    readonly severity: number;
    readonly visible: boolean;
    readonly parties: ConsequenceParties;
};
export type ConsequenceContribution = {
    readonly effects: readonly Effect[];
    readonly metricDeltas: MetricDeltas;
    readonly beats: readonly string[];
};
export declare function consequenceFlag(id: string): FlagId;
export declare function renderBeat(text: string, parties: ConsequenceParties): string;
export declare function eligibleConsequences(campaign: Campaign, pool: readonly ConsequenceCard[], situation: ConsequenceSituation): readonly ConsequenceCard[];
export declare function drawConsequence(campaign: Campaign, pool: readonly ConsequenceCard[], situation: ConsequenceSituation, stream: RngStream): ConsequenceCard | undefined;
export declare function consequenceContribution(campaign: Campaign, card: ConsequenceCard, situation: ConsequenceSituation, scene: ConsequenceScene): ConsequenceContribution;
