import { type EffectPacket } from "./effects.js";
import { ImpactSpec, type ImpactEvent, type ImpactEventEffect, type ImpactReport, type ImpactResponse } from "./impact-event.js";
import type { Campaign } from "./state.js";
/** Optimistic revision check makes repeated/stale packets harmless to population. */
export declare function applyImpactEvent(campaign: Campaign, effect: ImpactEventEffect): Campaign;
export declare function impactResponseFor(campaign: Campaign, event: ImpactEvent): ImpactResponse;
export declare function impactReportSummary(event: ImpactEvent, report: ImpactReport, place?: string): string;
/** One batched packet per calendar day, with each event retaining its own reports. */
export declare function advanceImpactEvents(campaign: Campaign): Campaign;
/** Existing condition macro costs remain authoritative; only independent incidents add pressure. */
export declare function independentImpactPressure(campaign: Campaign, nation: string): number;
/** Explicit producer API for authored accidents and infrastructure failures. */
export declare function issueImpactIncident(campaign: Campaign, spec: ImpactSpec): EffectPacket;
