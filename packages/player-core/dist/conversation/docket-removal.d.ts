import type { Campaign, EffectPacket } from "@admin/engine";
/** The packet plus a background removal for every held entry its flags answer. */
export declare function withHeldRemoval(campaign: Campaign, packet: EffectPacket): EffectPacket;
