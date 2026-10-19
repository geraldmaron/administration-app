import { type OpinionDriver } from "./opinion-drivers.js";
import { type ApprovalMovement, type ApprovalPath } from "./opinion-movement.js";
import type { Campaign } from "./state.js";
type Gaps = Readonly<Record<ApprovalPath, Readonly<Record<OpinionDriver, number>>>>;
export type ApprovalAttribution = {
    /** Target movement each road is owed and the mood has not yet caught up to. */
    readonly gaps: Gaps;
    /** Weighted movement credited so far, by judgment. */
    readonly byDriver: Readonly<Record<OpinionDriver, number>>;
    /** Weighted movement credited so far, by road. */
    readonly byPath: Readonly<Record<ApprovalPath, number>>;
};
/** Whatever the opening left between the mood and its targets is the world's to close. */
export declare function openAttribution(campaign: Campaign): ApprovalAttribution;
/** The state one phase planned against, as the harness observed it. */
export type PhaseStart = {
    readonly id: string;
    readonly state: Campaign;
};
/**
 * One week of a harness campaign: `start` before the President acted,
 * `decided` after their acts and appointments, then each phase of the turn from
 * the state it planned against to the next one's, and `end` after the turn
 * ran. Each stretch's target movement is charged to its road before the mood
 * movement it wrote is credited, so the revision late in the turn pays out
 * against everything the week moved before it.
 */
export declare function attributeWeek(ledger: ApprovalAttribution, start: Campaign, decided: Campaign, phases: readonly PhaseStart[], end: Campaign): ApprovalAttribution;
/** The credited movement as shares, in the shape the harness reports. */
export declare function attributedMovement(ledger: ApprovalAttribution): ApprovalMovement;
export {};
