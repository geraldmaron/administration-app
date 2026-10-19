import type { NationId } from "@admin/world";
import type { GameDate, MetricSet, StateApprovalSample } from "./state-campaign.js";
export type WeekOpening = {
    readonly metrics: MetricSet;
    readonly pressure: number;
    readonly polarization: number;
    /** Absent on a week an older build opened; that week's state row is not recorded. */
    readonly stateApproval?: StateApprovalSample;
};
/** Counted from the oath. Day 7 is the closing day, not a calendar weekday. */
export type OfficeDay = 1 | 2 | 3 | 4 | 5 | 6 | 7;
/**
 * One document the desk is holding.
 *
 * Absent on the campaign means the desk still stages the old way. The first
 * clock day creates the list. An answer or the close removes an entry; putting
 * it off does not.
 */
export type DocketEntry = {
    readonly id: string;
    readonly ref: {
        readonly scenario: string;
        readonly counterpart?: NationId;
    };
    readonly arrives: GameDate;
    readonly closes: GameDate;
};
