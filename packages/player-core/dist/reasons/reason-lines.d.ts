import { type Campaign, type DecisionStamp } from "@admin/engine";
/** One reason, already a sentence, with the term it came from kept for ordering and tests. */
export type ReasonLine = {
    readonly key: string;
    readonly text: string;
};
/**
 * The reasons behind one stamped decision, heaviest first: each term that
 * pulled the way the decision went reads "Because of", and each that pulled
 * against it reads "Despite". Empty where the fog or the record forbids a
 * reason at all.
 */
export declare function reasonLines(stamp: DecisionStamp, campaign: Campaign): readonly ReasonLine[];
