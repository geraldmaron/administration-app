import { type Article, type Campaign, type GameDate } from "@admin/engine";
import type { Stance } from "../reading.js";
import { type DeskFiling } from "./desks.js";
export type LandscapeDesk = {
    readonly id: string;
    readonly name: string;
    readonly format: string;
    readonly region?: string;
    /** How much of the country reads it, 0..1 of the widest desk on the roster. */
    readonly reach: number;
    /** How warmly it stands toward the administration, 0 hostile to 1 friendly. */
    readonly warmth: number;
    readonly stanceWord: string;
    readonly tone: Stance;
    readonly filings: readonly DeskFiling[];
};
/** Every desk, widest reach first, each placed on the two axes the landscape is drawn on. */
export declare function pressLandscape(campaign: Campaign): readonly LandscapeDesk[];
/** What kind of paper a feed item is: reporting by a masthead, a notice the administration itself issued, or an intelligence summary. */
export type DispatchGenre = "journalism" | "official" | "intelligence";
export declare const GENRE_LABEL: Readonly<Record<DispatchGenre, string>>;
export type WireRow = {
    /** Where the story sits in the campaign's feed, which is the dispatch's address. */
    readonly index: number;
    readonly headline: string;
    readonly date: GameDate;
    readonly when: string;
    readonly genre: DispatchGenre;
    readonly source: string;
};
/** Every item the term's desks, the administration and the intelligence community filed, newest first. */
export declare function wireRows(campaign: Campaign): readonly WireRow[];
export type DispatchLink = {
    readonly label: string;
    readonly href: string;
};
export type DispatchReading = {
    readonly index: number;
    readonly article: Article;
    readonly genre: DispatchGenre;
    readonly genreLabel: string;
    readonly source: string;
    readonly when: string;
    /** What the filing desk thought of the administration when it filed, as a word. */
    readonly stanceWord?: string;
    /** The governments the story names, each a door to its file. */
    readonly related: readonly DispatchLink[];
    /** Earlier stories about the same governments, newest first. */
    readonly earlier: readonly {
        readonly index: number;
        readonly headline: string;
        readonly when: string;
    }[];
};
/** One story opened whole, written by the desk that filed it, or nothing for an address the feed does not hold. */
export declare function dispatchReading(campaign: Campaign, index: number): DispatchReading | undefined;
