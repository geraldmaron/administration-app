import { type Campaign, type EffectPacket } from "@admin/engine";
import type { ForceAssetId, NationId } from "@admin/world";
import { type ActConfig, type ActOption } from "./catalogue";
export type BuiltLine = {
    readonly label: string;
    readonly value: string;
    /** Set when the line is a count of a force asset, so a receipt can draw its glyph and unit. */
    readonly unitType?: ForceAssetId;
};
export type ActBuild = {
    readonly ok: true;
    readonly packet: EffectPacket;
    /** The receipt's headline, in the past tense. */
    readonly title: string;
    readonly lines: readonly BuiltLine[];
    /** Set when the act went through and the answer was no. */
    readonly outcome?: "refused";
    /** Money the packet takes out of budget authority, in USD millions; zero for an act that is free or brings money in. */
    readonly charged: number;
} | {
    readonly ok: false;
    readonly reason: string;
};
/** What a packet takes out of budget authority, as a positive figure. */
export declare function chargedBy(packet: EffectPacket): number;
/** The packet for a chosen act, or the engine's own refusal in its words. */
export declare function buildAct(campaign: Campaign, nation: NationId, option: ActOption, config: ActConfig): ActBuild;
/** Recall a pending operation before it executes. */
export declare function buildStandDown(campaign: Campaign, id: string): ActBuild;
/** Lift a measure the administration imposed. */
export declare function buildLift(campaign: Campaign, id: string): ActBuild;
