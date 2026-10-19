import type { FeedItem } from "./state.js";
import type { ArticleTie } from "./article-ties.js";
import type { OutletStance } from "./press-outlets.js";
export type Article = {
    /** The masthead, not the source line: who is publishing this. */
    readonly outlet: string;
    /** Canonical press outlet id when the masthead is one of `PRESS_OUTLETS`. */
    readonly outletId?: string;
    readonly headline: string;
    /** The one-line standfirst under the headline. */
    readonly standfirst: string;
    /**
     * Why the administration reading the file should keep it in view, or nothing
     * when the item gives no reason: a line that says only that no reason was
     * given is left off rather than printed.
     */
    readonly relevance?: string;
    /** The piece. The first is a lede and is deliberately short; there are as many more as the item has particulars for. */
    readonly paragraphs: readonly string[];
    /** In-fiction attribution, e.g. "Mara Ellison. Filed from the capital, week 4". */
    readonly byline: string;
    /** A second desk that filed the same story, with its own reporter. */
    readonly also?: {
        readonly outlet: string;
        readonly outletId: string;
        readonly byline: string;
    };
    /** What the filing desk thought of the administration when it filed, when that was kept or supplied. */
    readonly stance?: OutletStance;
    /** The country's own news rather than the world's, read from who is in the item. */
    readonly domestic: boolean;
};
/**
 * The nations named in the item, as the player reads them. Resolved by the
 * caller: the engine holds the campaign but an article is composed from one
 * feed item, and threading the whole campaign through to look up two names
 * would make a formatter depend on the world.
 */
export type ArticleNames = {
    readonly actor?: string;
    readonly target?: string;
    /** The player's own nation id, so the piece can say when it is aimed at them. */
    readonly playerNation?: string;
    /** The player's nation as the reader sees it, so indirect stories can still say why they matter. */
    readonly playerNationName?: string;
    /** What the reader's country has with the foreign parties (`articleTies`); the only stake a story with no American party may claim. */
    readonly ties?: readonly ArticleTie[];
};
/** Optional press-room context so the masthead's disposition colors the prose. */
export type ArticleContext = {
    readonly outletDisposition?: number;
    /** The filing day as the screen writes dates; the composer never sees the campaign, so without it the byline prints the week. */
    readonly filedOn?: string;
};
/**
 * The piece behind a headline. Pure and deterministic on the item's own
 * content, so a dispatch opened, closed, and opened again three turns later
 * reads identically.
 *
 * `names` is passed rather than inferred so the piece can say the one thing a
 * masthead genuinely would — whether this was aimed at the government the
 * reader is running — and so the standfirst can name countries rather than
 * print their ids.
 */
export declare function composeArticle(item: FeedItem, names?: ArticleNames, context?: ArticleContext): Article;
