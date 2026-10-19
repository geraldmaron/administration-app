export type UsHullRow = {
    readonly unitType: string;
    readonly hull: string;
    /** As the register prints it: capitals, no punctuation. */
    readonly name: string;
    readonly hullClass: string;
    readonly source: string;
    readonly opened: string;
};
export declare const US_HULLS: readonly UsHullRow[];
