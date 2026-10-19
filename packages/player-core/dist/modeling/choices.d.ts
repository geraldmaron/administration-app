import { type BudgetDraftInput, type Campaign, type ProjectionAlternative } from "@admin/engine";
import { type ModelingAct } from "./acts";
/** The id of the run with nothing approved; no screen lists it as an option. */
export declare const UNTOUCHED = "untouched";
/** One option of a screen's own list: its id and label there, and the act it commits. */
export type ModelingActAlternative = {
    readonly id: string;
    readonly label: string;
    readonly act?: ModelingAct;
    readonly refused?: string;
};
/** A decision or an order by id; a budget by the draft book as it stands on the editor. */
export type ModelingChoiceSpec = {
    readonly kind: "decision" | "order";
    readonly id: string;
} | {
    readonly kind: "budget-draft";
    readonly draft: BudgetDraftInput;
} | {
    readonly kind: "acts";
    readonly title: string;
    readonly against: string;
    readonly baselineMeaning: string;
    readonly alternatives: readonly ModelingActAlternative[];
};
/** The budget request's one option, as the request screen names it. */
export declare const BUDGET_SEND = "send";
export type ModelingAlternative = ProjectionAlternative & {
    readonly label: string;
    /** The run with nothing approved: every other alternative is measured against it, and no screen offers it. */
    readonly baseline: boolean;
};
export type ModelingChoice = {
    readonly spec: ModelingChoiceSpec;
    readonly title: string;
    /** What the world with nothing approved means for this kind of choice, in one sentence. */
    readonly baselineMeaning: string;
    /** That world as the object of a comparison: "higher than leaving it unanswered". */
    readonly against: string;
    readonly alternatives: readonly ModelingAlternative[];
};
/** One text per choice, so a hook can tell the same choice from a new one without comparing objects. Account order is fixed so equal drafts key alike. */
export declare function modelingChoiceKey(spec: ModelingChoiceSpec): string;
/** The choice and its alternatives, read on the campaign it would be committed on, or nothing when it is not pending. */
export declare function modelingChoice(campaign: Campaign, spec: ModelingChoiceSpec): ModelingChoice | undefined;
