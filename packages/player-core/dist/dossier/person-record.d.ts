import { type Campaign } from "@admin/engine";
export type OfficeRecordKind = "bench" | "floor" | "governor" | "leader";
export type OfficeRecordRow = {
    readonly key: string;
    /** The case or bill, as a door. */
    readonly href: string;
    readonly title: string;
    /** The date, and the forum or question when more than one kind of vote is listed. */
    readonly detail: string;
    /** What the body decided: the holding, or the count and whether it carried. */
    readonly outcome: string;
    /** How this person voted or answered, in the word the record uses. */
    readonly cast: string;
    /** The vote or answer as a fact the screen can mark without judging it. */
    readonly castKey: "yea" | "nay" | "strike" | "uphold" | "agreed" | "declined" | "acted";
    /** Whether they stood with the majority of their court or party, or whom an act was aimed at, in words. */
    readonly standing: string;
};
export type OfficeRecordFact = {
    readonly label: string;
    readonly value: string;
    readonly href?: string;
};
export type PersonRecord = {
    readonly kind: OfficeRecordKind;
    readonly title: string;
    readonly note?: string;
    /** Column heads for the matter, the outcome, the vote and the standing. */
    /** Column heads; a record leaves out the columns its rows do not carry. */
    readonly columns: {
        readonly matter: string;
        readonly outcome?: string;
        readonly cast?: string;
        readonly standing?: string;
    };
    readonly rows: readonly OfficeRecordRow[];
    readonly facts: readonly OfficeRecordFact[];
    /** Said plainly when there are no rows yet, including when the record will fill. */
    readonly empty: string;
};
/** What this person has done in office, from the engine's stored decisions; undefined where there is nothing role-specific to show. */
export declare function personRecord(campaign: Campaign, personId: string): PersonRecord | undefined;
