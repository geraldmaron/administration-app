import { type IdeologyVector, type PersonTrait } from "@admin/world";
export declare const GOVERNING_STYLES: readonly ["pragmatic", "principled", "cautious", "hawkish", "dovish"];
export type GoverningStyle = (typeof GOVERNING_STYLES)[number];
export type LeadershipAnswers = {
    /**
     * 1: every answer one of three steps, -1, 0 or +1. 2: an answer may sit
     * anywhere between -1 and +1, because a placement on a scale, a split of
     * effort or a ranking says how far, not only which way.
     */
    readonly version: 1 | 2;
    /** Four answers per dimension: economics, authority, internationalism, force, compromise. */
    readonly values: readonly number[];
};
export declare function validLeadershipAnswers(answers: LeadershipAnswers): boolean;
export declare function scoreLeadershipAnswers(answers: LeadershipAnswers): {
    readonly ideology: IdeologyVector;
    readonly style: GoverningStyle;
    readonly force: number;
    readonly compromise: number;
};
/** The stated approach takes priority over a conflicting career stereotype. */
export declare function withGoverningStyle(traits: readonly PersonTrait[], style: GoverningStyle | undefined): readonly PersonTrait[];
