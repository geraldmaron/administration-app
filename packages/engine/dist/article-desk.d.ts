import type { ArticleFacts, FeedItem } from "./state.js";
import { type OutletStance, type PressOutlet } from "./press-outlets.js";
export type Desk = {
    readonly item: FeedItem;
    readonly kind: FeedItem["kind"];
    /**
     * The story's center, exactly as the item named it. Never defaulted to a
     * country: a nation is a party to a story, not its subject, and treating the
     * two as one is what put "China has not resigned" on the page.
     */
    readonly subject: string | undefined;
    /** The subject's surname, present only when the subject is a person. */
    readonly person: string | undefined;
    readonly actor: string | undefined;
    readonly target: string | undefined;
    readonly figure: string | undefined;
    readonly stake: string | undefined;
    readonly instrument: string | undefined;
    readonly aimedAtPlayer: boolean;
    /** Whether this administration is the one that moved. */
    readonly byPlayer: boolean;
    readonly playerNationName: string | undefined;
    readonly secret: boolean;
    /**
     * The country's own news: nobody foreign in it, and home named or acting.
     * Home is then no party to the story, so `actor` and `target` are left empty
     * rather than naming the reader's own country back to them.
     */
    readonly domestic: boolean;
    readonly operatorTheme: OperatorTheme;
};
export type Beat = (desk: Desk) => string;
export type OperatorTheme = "market" | "network" | "insurgency" | "cyber" | "pmc" | "generic";
export declare function pick(item: FeedItem, section: string, bank: readonly Beat[]): Beat;
/**
 * A bank line that names what it needs: it returns nothing when the desk does
 * not hold the particular the sentence is about, rather than reaching for a
 * stand-in.
 */
export type Line = (desk: Desk) => string | undefined;
/** One of the lines the desk can honestly fill, keyed off the item so a re-read is the same piece; nothing when none can be. */
export declare function pickLine(desk: Desk, section: string, bank: readonly Line[]): string | undefined;
export declare const KIND_STANDFIRST: Readonly<Record<FeedItem["kind"], string>>;
export declare function claim(desk: Desk): string;
/** The headline as the tail of a sentence: "The ministry confirms" reads "the ministry confirms" after a colon; a name keeps its capital. */
export declare function headlineClause(desk: Desk): string;
/** Bodies whose name is said as a word and takes no article: "leaves OPEC+", never "leaves the OPEC+". */
export declare const BARE_BODY_NAMES: ReadonlySet<string>;
export declare function bareBodyNames(text: string): string;
export declare function capitalize(text: string): string;
export declare function sentence(text: string): string;
/**
 * The stake, unless the headline already ends on it, made to stand as its own
 * sentence. A wire stake is written as the tail of its headline, so it can open
 * on "its" or "it" meaning the actor; printed alone that is a pronoun with
 * nothing to refer to ("Its own markets flinched first."), so the actor is put
 * back, or the line is dropped when there is no actor to put back.
 */
export declare function freshStake(desk: Desk): string | undefined;
export declare function personShortName(full: string): string | undefined;
/** Whether a subject is a country rather than a person or a body: a party to a story, not its center. */
export declare function subjectIsNation(subject: string | undefined): boolean;
export declare function moveName(name: string): string;
/** The preposition a move takes before its target: help goes to a country, pressure goes against one. */
export declare function moveToward(name: string): "to" | "against";
export declare function firstSentence(text: string): string;
/** True when `clause` is already the headline's closing sentence — do not restate it. */
export declare function echoesHeadlineClose(clause: string, headline: string): boolean;
export declare function polish(text: string): string;
/** The stance a piece is voiced in: the desk's at filing when it was kept, or the one the caller read off the corps. */
export declare function voiceStance(item: FeedItem, disposition: number | undefined): OutletStance | undefined;
export declare function applyOutletVoice(standfirst: string, outlet: PressOutlet, stance: OutletStance | undefined): string;
export declare function outletFor(item: FeedItem): {
    outlet: string;
    outletId?: string;
    pressOutlet?: PressOutlet;
};
export declare function bylineFor(item: FeedItem, facts: ArticleFacts, filedOn: string | undefined, outletId?: string): string;
