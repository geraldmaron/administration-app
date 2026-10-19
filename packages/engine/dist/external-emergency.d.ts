import type { NationId } from "@admin/world";
import type { EffectPacket } from "./effects.js";
import type { Campaign, Pursuit } from "./state.js";
import type { ExternalThreatEmergency } from "./state-emergency.js";
/** A new finding expires after a year rather than becoming a permanent sanctions key. */
export declare const EXTERNAL_EMERGENCY_TURNS = 52;
export declare function findingForThreat(pursuit: Pursuit): ExternalThreatEmergency["finding"] | undefined;
/** The finding must point to a recent, public campaign against the United States. */
export declare function eligibleExternalThreats(campaign: Campaign): readonly Pursuit[];
export declare function activeExternalEmergency(campaign: Campaign, target: NationId): ExternalThreatEmergency | undefined;
export type ExternalDeclarationResult = {
    readonly ok: true;
    readonly packet: EffectPacket;
    readonly record: ExternalThreatEmergency;
} | {
    readonly ok: false;
    readonly reason: string;
};
/** The President's dated IEEPA finding names both a foreign actor and the observed act. */
export declare function declareExternalEmergency(campaign: Campaign, pursuitId: string, finding: ExternalThreatEmergency["finding"]): ExternalDeclarationResult;
