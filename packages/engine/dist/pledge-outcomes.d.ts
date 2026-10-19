import { type Campaign } from "./state.js";
export type HeldOutcome = {
    /** Whether the result is true of the campaign now, measured from the oath. */
    readonly met: (campaign: Campaign) => boolean;
    /** The result, finished by "on the due date" in the terms a player reads. */
    readonly keptWhen: string;
    /** What the due date found instead, completing "…passed and". */
    readonly missed: string;
};
/** What a held program's pledge promised, or nothing for a program no plank holds. */
export declare function heldOutcome(stance: string): HeldOutcome | undefined;
