import { type Campaign, type CollectionFocus, type Discipline, type EffectPacket, type IcElementDef, type IcElementId, type IntelSubject, type TaskingTargetKind } from "@admin/engine";
import { type ChoiceTable } from "../policy/choice-table.js";
export declare const TARGET_KINDS: readonly {
    readonly id: TaskingTargetKind;
    readonly label: string;
    readonly detail: string;
}[];
export declare const disciplineWords: (discipline: Discipline) => string;
export type TaskingRow = {
    readonly id: string;
    readonly element: string;
    readonly elementName: string;
    readonly discipline: string;
    readonly kind: string;
    readonly target: string;
    /** The government or state file the tasking is aimed at, where it has one. */
    readonly href?: string;
    readonly question: string;
    readonly focus?: string;
    readonly note?: string;
    readonly closedReason?: string;
    readonly opened: string;
    /** Whole weeks the tasking has stood. */
    readonly weeks: number;
    readonly product?: {
        readonly summary: string;
        readonly filed: string;
        readonly status?: "findings" | "no-result";
        readonly confidence?: "low" | "moderate" | "high";
    };
};
export type CollectionReading = {
    readonly taskings: readonly TaskingRow[];
    /** Requests the community has declined, kept forever. */
    readonly declined: number;
    /** Matters an inspector general has open about a declined request. */
    readonly referred: number;
};
export declare function collectionReading(campaign: Campaign): CollectionReading;
/** Every element of the community, with the disciplines it runs. */
export declare function collectionElements(): readonly IcElementDef[];
export type TaskingDraft = {
    readonly element: IcElementId;
    readonly discipline: Discipline;
    readonly kind: TaskingTargetKind;
    readonly target: string;
    readonly question: string;
    readonly focus?: CollectionFocus;
    readonly note?: string;
    readonly subject?: IntelSubject;
};
export declare function collectionScopeWords(draft: Pick<TaskingDraft, "discipline" | "kind" | "focus">): string;
/** Whether the request would be declined: the engine files it and the community says no. */
export declare function taskingRefusal(draft: TaskingDraft): string | undefined;
/** Pointing an element at a question, read as what it starts. */
export declare function taskChoices(campaign: Campaign, draft: TaskingDraft): ChoiceTable | undefined;
export declare function taskOrder(campaign: Campaign, draft: TaskingDraft): EffectPacket;
/** Taking an element off a question, read as what it stops. */
export declare function closeTaskingChoices(campaign: Campaign, id: string): ChoiceTable | undefined;
export declare function closeTaskingOrder(campaign: Campaign, id: string): EffectPacket;
export type PersonLeadRow = {
    readonly caseId: string;
    readonly name: string;
    readonly headline: string;
    readonly href: string;
    readonly subject: IntelSubject;
    /** A foreign person can be tasked; a person in the United States can only be referred. */
    readonly pathway: "task" | "refer";
    readonly referred: boolean;
};
/** The only people the desk may name: those an open case already binds to a person on record. */
export declare function personLeadRows(campaign: Campaign): readonly PersonLeadRow[];
/** Referring a matter to the Attorney General, read as what it starts. */
export declare function referChoices(campaign: Campaign, subject: IntelSubject): ChoiceTable;
export declare function referOrder(campaign: Campaign, subject: IntelSubject): EffectPacket;
