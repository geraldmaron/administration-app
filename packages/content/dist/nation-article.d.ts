type ArticleIdentity = {
    readonly name: string;
    readonly definiteArticle?: boolean;
};
/**
 * Whether this nation's name is written "the X".
 *
 * The dataset's own flag is final where it exists — including where it is
 * explicitly `false`, which is how a name the heuristic would guess wrong is
 * corrected without changing this file.
 */
export declare function takesDefiniteArticle(identity: ArticleIdentity | undefined): boolean;
export type NationPhraseOptions = {
    /** The token opened a sentence, so the article is capitalized rather than the name. */
    readonly sentenceStart?: boolean;
    /** The token was written `{{nation}}'s`, so the phrase carries the possessive. */
    readonly possessive?: boolean;
};
/**
 * The name as it belongs in the sentence: article, capitalization, possessive.
 *
 * The possessive is only reshaped for article names. "Belarus's" is what the
 * binder has always produced for a bare name ending in s and is not this
 * change's business; "the United States's" is a phrase no newsroom would print,
 * so an article name ending in s takes the bare apostrophe.
 */
export declare function nationPhrase(name: string, article: boolean, options?: NationPhraseOptions): string;
/**
 * Whether the character run before this offset ends a sentence.
 *
 * Start of string, a newline, or a full stop / question mark / exclamation
 * followed by space. A quote or bracket in between still counts as a start: a
 * beat opening on a quoted line is the case that made this necessary.
 */
export declare function atSentenceStart(text: string, offset: number): boolean;
export {};
