import { type Campaign, type CaseKind, type PresidentialCase } from "@admin/engine";
import type { MetricStance } from "../format/figures";
import type { FamilyEntry } from "./family-cases";
export type CaseRowStance = MetricStance;
export type CaseRowClock = {
    readonly urgency: "due" | "closing" | "standing";
    readonly dueLabel: string;
    readonly daysRemaining?: number;
    readonly windowDays?: number;
};
export type CaseRowViewModel = {
    readonly id: string;
    readonly title: string;
    readonly subject: string;
    /** The family, so a surface can draw its mark without parsing the label. */
    readonly kind: CaseKind;
    readonly kindLabel: string;
    readonly statusLabel: string;
    readonly stance: CaseRowStance;
    readonly ageDays: number;
    readonly delegable: boolean;
    readonly clock?: CaseRowClock;
    /** The family's own document, where its act is taken. */
    readonly href?: string;
    readonly doorLabel?: string;
};
/** One case, as the row the queue draws — the same shape whatever family raised it. */
export declare function caseRowViewModel(campaign: Campaign, matter: PresidentialCase): CaseRowViewModel;
/** One queue entry, with the door to the family's own document. */
export declare function familyRowViewModel(campaign: Campaign, entry: FamilyEntry): CaseRowViewModel;
