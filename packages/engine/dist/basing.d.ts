import { type NationId, type ZoneId } from "@admin/world";
import type { Campaign, Commitment, NationRuntime } from "./state.js";
export type BaseProvenance = "sourced" | "planning value";
export type Base = {
    readonly country: NationId;
    /** A neutral label for the installation, never a real unit's designation. */
    readonly installation: string;
    readonly service: string;
    readonly personnelBand: string;
    /** The host's stationed total as a band, where the table has one. */
    readonly countryTotal?: string;
    readonly kind: "basing" | "deployment";
    /** A deployment the board sized itself is a planning value, and says so. */
    readonly provenance: BaseProvenance;
    readonly source: string;
    /** The sea or country a positioned deployment stands in, by name. */
    readonly theater?: string;
};
type Posture = {
    readonly country: string;
    readonly installation: string;
    readonly service: string;
    readonly personnelBand: string;
    readonly theater: ZoneId;
    readonly source: string;
};
/**
 * The two deployments the board sizes itself, both planning values. The Gulf
 * posture's direction is sourced (the largest buildup since 2003, three
 * carriers at its peak, still elevated with no stated drawdown in the week of
 * the table), and the table says the stationed totals undercount rotations;
 * no row gives a number, so the band here is the game's, set as an elevated
 * baseline well below the peak.
 */
export declare const BOARD_DEPLOYMENTS: readonly Posture[];
export declare function baseCommitmentId(kind: "basing" | "deployment", country: string, label: string): string;
/**
 * The commitments the board opens at the oath: every installation on the
 * basing table whose host is on the roster, and, where the board carries the
 * Gulf front, the two deployments sized as planning values.
 */
export declare function openingBaseCommitments(nations: Readonly<Record<string, NationRuntime>>, gulfFront: boolean): readonly Commitment[];
/**
 * The installations and positioned deployments US forces hold abroad, read
 * from the commitments still active, so a base the administration closes
 * leaves the reading the week it closes. Each carries its band and where the
 * band came from.
 */
export declare function selectBases(campaign: Campaign): readonly Base[];
export declare const BASING_LINES: {
    readonly stationed: (base: string) => string;
    readonly deployed: (label: string) => string;
};
export {};
