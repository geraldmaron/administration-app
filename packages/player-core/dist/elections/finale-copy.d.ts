/** How far into the season the matchup is, by how much of it the country knows. */
export type SeasonStage = "bench" | "field" | "nominee" | "decided";
export declare function seasonStage(known: number, contestAhead: boolean): SeasonStage;
export declare function opponentIntroduction(stage: SeasonStage, name: string, office: string, party: string): string;
export declare const BAND_WORD: Readonly<Record<SeasonStage, string>>;
export declare const BAND_CAPTION: Readonly<Record<SeasonStage, string>>;
export type EndingKind = "removed" | "defeated" | "term-limited";
export declare const ENDING_TITLE: Readonly<Record<EndingKind, string>>;
export declare function endingOpening(kind: EndingKind, when: string, successor: string | undefined): string;
export declare const ENDING_CLOSING: Readonly<Record<EndingKind, string>>;
/** The one line an election night prints when the country keeps the President. */
export declare const REELECTED_LINE = "The country gave you four more years. Every promise you haven't kept yet now has a deadline that can't move.";
export declare function successorEpilogue(name: string, from: "vice-president" | "speaker", sameParty: boolean, weeksLeft: number): readonly string[];
export declare const LEGACY_LINES: {
    readonly timeline: "Every law signed, every election night, every step toward removal, and every war, in the order they happened.";
    readonly country: "Where the country's numbers ended up, next to where they were when you took office.";
    readonly lawsNone: "None of the bills you asked for became law.";
    readonly promisesNone: "Your platform made no promises the game could check.";
    readonly warsNone: "The United States fought no wars while you were President.";
    readonly congress: "The House and Senate as the last election left them. This is the Congress the next President will work with.";
};
export declare function lawsLine(count: number): string;
export declare function promisesLine(kept: number, broken: number, open: number): string;
export declare const LEGACY_CLOSING: Readonly<Record<EndingKind, string>>;
