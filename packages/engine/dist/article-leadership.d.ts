/** Which story a leadership change is. */
export type LeadershipStory = "held" | "opposition" | "handover" | "confidence" | "coup" | "death" | "defeat" | "removed";
/** The particulars a line may name. `leader` holds the chair after the change; `predecessor` held it before. */
export type LeadershipParticulars = {
    readonly nation: string;
    readonly leader: string;
    readonly predecessor: string;
};
type Line = (p: LeadershipParticulars) => string;
export type LeadershipBank = {
    readonly headlines: readonly Line[];
    readonly standfirsts: readonly Line[];
    readonly bodies: readonly Line[];
};
export declare const LEADERSHIP_ARTICLE_BANK: Readonly<Record<LeadershipStory, LeadershipBank>>;
export type LeadershipArticle = {
    readonly story: LeadershipStory;
    readonly headline: string;
    readonly standfirst: string;
    readonly paragraphs: readonly string[];
};
/**
 * The article for one change, the same every time it is read: the line is
 * picked off the change's own key rather than a stream, so a country file
 * opened twice reads the same story.
 */
export declare function leadershipArticle(story: LeadershipStory, particulars: LeadershipParticulars, key: string): LeadershipArticle;
export {};
