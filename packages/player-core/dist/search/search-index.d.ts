import type { GlossaryEntry } from "../glossary/types";
/** The things in a campaign that have a screen of their own, each a kind search groups its results under. */
export type EntityKind = "person" | "office" | "member" | "judge" | "state" | "country" | "bill" | "case" | "war" | "treaty" | "org" | "command" | "order";
/** What to draw at the head of a result: a flag for a government, the person's initials, else the kind's glyph. */
export type SearchVisual = {
    readonly kind: "flag";
    readonly nation: string;
} | {
    readonly kind: "person";
    readonly name: string;
};
export type SearchEntry = {
    readonly kind: "place";
    readonly id: string;
    readonly title: string;
    readonly detail: string;
    readonly icon: string;
    readonly href: string;
    readonly keywords: readonly string[];
} | {
    readonly kind: EntityKind | "verb";
    readonly id: string;
    readonly title: string;
    readonly detail: string;
    readonly icon: string;
    readonly href: string;
    readonly keywords: readonly string[];
    readonly visual?: SearchVisual;
} | {
    readonly kind: "term";
    readonly id: string;
    readonly title: string;
    readonly detail: string;
    readonly icon?: string;
    readonly entry: GlossaryEntry;
};
/** The entries that open a screen: every kind but a glossary term, which opens its definition. */
export type LinkEntry = Exclude<SearchEntry, {
    readonly kind: "term";
}>;
export declare const isLinkEntry: (entry: SearchEntry) => entry is LinkEntry;
/** Groups in the order results list them, with the words a result group is headed by. */
export declare const SEARCH_GROUPS: readonly {
    readonly kind: SearchEntry["kind"];
    readonly label: string;
}[];
/** Every place a player can stand today: the ones whose route exists. */
export declare function placeEntries(routeExists: (href: string) => boolean): readonly SearchEntry[];
/** Each Handbook chapter as a place, so search can open the chapter that explains a subject. */
export declare function chapterEntries(routeExists: (href: string) => boolean): readonly SearchEntry[];
/** The verbs whose screen exists. */
export declare function verbEntries(routeExists: (href: string) => boolean): readonly SearchEntry[];
export declare function termEntries(glossary: readonly GlossaryEntry[]): readonly SearchEntry[];
/** The entries for a query, best first; at one score, places come before people and bodies, and those before terms. */
export declare function search(entries: readonly SearchEntry[], raw: string): readonly SearchEntry[];
/** Results gathered under their kind's heading, groups in the fixed order and rows in rank order. */
export declare function groupResults(results: readonly SearchEntry[]): readonly {
    readonly kind: SearchEntry["kind"];
    readonly label: string;
    readonly entries: readonly SearchEntry[];
}[];
