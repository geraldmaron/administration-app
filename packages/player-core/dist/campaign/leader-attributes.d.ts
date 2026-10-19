import { type LeaderDraft } from "@admin/engine";
import type { LeaderAttributes, LeaderBackground, LeaderRoute } from "@admin/world";
export type LeaderReading = {
    readonly key: keyof LeaderAttributes;
    readonly label: string;
    /**
     * Whether a rise in this reading is good news. Ambition carries no verdict
     * anywhere else in the app and carries none here — a hungry President is a
     * description, not a failing, and painting a rise in it green would say
     * otherwise.
     */
    readonly judged: boolean;
};
export declare const LEADER_READINGS: readonly LeaderReading[];
/**
 * The person a given career and route would produce from this draft.
 *
 * The age is pulled into the career's own plausible window first, because that
 * is exactly what choosing the career would do: the seal refuses an age outside
 * it. Without that, a card for a career whose window starts at 48 would price
 * itself at an age nobody can hold it at, and the figures on the card would not
 * be the figures the player got by pressing it.
 */
export declare function attributesUnder(draft: Pick<LeaderDraft, "age" | "ideology">, background: LeaderBackground, route: LeaderRoute): LeaderAttributes;
