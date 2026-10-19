import { type Campaign } from "@admin/engine";
import { type PolarizationReading } from "../record/polarization-reading";
import { type ApprovalDrag, type DriverBar } from "./opinion-causes";
/** One of the six judgments, with how far the last seven days moved it. */
export type JudgmentReading = DriverBar & {
    readonly week: number;
    readonly weekText: string;
};
/**
 * Approval opened up: the six public judgments it is made of, each with its
 * level, heading, cause and the week's move; the one cause pulling it down
 * hardest; and how divided the country is, which damps every move.
 */
export type ApprovalBreakdown = {
    readonly approval: number;
    readonly judgments: readonly JudgmentReading[];
    readonly drag?: ApprovalDrag;
    readonly polarization: PolarizationReading;
};
export declare function approvalBreakdown(campaign: Campaign): ApprovalBreakdown;
