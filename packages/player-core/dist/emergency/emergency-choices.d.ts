import { type Campaign, type EmergencyScope } from "@admin/engine";
import type { StateId } from "@admin/world";
import { type ChoiceTable } from "../policy/choice-table";
/** The id a declaration column carries: its scope. */
export declare function scopeChoiceId(scope: EmergencyScope): string;
/** The scope a column id names, or undefined for the baseline or a malformed id. */
export declare function scopeOfChoice(id: string): EmergencyScope | undefined;
/** Declaring over one running condition, at each scope it could take. */
export declare function declarationChoices(campaign: Campaign, conditionId: string): ChoiceTable | undefined;
/** Ending a declaration; kept, it goes on costing standing every week, which is the waiting line. */
export declare function endChoices(campaign: Campaign, id: string): ChoiceTable | undefined;
/** Continuing a declaration for a year; unrenewed, it lapses on its date, which is the waiting line. */
export declare function renewChoices(campaign: Campaign, id: string): ChoiceTable | undefined;
/** Asking a state's governor to coordinate support. */
export declare function guardChoices(campaign: Campaign, state: StateId): ChoiceTable | undefined;
/** Weeks, for a declaration's clock line. */
export declare function lapseWords(weeks: number): string;
