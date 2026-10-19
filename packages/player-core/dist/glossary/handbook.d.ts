import type { PlaceKey } from "../navigation/places.js";
export type HandbookChapter = {
    readonly id: string;
    readonly title: string;
    /** What the player can do after reading, said as abilities. */
    readonly opens: string;
    /** The screens the chapter describes, offered as doors at its end. */
    readonly places: readonly PlaceKey[];
    /** Explainer ids, in reading order. Every explainer belongs to exactly one chapter. */
    readonly explainers: readonly string[];
    /** Glossary ids the chapter teaches beyond those its explainers already name. */
    readonly terms?: readonly string[];
};
export declare const HANDBOOK_INTRO = "Welcome. This Handbook walks you through how the game works, roughly in the order you'll need it. Each chapter ends with links to the screens where you put it to use. If you'd rather look up a single word, every term in the game is also listed from A to Z.";
export declare const HANDBOOK: readonly HandbookChapter[];
export declare function handbookChapter(id: string): HandbookChapter | undefined;
/** The chapter that teaches an explainer, so screen help can offer "Read the chapter". */
export declare function chapterForExplainer(explainerId: string): HandbookChapter | undefined;
