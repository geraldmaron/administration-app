import type { Nation } from "@admin/world";
import { type Campaign } from "./state.js";
import type { EffectContribution, ResolutionRequest, Ripple } from "./resolution.js";
export declare function projectRipples(campaign: Campaign, request: ResolutionRequest, target: Nation, severity: number, actorName: string): readonly Ripple[];
export declare function rippleContribution(campaign: Campaign, request: ResolutionRequest, ripples: readonly Ripple[]): EffectContribution;
