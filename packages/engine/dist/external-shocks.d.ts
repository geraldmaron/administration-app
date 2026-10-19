import type { NationId } from "@admin/world";
import type { Campaign } from "./state.js";
export type ExternalShockKind = "grant" | "sabotage" | "jobs" | "default";
export type ExternalShock = {
    readonly nation: NationId;
    readonly kind: ExternalShockKind;
    /** Annual shift in the growth target, as a fraction. */
    readonly growth: number;
    /** Shift in the unemployment target, as a fraction of the labor force. */
    readonly unemployment: number;
    readonly fromTurn: number;
    readonly weeks: number;
};
/** Half a year: how long a grant's program, a sabotaged plant or a hiring round shapes the year's direction. */
export declare const EXTERNAL_SHOCK_WEEKS = 26;
/**
 * The most shocks the campaign keeps. Shocks landing on the same country, of
 * the same kind, in the same week are one entry, so this is room for every
 * country a busy half-year touches, and the oldest go first past it.
 */
export declare const EXTERNAL_SHOCK_RING = 128;
/** The most a grant can add to a growth target: a development program, not a boom. */
export declare const GRANT_GROWTH_CAP = 0.02;
export type ExternalShockEffect = {
    readonly kind: "externalShock";
    readonly shock: ExternalShock;
};
/** The ring with one more shock in it: merged into its week's entry, expired ones dropped, the oldest past the bound gone. */
export declare function withShock(shocks: readonly ExternalShock[], shock: ExternalShock, turn: number): readonly ExternalShock[];
export declare function applyExternalShock(state: Campaign, effect: ExternalShockEffect): Campaign;
/** A shock dated this week, as the effect that records it. */
export declare function shockEffect(campaign: Campaign, nation: NationId, kind: ExternalShockKind, shift: {
    readonly growth?: number;
    readonly unemployment?: number;
}): ExternalShockEffect;
/** What the shocks still standing do to one country's targets this week. */
export declare function shockPressure(campaign: Campaign, nation: NationId): {
    readonly growth: number;
    readonly unemployment: number;
};
