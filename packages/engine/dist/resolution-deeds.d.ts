import type { NationId } from "@admin/world";
import type { EffectContribution } from "./resolution.js";
import type { ActionCommitment, Campaign } from "./state.js";
export declare function deedContribution(campaign: Campaign, actor: NationId, commitment: ActionCommitment, observed: boolean): EffectContribution;
