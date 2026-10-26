import { type NationId, type OrgId } from "@admin/world";
import { type Campaign } from "./state.js";
import type { EffectPacket } from "./effects.js";
import type { RngStreams } from "./rng.js";
/** Bodies meet about quarterly; an application or a notice is heard at a meeting, not any week. */
export declare const SUMMIT_EVERY_WEEKS = 13;
/** The notice a member has standing to leave a body, read off the ledger: the turn it was given, unless it was since taken back or spent by the departure it announced. */
export declare function standingNotice(campaign: Campaign, member: NationId, org: OrgId): number | undefined;
export declare function rosterPackets(campaign: Campaign, streams: RngStreams): readonly EffectPacket[];
