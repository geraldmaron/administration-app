import type { Campaign, FeedItem, FlagId } from "./state.js";
import type { TurnPhase } from "./turn-loop.js";
import { type ScandalCharge, type ScandalImplicated, type ScandalOrigin } from "./scandal-origins.js";
export type { OwnActCharge, ScandalCharge, ScandalImplicated, ScandalOrigin } from "./scandal-origins.js";
export { CABINET_LEAK_STORY_SHARE, SCANDAL_GRAVITY, SCANDAL_LIVE_FLAG } from "./scandal-origins.js";
export type ScandalStage = "breaking" | "developing" | "fading" | "resolved";
export type Scandal = {
    readonly id: string;
    /** What it is, in the words a front page would use. */
    readonly subject: string;
    readonly origin: ScandalOrigin;
    /** What the story charges, whatever opened it; decides its gravity and which answer fits. */
    readonly charge: ScandalCharge;
    /** The week it broke; for a flagged scandal, the week the engine first saw the flag. */
    readonly brokeTurn: number;
    readonly stage: ScandalStage;
    /**
     * The act or the answer this story is about, in the government's own words:
     * what a board needs to say which week the player is being asked about, when
     * the charge alone is true of more than one of them.
     */
    readonly context?: string;
    /** The officer the story names, where the facts name one. */
    readonly implicated?: ScandalImplicated;
    /** How grave the charge is, 0..1 (`SCANDAL_GRAVITY`). */
    readonly gravity: number;
    /**
     * 0..1, zero once `resolved`: how hot the story runs this week times how
     * grave its charge is, so a thin story at its height weighs less than a
     * grave one. Recomputed from the current campaign on every read.
     */
    readonly intensity: number;
};
/** Where a freshly broken story starts: enough to be real, not yet a verdict. */
export declare const SCANDAL_BREAK_INTENSITY = 0.5;
/** How far one week of real legs carries a story that has them. */
export declare const SCANDAL_LEGS_STEP = 0.09;
/**
 * How many weeks a story can gain legs before it crests on its own. Six: even
 * a corps that never lets up is covering next week's news by midsummer.
 */
export declare const SCANDAL_DEVELOP_TURNS = 6;
/**
 * The weeks of new legs an answer that does not fit the file gives a story. A
 * denial the papers can disprove, or a confession to more than they had, is a
 * second story on top of the first.
 */
export declare const SCANDAL_WRONG_ANSWER_LEGS = 4;
/** How far one week of decline carries a story that has crested. */
export declare const SCANDAL_FADE_STEP = 0.18;
/**
 * What a story has to clear to run past the week it broke: its charge's gravity
 * times the press climate. Most stories fizzle. A grave charge before a corps
 * that is broadly against the administration runs; a thin one needs the whole
 * room against the President, and one partisan desk calling for it is not that.
 */
export declare const SCANDAL_LEGS_BAR = 0.25;
/**
 * What one story at full intensity is worth against the integrity target. A
 * story of the gravest charge at full heat costs what a live scandal always
 * cost; gravity and heat can only make it cost less.
 */
export declare const SCANDAL_INTEGRITY_WEIGHT = 0.25;
/**
 * How the corps as a whole is running against the administration this week, 0..1:
 * the most hostile national desk, which a story needs to keep calling, and the
 * room behind it, which decides whether anybody else follows. Half each: the
 * leading desk alone gave every story legs, because some desk is always
 * against a President.
 */
export declare function pressClimate(campaign: Campaign): number;
/**
 * The flag that records a story as having got its legs, the week after it
 * broke. The climate decides whether a story runs, not whether a running story
 * keeps running: once a second desk has its own reporting, a friendlier week
 * does not un-report it.
 */
export declare function scandalLegsFlag(id: string): FlagId;
/**
 * The flag that records a story as finished, so that it stays finished. The
 * stage is derived from the corps as it reads this week, which on its own would
 * re-judge a story that died under a friendly corps as live the moment the
 * corps turned, with no new fact behind it.
 */
export declare function scandalClosedFlag(id: string): FlagId;
/** Every scandal this campaign carries, broken or long since dead. */
export declare function selectScandals(campaign: Campaign): readonly Scandal[];
/** The scandals still standing this week: what a board draws from. */
export declare function selectLiveScandals(campaign: Campaign): readonly Scandal[];
/** What the live board is worth against the integrity target: each story's intensity at the one weight. */
export declare function selectScandalIntegrityCharge(campaign: Campaign): number;
/**
 * The live scandal most worth a committee's attention this week, if any. Read
 * by `committee-inquiry.ts`'s `nextCause`, which opens an oversight matter keyed
 * `scandal:<scandal.id>` on it when the Hill has turned on the administration.
 */
export declare function selectScandalForInquiry(campaign: Campaign): Scandal | undefined;
/** One live story as a board draws it: what it is, how long it has run, which desk keeps it alive and what it costs. */
export type ScandalReading = {
    readonly scandal: Scandal;
    /** Weeks since it broke, zero on the week itself. */
    readonly weeksRunning: number;
    /** The most adversarial desk in the room: the one desk a story needs to stay alive. */
    readonly keptAliveBy: {
        readonly id: string;
        readonly name: string;
        readonly hostility: number;
    };
    /** What this one story is charging the country's reading of the government's honesty. */
    readonly integrityCharge: number;
};
/**
 * The live board, heaviest story first. The corps reading is the room's, not
 * the story's, so every live story is kept alive by the same desk; repeated per
 * row because a row that cannot say who is asking will not say why it runs.
 */
export declare function selectScandalBoard(campaign: Campaign): readonly ScandalReading[];
/**
 * The scandal items worth a line in the feed this week: every story, whatever
 * opened it, and only the week its stage actually changes, compared against
 * last week's derived reading.
 */
export declare function scandalFeedItems(campaign: Campaign, turn: number): readonly FeedItem[];
/**
 * Close, for good, every story that reads as finished this week, and keep the
 * live flag true to the board. Runs after the press has moved the corps, so a
 * story is judged against the room it actually died in.
 */
export declare const scandalPhase: TurnPhase;
export type { ScandalAnswer, ScandalFileRead, ScandalPriceWord, ScandalResponseProjection, ScandalResponseResult, ScandalResponseTarget, ScandalResponseVerb, } from "./scandal-response.js";
