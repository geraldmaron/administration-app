import type { ActingAuthority, AppointmentClass, OfficeDef, RemovalConstraint } from "@admin/engine";
export type StaffingChip = {
    readonly key: "appointment" | "removal" | "acting";
    /** The chip's own word, short enough to sit in a row of three. */
    readonly label: string;
    /** What that word means, spoken — the chip label alone is a term of art. */
    readonly spoken: string;
};
export declare const APPOINTMENT_LABEL: Readonly<Record<AppointmentClass, string>>;
export declare const APPOINTMENT_MEANING: Readonly<Record<AppointmentClass, string>>;
export declare const REMOVAL_LABEL: Readonly<Record<RemovalConstraint, string>>;
/**
 * Exported because the cabinet roster prints the same facts on its own rows,
 * and one office described two ways in one room is worse than either wording.
 */
export declare const ACTING_LABEL: Readonly<Record<ActingAuthority, string>>;
export declare const ACTING_MEANING: Readonly<Record<ActingAuthority, string>>;
export type StaffingChipOptions = {
    /**
     * In a single office file the ordinary rule matters, because it explains the
     * removal lever in that same file. In a branch-wide list it is filler:
     * fifteen "At will" chips in a column bury the exceptional offices the
     * player actually needs to notice.
     */
    readonly showOrdinaryRemoval?: boolean;
};
/**
 * The three staffing facts an office wears, in stable order. Callers may hide
 * the ordinary at-will removal fact in bulk views, but the exceptions stay in
 * the same slot and the office file can still state the complete rule.
 */
export declare function staffingChips(office: OfficeDef, { showOrdinaryRemoval }?: StaffingChipOptions): readonly StaffingChip[];
