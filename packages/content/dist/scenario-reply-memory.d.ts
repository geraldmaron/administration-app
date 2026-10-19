import { type Campaign, type EffectPacket } from "@admin/engine";
import type { CastScenario } from "./scenario-cast.js";
/**
 * Stamp what a committed reply means onto the campaign: the fired flag that
 * `once` gates on, the closed desk, whatever the reply says this answer made
 * the player — and, for answers big enough to make news, the headline.
 */
export declare function rememberReply(campaign: Campaign, packet: EffectPacket, cast: CastScenario, replyId: string): EffectPacket;
