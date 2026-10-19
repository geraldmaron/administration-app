import { type Campaign } from "./state.js";
import type { EffectPacket } from "./effects.js";
import type { RngStreams } from "./rng.js";
/** Relief after a disaster abroad: the week or two after onset, from the governments closest to the stricken one. */
export declare function aidPackets(campaign: Campaign, streams: RngStreams): readonly EffectPacket[];
/**
 * How far below the line it would take to fight a government can sit and still
 * send aid. A government whose weighing clears the line joins the war; one that
 * falls short by less than this is committed enough to arm a side and not
 * enough to fight beside it. Planning value.
 */
export declare const AID_BAND = 0.35;
/** The record a donor's war aid leaves on its edge toward the side it armed, which is also how often it can send more. */
export declare const WAR_AID_KIND = "war-aid";
/** Aid into the week's wars from the governments that weighed joining and fell just short. */
export declare function warAidPackets(campaign: Campaign, streams: RngStreams): readonly EffectPacket[];
