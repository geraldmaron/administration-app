import { type ReactNode } from "react";
export type ReceiptLine = {
    readonly label: string;
    readonly value: ReactNode;
};
/** How the act came out: done as asked, or refused by whoever had the last word (Congress, a governor). */
export type ReceiptOutcome = "done" | "refused";
export type ReceiptProps = {
    /** What was done, as a past-tense sentence: "Sworn in as President". */
    readonly title: string;
    /** When, in the game's calendar. */
    readonly date: string;
    readonly lines: readonly ReceiptLine[];
    /** Absent, the act was done. A refused act is still on the Record, so it still gets a receipt, without the check. */
    readonly outcome?: ReceiptOutcome;
    /** Where it is written down: the Record entry, or why it is not. */
    readonly record?: ReactNode;
    /** Doors onward. */
    readonly children?: ReactNode;
};
/** The proof an act happened: what, when, what it set, and where it is recorded. */
export declare function Receipt({ title, date, lines, outcome, record, children }: ReceiptProps): import("react").JSX.Element;
