import type { HandbookChapter } from "../glossary/handbook.js";
import type { Authority } from "./types.js";
export type LawSection = {
    readonly id: string;
    readonly title: string;
    /** What the section is about, in a sentence or two. */
    readonly summary: string;
    /** Registry ids, in reading order. Every record belongs to exactly one section. */
    readonly authorities: readonly string[];
};
export type LawChapter = HandbookChapter & {
    readonly sections: readonly LawSection[];
};
export declare const LAW_SECTIONS: readonly LawSection[];
export declare const LAW_CHAPTER: LawChapter;
/** A section's records, in reading order. */
export declare function lawSectionAuthorities(section: LawSection): readonly Authority[];
/** The section that teaches an authority, so a citation's card can offer "Read the chapter". */
export declare function lawSectionFor(authorityId: string): LawSection | undefined;
/** Records no section places; the tests hold this empty. */
export declare function unplacedAuthorities(): readonly Authority[];
