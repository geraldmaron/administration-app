import { type Campaign, type CaseDispositionAnswer, type GameDate } from "@admin/engine";
import { type CaseRowViewModel } from "./case-rows";
import { type FamilyDispositionKind, type FamilyEntry } from "./family-cases";
import type { CaseContext } from "./family-raise";
/** The dispositions this compact view commits without a picker: "act" is the door, "delegate" needs a chosen body. */
export declare const CASE_TRAY_DISPOSITIONS: readonly FamilyDispositionKind[];
export type CaseDetailOption = {
    readonly kind: FamilyDispositionKind;
    readonly label: string;
};
export type CaseDetailViewModel = CaseRowViewModel & {
    readonly clockKind: "none" | "statutory" | "operational" | "deteriorating" | "opportunity";
    readonly reason: string;
    readonly options: readonly CaseDetailOption[];
    /** The day the case's clock runs out, where it has one. */
    readonly dueDate?: GameDate;
    /** The day a put-off holds it to, while one does. */
    readonly heldUntil?: GameDate;
    /** States a Guard federalization ask belongs to this emergency in. */
    readonly guardStates: readonly string[];
    /** The standing matter the case is about, with the door to its own record. */
    readonly context?: CaseContext;
};
/**
 * The case to open first: one that holds the week, then the nearest clock,
 * then the oldest standing matter. A case already put off waits behind the rest.
 */
export declare function leadCase(campaign: Campaign): FamilyEntry | undefined;
export declare function caseDetail(campaign: Campaign, entry: FamilyEntry): CaseDetailViewModel;
/** Every queue entry after the lead, read whole, so each row carries its own put-off. */
export declare function caseDetails(campaign: Campaign): readonly CaseDetailViewModel[];
/**
 * Commits one of the tray's generic dispositions against a live case. A
 * put-off is the Desk's own put-off, which writes the attention record the
 * engine stops on and the case together; the rest go through the case.
 */
export declare function commitCaseDisposition(campaign: Campaign, id: string, kind: FamilyDispositionKind): CaseDispositionAnswer;
