import type { Article } from "../article.js";
import type { FeedItem } from "../state.js";
export type DefectClass = "a-bare-figure" | "b-extent" | "c-sourcing" | "d-contradiction" | "e-mood" | "f-slot" | "h-us-watching";
export type Defect = {
    readonly kind: DefectClass;
    readonly rule: string;
    readonly text: string;
};
export type DefectContext = {
    readonly item: FeedItem;
    readonly playerNation?: string;
    /** Population of the nation the item is filed against, when it is a nation. */
    readonly targetPopulation?: number;
};
export declare const MOOD_PHRASES: readonly string[];
/** Every defect in one composed article, read against the item it was composed from. */
export declare function articleDefects(article: Article, context: DefectContext): readonly Defect[];
/** A sentence with its names and numbers blanked, so two fills of one bank line read as one line. */
export declare function sentenceShape(sentence: string, names: readonly string[]): string;
/**
 * Sentences that recur across distinct stories often enough to read as a tell:
 * the shape and how many stories carried it, most frequent first.
 */
export declare function repeatedSentences(articles: readonly Article[], names: readonly string[], minShare: number): readonly {
    readonly shape: string;
    readonly stories: number;
}[];
