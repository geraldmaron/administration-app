import { type Campaign } from "@admin/engine";
import { type MetricStance } from "../format/figures";
import type { Seat } from "./roster-row";
/**
 * West Wing assembly: vacant chairs and a confirmation that would fail.
 * A seated cabinet stays off the Needs you list.
 */
export type CabinetNeed = {
    readonly id: string;
    readonly role: string;
    readonly title: string;
    readonly reason: string;
    readonly stance: MetricStance;
    readonly figure: string;
};
/**
 * A delivery multiplier as a bare signed share, for a row that has already
 * named the fact in its own label.
 *
 * One unit. A row that printed a share beside the raw multiplier said the same
 * thing twice, once as a percentage the player can read and once as a figure
 * centered on 1.00 that they cannot, so the row had two figures and no reading.
 * The multiplier stays where its scale is actually explained (the policy
 * surface, which draws the caretaker floor and the ceiling around it); a
 * roster row gets the share.
 */
export declare function deliveryShare(quality: number): string;
/** Vacant chairs, with a failing confirmation ranked ahead of a quiet vacancy. */
export declare function cabinetNeeds(campaign: Campaign, seats: readonly Seat[], titles: Readonly<Record<string, string>> | undefined): readonly CabinetNeed[];
